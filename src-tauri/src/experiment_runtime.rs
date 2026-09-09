use crate::{local_runtime::LocalRuntimeManager, native_workspace::NativeWorkspaceRegistry};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::HashMap,
    fs,
    io::{BufRead, BufReader},
    path::{Component, Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    thread,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Manager, State};

const MAX_LOG_LINES: usize = 1000;

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExperimentRunStep {
    id: String,
    title: String,
    runner: String,
    file: Option<String>,
    module: Option<String>,
    #[serde(default)]
    args: Vec<String>,
    #[serde(default)]
    outputs: Vec<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExperimentRunPlanRequest {
    workspace_id: String,
    environment_id: String,
    experiment_id: String,
    preset_id: String,
    manifest_path: String,
    working_directory: String,
    steps: Vec<ExperimentRunStep>,
    revision: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExperimentRunPlan {
    id: String,
    experiment_id: String,
    preset_id: String,
    environment_id: String,
    steps: Vec<ExperimentRunStep>,
    inputs: Vec<RunInput>,
    outputs: Vec<String>,
    confirmation: String,
    expires_at: u64,
    revision: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RunInput {
    path: String,
    sha256: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExperimentLogLine {
    sequence: u64,
    timestamp: u64,
    stream: String,
    text: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExperimentJobStep {
    id: String,
    title: String,
    state: String,
    exit_code: Option<i32>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExperimentJob {
    id: String,
    experiment_id: String,
    preset_id: String,
    state: String,
    started_at: u64,
    finished_at: Option<u64>,
    steps: Vec<ExperimentJobStep>,
    logs: Vec<ExperimentLogLine>,
    error: Option<String>,
}

#[derive(Clone)]
struct PlanRecord {
    public: ExperimentRunPlan,
    working_directory: PathBuf,
    input_paths: Vec<PathBuf>,
}

struct JobControl {
    snapshot: Mutex<ExperimentJob>,
    child: Mutex<Option<Child>>,
    cancelled: AtomicBool,
}
impl JobControl {
    fn new(job: ExperimentJob) -> Self {
        Self {
            snapshot: Mutex::new(job),
            child: Mutex::new(None),
            cancelled: AtomicBool::new(false),
        }
    }
    fn append(&self, stream: &str, text: String) {
        if let Ok(mut job) = self.snapshot.lock() {
            let sequence = job.logs.last().map_or(1, |line| line.sequence + 1);
            job.logs.push(ExperimentLogLine {
                sequence,
                timestamp: now(),
                stream: stream.into(),
                text: redact(&text),
            });
            if job.logs.len() > MAX_LOG_LINES {
                let count = job.logs.len() - MAX_LOG_LINES;
                job.logs.drain(0..count);
            }
        }
    }
    fn snapshot(&self) -> Result<ExperimentJob, String> {
        self.snapshot
            .lock()
            .map(|job| job.clone())
            .map_err(|_| "Job 状态不可用".into())
    }
}

#[derive(Clone)]
pub struct ExperimentRuntimeManager {
    plans: Arc<Mutex<HashMap<String, PlanRecord>>>,
    jobs: Arc<Mutex<HashMap<String, Arc<JobControl>>>>,
    history_path: PathBuf,
}

impl ExperimentRuntimeManager {
    pub fn new(app: &AppHandle) -> Result<Self, String> {
        let root = app
            .path()
            .app_local_data_dir()
            .map_err(|error| error.to_string())?
            .join("experiment-jobs");
        fs::create_dir_all(&root).map_err(|error| error.to_string())?;
        let history_path = root.join("history.json");
        let mut restored = HashMap::new();
        if let Ok(source) = fs::read(&history_path) {
            if let Ok(history) = serde_json::from_slice::<Vec<ExperimentJob>>(&source) {
                for mut job in history {
                    if job.state == "running" {
                        job.state = "interrupted".into();
                        job.finished_at = Some(now());
                        job.error = Some("TensorNote 上次退出时任务仍在运行。".into());
                        for step in &mut job.steps {
                            if matches!(step.state.as_str(), "running" | "pending") {
                                step.state = "interrupted".into();
                            }
                        }
                    }
                    restored.insert(job.id.clone(), Arc::new(JobControl::new(job)));
                }
            }
        }
        Ok(Self {
            plans: Arc::new(Mutex::new(HashMap::new())),
            jobs: Arc::new(Mutex::new(restored)),
            history_path,
        })
    }

    fn plan(
        &self,
        request: ExperimentRunPlanRequest,
        root: PathBuf,
    ) -> Result<ExperimentRunPlan, String> {
        if request.steps.is_empty() || request.steps.len() > 64 {
            return Err("运行计划必须包含 1–64 个步骤".into());
        }
        let working_directory = secure_directory(&root, &request.working_directory)?;
        let mut inputs = Vec::new();
        let mut input_paths = Vec::new();
        let mut outputs = Vec::new();
        let manifest = secure_file(&root, &request.manifest_path)?;
        inputs.push(RunInput {
            path: request.manifest_path.clone(),
            sha256: hash_file(&manifest)?,
        });
        input_paths.push(manifest);
        for step in &request.steps {
            if !matches!(step.runner.as_str(), "python" | "python-module") {
                return Err(format!("{} 需要后续 Runner 支持", step.runner));
            }
            if step.args.len() > 128
                || step
                    .args
                    .iter()
                    .any(|arg| arg.contains('\0') || arg.contains('\n'))
            {
                return Err("步骤参数超出限制或包含非法字符".into());
            }
            if step.runner == "python" {
                let relative = step.file.as_deref().ok_or("python 步骤缺少文件")?;
                let file = secure_file(&working_directory, relative)?;
                inputs.push(RunInput {
                    path: relative.into(),
                    sha256: hash_file(&file)?,
                });
                input_paths.push(file);
            } else if step.module.as_deref().map_or(true, |module| {
                module.is_empty() || !module.split('.').all(valid_identifier)
            }) {
                return Err("python-module 名称无效".into());
            }
            for output in &step.outputs {
                secure_output_path(&working_directory, output)?;
                if !outputs.contains(output) {
                    outputs.push(output.clone());
                }
            }
        }
        let id = format!(
            "run-plan:{:x}",
            stable_hash(&format!(
                "{}:{}:{}",
                request.experiment_id,
                request.preset_id,
                now()
            ))
        );
        let public = ExperimentRunPlan {
            id: id.clone(),
            experiment_id: request.experiment_id,
            preset_id: request.preset_id,
            environment_id: request.environment_id,
            steps: request.steps,
            inputs,
            outputs,
            confirmation: "RUN EXPERIMENT".into(),
            expires_at: now() + 15 * 60 * 1000,
            revision: request.revision,
        };
        self.plans
            .lock()
            .map_err(|_| "运行计划注册表不可用")?
            .insert(
                id,
                PlanRecord {
                    public: public.clone(),
                    working_directory,
                    input_paths,
                },
            );
        Ok(public)
    }

    fn start(
        &self,
        plan_id: &str,
        confirmation: &str,
        python: PathBuf,
    ) -> Result<ExperimentJob, String> {
        let plan = self
            .plans
            .lock()
            .map_err(|_| "运行计划注册表不可用")?
            .remove(plan_id)
            .ok_or("运行计划不存在或已使用")?;
        if plan.public.expires_at < now() {
            return Err("运行计划已过期".into());
        }
        if confirmation != plan.public.confirmation {
            return Err("确认短语不匹配".to_string());
        }
        for (index, path) in plan.input_paths.iter().enumerate() {
            if hash_file(path)? != plan.public.inputs[index].sha256 {
                return Err("Manifest 或脚本已变化，请重新生成计划".into());
            }
        }
        if !python.is_file() {
            return Err("环境 Python 不存在，请重新检查环境".into());
        }
        let id = format!("job:{:x}", stable_hash(&format!("{}:{}", plan_id, now())));
        let job = ExperimentJob {
            id: id.clone(),
            experiment_id: plan.public.experiment_id.clone(),
            preset_id: plan.public.preset_id.clone(),
            state: "running".into(),
            started_at: now(),
            finished_at: None,
            steps: plan
                .public
                .steps
                .iter()
                .map(|step| ExperimentJobStep {
                    id: step.id.clone(),
                    title: step.title.clone(),
                    state: "pending".into(),
                    exit_code: None,
                })
                .collect(),
            logs: vec![],
            error: None,
        };
        let control = Arc::new(JobControl::new(job));
        self.jobs
            .lock()
            .map_err(|_| "Job 注册表不可用")?
            .insert(id.clone(), control.clone());
        self.persist();
        let manager = self.clone();
        thread::spawn(move || manager.run(plan, python, control));
        self.job(&id)
    }

    fn run(&self, plan: PlanRecord, python: PathBuf, control: Arc<JobControl>) {
        for (index, step) in plan.public.steps.iter().enumerate() {
            if control.cancelled.load(Ordering::Relaxed) {
                break;
            }
            if let Ok(mut job) = control.snapshot.lock() {
                job.steps[index].state = "running".into();
            }
            control.append("system", format!("开始：{}", step.title));
            let mut command = Command::new(&python);
            if step.runner == "python" {
                command.arg(step.file.as_deref().unwrap_or_default());
            } else {
                command.args(["-m", step.module.as_deref().unwrap_or_default()]);
            }
            command
                .args(&step.args)
                .current_dir(&plan.working_directory)
                .stdin(Stdio::null())
                .stdout(Stdio::piped())
                .stderr(Stdio::piped());
            let mut child = match command.spawn() {
                Ok(child) => child,
                Err(error) => {
                    self.fail(&control, index, format!("无法启动步骤：{error}"));
                    return;
                }
            };
            let stdout = child.stdout.take();
            let stderr = child.stderr.take();
            *control.child.lock().unwrap() = Some(child);
            let out_control = control.clone();
            let out = thread::spawn(move || {
                if let Some(stream) = stdout {
                    for line in BufReader::new(stream).lines().map_while(Result::ok) {
                        out_control.append("stdout", line);
                    }
                }
            });
            let err_control = control.clone();
            let err = thread::spawn(move || {
                if let Some(stream) = stderr {
                    for line in BufReader::new(stream).lines().map_while(Result::ok) {
                        err_control.append("stderr", line);
                    }
                }
            });
            let status = control
                .child
                .lock()
                .unwrap()
                .as_mut()
                .and_then(|child| child.wait().ok());
            let _ = out.join();
            let _ = err.join();
            *control.child.lock().unwrap() = None;
            let code = status.and_then(|status| status.code());
            if control.cancelled.load(Ordering::Relaxed) {
                break;
            }
            if code != Some(0) {
                self.fail(
                    &control,
                    index,
                    format!(
                        "步骤失败，退出码 {}",
                        code.map_or_else(|| "unknown".into(), |value| value.to_string())
                    ),
                );
                return;
            }
            if let Ok(mut job) = control.snapshot.lock() {
                job.steps[index].state = "completed".into();
                job.steps[index].exit_code = code;
            }
        }
        if let Ok(mut job) = control.snapshot.lock() {
            let cancelled = control.cancelled.load(Ordering::Relaxed);
            job.state = if cancelled { "cancelled" } else { "completed" }.into();
            job.finished_at = Some(now());
            for step in &mut job.steps {
                if step.state == "pending" {
                    step.state = if cancelled { "cancelled" } else { "blocked" }.into();
                }
            }
        }
        self.persist();
    }
    fn fail(&self, control: &JobControl, index: usize, message: String) {
        control.append("system", message.clone());
        if let Ok(mut job) = control.snapshot.lock() {
            job.state = "failed".into();
            job.finished_at = Some(now());
            job.error = Some(message);
            job.steps[index].state = "failed".into();
            for step in job.steps.iter_mut().skip(index + 1) {
                step.state = "blocked".into();
            }
        }
        self.persist();
    }
    fn job(&self, id: &str) -> Result<ExperimentJob, String> {
        self.jobs
            .lock()
            .map_err(|_| "Job 注册表不可用")?
            .get(id)
            .ok_or_else(|| "Job 不存在".to_string())?
            .snapshot()
    }
    fn list(&self) -> Result<Vec<ExperimentJob>, String> {
        let mut jobs = self
            .jobs
            .lock()
            .map_err(|_| "Job 注册表不可用")?
            .values()
            .filter_map(|job| job.snapshot().ok())
            .collect::<Vec<_>>();
        jobs.sort_by_key(|job| std::cmp::Reverse(job.started_at));
        Ok(jobs)
    }
    fn cancel(&self, id: &str) -> Result<ExperimentJob, String> {
        let jobs = self.jobs.lock().map_err(|_| "Job 注册表不可用")?;
        let control = jobs.get(id).ok_or("Job 不存在")?;
        control.cancelled.store(true, Ordering::Relaxed);
        if let Ok(mut child) = control.child.lock() {
            if let Some(process) = child.as_mut() {
                let _ = process.kill();
            }
        }
        drop(jobs);
        self.job(id)
    }
    fn clear(&self) -> Result<(), String> {
        let mut jobs = self.jobs.lock().map_err(|_| "Job 注册表不可用")?;
        if jobs
            .values()
            .any(|job| job.snapshot().is_ok_and(|item| item.state == "running"))
        {
            return Err("运行中 Job 不能清理".into());
        }
        jobs.clear();
        drop(jobs);
        self.persist();
        Ok(())
    }
    fn persist(&self) {
        if let Ok(jobs) = self.list() {
            let _ = fs::write(
                &self.history_path,
                serde_json::to_vec_pretty(&jobs).unwrap_or_default(),
            );
        }
    }
}

#[tauri::command]
pub fn experiment_plan_run(
    manager: State<'_, ExperimentRuntimeManager>,
    registry: State<'_, NativeWorkspaceRegistry>,
    request: ExperimentRunPlanRequest,
) -> Result<ExperimentRunPlan, String> {
    let root = registry.root(&request.workspace_id)?;
    manager.plan(request, root)
}
#[tauri::command]
pub fn experiment_start_job(
    manager: State<'_, ExperimentRuntimeManager>,
    runtime: State<'_, LocalRuntimeManager>,
    plan_id: String,
    environment_id: String,
    confirmation: String,
) -> Result<ExperimentJob, String> {
    manager.start(
        &plan_id,
        &confirmation,
        runtime.environment_python(&environment_id)?,
    )
}
#[tauri::command]
pub fn experiment_job(
    manager: State<'_, ExperimentRuntimeManager>,
    job_id: String,
) -> Result<ExperimentJob, String> {
    manager.job(&job_id)
}
#[tauri::command]
pub fn experiment_jobs(
    manager: State<'_, ExperimentRuntimeManager>,
) -> Result<Vec<ExperimentJob>, String> {
    manager.list()
}
#[tauri::command]
pub fn experiment_cancel_job(
    manager: State<'_, ExperimentRuntimeManager>,
    job_id: String,
) -> Result<ExperimentJob, String> {
    manager.cancel(&job_id)
}
#[tauri::command]
pub fn experiment_clear_jobs(manager: State<'_, ExperimentRuntimeManager>) -> Result<(), String> {
    manager.clear()
}

fn valid_identifier(value: &str) -> bool {
    !value.is_empty()
        && value.chars().enumerate().all(|(index, char)| {
            char == '_' || char.is_ascii_alphanumeric() && (index > 0 || !char.is_ascii_digit())
        })
}
fn secure_directory(root: &Path, relative: &str) -> Result<PathBuf, String> {
    secure_path(root, relative, true)
}
fn secure_file(root: &Path, relative: &str) -> Result<PathBuf, String> {
    secure_path(root, relative, false)
}
fn secure_path(root: &Path, relative: &str, directory: bool) -> Result<PathBuf, String> {
    let rel = Path::new(relative);
    if rel.is_absolute()
        || rel.components().any(|part| {
            matches!(
                part,
                Component::ParentDir | Component::RootDir | Component::Prefix(_)
            )
        })
    {
        return Err("路径必须位于 Workspace 内".into());
    }
    let base = root.canonicalize().map_err(|error| error.to_string())?;
    let path = base
        .join(rel)
        .canonicalize()
        .map_err(|_| format!("路径不存在：{relative}"))?;
    if !path.starts_with(&base) || (directory && !path.is_dir()) || (!directory && !path.is_file())
    {
        return Err("路径超出 Workspace 边界或类型不符".into());
    }
    Ok(path)
}
fn secure_output_path(root: &Path, relative: &str) -> Result<PathBuf, String> {
    let rel = Path::new(relative);
    if relative.is_empty()
        || rel.is_absolute()
        || rel.components().any(|part| {
            matches!(
                part,
                Component::ParentDir | Component::RootDir | Component::Prefix(_)
            )
        })
    {
        return Err("产物路径必须位于工作目录内".into());
    }
    Ok(root.join(rel))
}
fn hash_file(path: &Path) -> Result<String, String> {
    fs::read(path)
        .map(|source| format!("{:x}", Sha256::digest(source)))
        .map_err(|error| error.to_string())
}
fn redact(text: &str) -> String {
    let mut output = text.to_string();
    for marker in ["token=", "authorization:", "cookie:"] {
        if let Some(index) = output.to_ascii_lowercase().find(marker) {
            output.truncate(index + marker.len());
            output.push_str("[REDACTED]");
        }
    }
    output
}
fn now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}
fn stable_hash(value: &str) -> u64 {
    value.bytes().fold(0xcbf29ce484222325, |hash, byte| {
        (hash ^ u64::from(byte)).wrapping_mul(0x100000001b3)
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn validates_modules_outputs_and_redacts_logs() {
        assert!(valid_identifier("train_model"));
        assert!(!valid_identifier("2bad"));
        assert!(secure_output_path(Path::new("/tmp"), "out/model").is_ok());
        assert!(secure_output_path(Path::new("/tmp"), "../secret").is_err());
        assert_eq!(
            redact("Authorization: Bearer secret"),
            "Authorization:[REDACTED]"
        );
    }
}
