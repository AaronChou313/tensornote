use crate::native_workspace::NativeWorkspaceRegistry;
use getrandom::getrandom;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    collections::{HashMap, HashSet, VecDeque},
    env, fs,
    io::{BufRead, BufReader, Read},
    net::{TcpListener, TcpStream},
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    thread,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Manager, State};
use wait_timeout::ChildExt;

const COMMAND_TIMEOUT: Duration = Duration::from_secs(12);
const MAX_COMMAND_OUTPUT: u64 = 2 * 1024 * 1024;
const MAX_LOG_LINES: usize = 500;
const MINIMAL_PACKAGES: &[&str] = &[
    "jupyter-server",
    "ipykernel",
    "numpy",
    "matplotlib",
    "pillow",
];

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeTool {
    id: String,
    kind: String,
    name: String,
    version: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PythonEnvironment {
    id: String,
    name: String,
    manager: String,
    python_version: String,
    jupyter_installed: bool,
    ipykernel_installed: bool,
    managed: bool,
    kernel_name: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeKernel {
    name: String,
    display_name: String,
    language: String,
    environment_id: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DetectedJupyterServer {
    id: String,
    url: String,
    environment_id: String,
    environment_name: String,
    owned: bool,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeDiscovery {
    tools: Vec<RuntimeTool>,
    environments: Vec<PythonEnvironment>,
    kernels: Vec<RuntimeKernel>,
    servers: Vec<DetectedJupyterServer>,
    warnings: Vec<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnvironmentPlanRequest {
    manager: String,
    name: String,
    python_version: String,
    base_environment_id: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EnvironmentPlan {
    id: String,
    manager: String,
    name: String,
    python_version: String,
    target_label: String,
    packages: Vec<String>,
    kernel_name: String,
    steps: Vec<String>,
    confirmation: String,
    expires_at: u64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeLogLine {
    sequence: u64,
    timestamp: u64,
    stream: String,
    text: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeOperation {
    id: String,
    state: String,
    progress: u8,
    logs: Vec<RuntimeLogLine>,
    error: Option<String>,
    environment_id: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OwnedJupyterServer {
    id: String,
    environment_id: String,
    environment_name: String,
    kernel_name: Option<String>,
    url: String,
    port: u16,
    status: String,
    owned: bool,
    started_at: u64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct JupyterServerLaunch {
    server: OwnedJupyterServer,
    token: String,
}

#[derive(Clone, Debug)]
struct ToolRecord {
    public: RuntimeTool,
    executable: PathBuf,
}

#[derive(Clone, Debug)]
struct EnvironmentRecord {
    public: PythonEnvironment,
    python: PathBuf,
}

#[derive(Clone, Debug)]
struct PlanRecord {
    public: EnvironmentPlan,
    target: PathBuf,
    executable: PathBuf,
    base_python: Option<PathBuf>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct ManagedEnvironmentMarker {
    version: u8,
    name: String,
    manager: String,
    python_version: String,
    kernel_name: String,
}

#[derive(Debug)]
struct OperationControl {
    snapshot: Mutex<RuntimeOperation>,
    child: Mutex<Option<Child>>,
    cancelled: AtomicBool,
}

impl OperationControl {
    fn new(id: String) -> Self {
        Self {
            snapshot: Mutex::new(RuntimeOperation {
                id,
                state: "running".into(),
                progress: 0,
                logs: Vec::new(),
                error: None,
                environment_id: None,
            }),
            child: Mutex::new(None),
            cancelled: AtomicBool::new(false),
        }
    }

    fn append(&self, stream: &str, text: impl Into<String>) {
        if let Ok(mut snapshot) = self.snapshot.lock() {
            let sequence = snapshot.logs.last().map_or(1, |line| line.sequence + 1);
            snapshot.logs.push(RuntimeLogLine {
                sequence,
                timestamp: now_millis(),
                stream: stream.into(),
                text: text.into(),
            });
            if snapshot.logs.len() > MAX_LOG_LINES {
                let overflow = snapshot.logs.len() - MAX_LOG_LINES;
                snapshot.logs.drain(0..overflow);
            }
        }
    }

    fn progress(&self, value: u8) {
        if let Ok(mut snapshot) = self.snapshot.lock() {
            snapshot.progress = value;
        }
    }

    fn finish(&self, environment_id: String) {
        if let Ok(mut snapshot) = self.snapshot.lock() {
            snapshot.state = "completed".into();
            snapshot.progress = 100;
            snapshot.environment_id = Some(environment_id);
        }
    }

    fn fail(&self, reason: String) {
        if let Ok(mut snapshot) = self.snapshot.lock() {
            snapshot.state = if self.cancelled.load(Ordering::Relaxed) {
                "cancelled".into()
            } else {
                "failed".into()
            };
            snapshot.error = Some(reason);
        }
    }

    fn get(&self) -> Result<RuntimeOperation, String> {
        self.snapshot
            .lock()
            .map(|snapshot| snapshot.clone())
            .map_err(|_| "Runtime operation state is unavailable".into())
    }
}

#[derive(Debug)]
struct ServerRecord {
    public: OwnedJupyterServer,
    token: String,
    child: Option<Child>,
    logs: Arc<Mutex<VecDeque<RuntimeLogLine>>>,
}

#[derive(Clone, Debug)]
pub struct LocalRuntimeManager {
    app_data: PathBuf,
    tools: Arc<Mutex<HashMap<String, ToolRecord>>>,
    environments: Arc<Mutex<HashMap<String, EnvironmentRecord>>>,
    plans: Arc<Mutex<HashMap<String, PlanRecord>>>,
    operations: Arc<Mutex<HashMap<String, Arc<OperationControl>>>>,
    servers: Arc<Mutex<HashMap<String, ServerRecord>>>,
}

impl LocalRuntimeManager {
    pub fn new(app: &AppHandle) -> Result<Self, String> {
        let app_data = app.path().app_local_data_dir().map_err(error_string)?;
        fs::create_dir_all(app_data.join("managed-environments")).map_err(error_string)?;
        fs::create_dir_all(app_data.join("runtime-root")).map_err(error_string)?;
        Ok(Self::with_app_data(app_data))
    }

    fn with_app_data(app_data: PathBuf) -> Self {
        Self {
            app_data,
            tools: Arc::new(Mutex::new(HashMap::new())),
            environments: Arc::new(Mutex::new(HashMap::new())),
            plans: Arc::new(Mutex::new(HashMap::new())),
            operations: Arc::new(Mutex::new(HashMap::new())),
            servers: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    fn discover(&self, workspace_root: Option<&Path>) -> Result<RuntimeDiscovery, String> {
        let mut warnings = Vec::new();
        let mut tool_records = HashMap::new();
        for (kind, names) in [
            ("uv", &["uv", "uv.exe"][..]),
            ("conda", &["conda", "conda.exe", "conda.bat"][..]),
            ("jupyter", &["jupyter", "jupyter.exe"][..]),
        ] {
            if let Some(executable) = executable_candidates(names).into_iter().next() {
                match tool_version(kind, &executable) {
                    Ok(version) => {
                        let id = opaque_id("tool", &executable.to_string_lossy());
                        tool_records.insert(
                            kind.to_string(),
                            ToolRecord {
                                public: RuntimeTool {
                                    id,
                                    kind: kind.into(),
                                    name: display_tool_name(kind),
                                    version,
                                },
                                executable,
                            },
                        );
                    }
                    Err(reason) => {
                        warnings.push(format!("{} 检测失败：{}", display_tool_name(kind), reason))
                    }
                }
            }
        }

        let mut python_candidates = executable_candidates(&[
            "python3.14",
            "python3.13",
            "python3.12",
            "python3.11",
            "python3.10",
            "python3",
            "python",
            "python.exe",
        ]);
        python_candidates.extend(common_python_candidates());
        if let Some(root) = workspace_root {
            python_candidates.extend(workspace_python_candidates(root));
        }
        if let Some(conda) = tool_records.get("conda") {
            match conda_environment_pythons(&conda.executable) {
                Ok(paths) => python_candidates.extend(paths),
                Err(reason) => warnings.push(format!("Conda 环境列表不可用：{reason}")),
            }
        }
        python_candidates.extend(self.managed_environment_pythons());

        let managed = self.managed_markers();
        let mut seen = HashSet::new();
        let mut environments = HashMap::new();
        for candidate in python_candidates.into_iter().take(48) {
            let Ok(canonical) = candidate.canonicalize() else {
                continue;
            };
            if !seen.insert(canonical.clone()) {
                continue;
            }
            let marker = managed.get(&canonical);
            let manager = marker
                .map(|item| item.manager.as_str())
                .or_else(|| {
                    workspace_root
                        .filter(|root| canonical.starts_with(root))
                        .map(|_| "venv")
                })
                .unwrap_or("python");
            match inspect_python(&canonical, manager, marker) {
                Ok(record) => {
                    environments.insert(record.public.id.clone(), record);
                }
                Err(reason) => {
                    if environments.is_empty() {
                        warnings.push(format!("Python 检测失败：{reason}"));
                    }
                }
            }
        }

        let mut kernels = Vec::new();
        let mut servers = Vec::new();
        for environment in environments.values().take(24) {
            if environment.public.jupyter_installed {
                kernels.extend(discover_kernels(environment).unwrap_or_default());
                servers.extend(discover_servers(environment).unwrap_or_default());
            }
        }
        servers.extend(
            self.owned_servers()
                .into_iter()
                .map(|server| DetectedJupyterServer {
                    id: server.id,
                    url: server.url,
                    environment_id: server.environment_id,
                    environment_name: server.environment_name,
                    owned: true,
                }),
        );

        *self
            .tools
            .lock()
            .map_err(|_| "Runtime tool registry is unavailable")? = tool_records.clone();
        *self
            .environments
            .lock()
            .map_err(|_| "Runtime environment registry is unavailable")? = environments.clone();

        let mut public_tools = tool_records
            .into_values()
            .map(|item| item.public)
            .collect::<Vec<_>>();
        public_tools.sort_by(|a, b| a.kind.cmp(&b.kind));
        let mut public_environments = environments
            .into_values()
            .map(|item| item.public)
            .collect::<Vec<_>>();
        public_environments
            .sort_by(|a, b| b.managed.cmp(&a.managed).then_with(|| a.name.cmp(&b.name)));
        kernels.sort_by(|a, b| a.display_name.cmp(&b.display_name));
        servers.sort_by(|a, b| b.owned.cmp(&a.owned).then_with(|| a.url.cmp(&b.url)));
        servers.dedup_by(|a, b| a.url == b.url && a.environment_id == b.environment_id);

        Ok(RuntimeDiscovery {
            tools: public_tools,
            environments: public_environments,
            kernels,
            servers,
            warnings,
        })
    }

    fn managed_environment_pythons(&self) -> Vec<PathBuf> {
        let root = self.app_data.join("managed-environments");
        fs::read_dir(root)
            .into_iter()
            .flatten()
            .filter_map(Result::ok)
            .filter(|entry| entry.path().join("tensornote-runtime.json").is_file())
            .map(|entry| environment_python(&entry.path()))
            .collect()
    }

    fn managed_markers(&self) -> HashMap<PathBuf, ManagedEnvironmentMarker> {
        let mut markers = HashMap::new();
        for python in self.managed_environment_pythons() {
            let Some(root) = environment_root_from_python(&python) else {
                continue;
            };
            let Ok(source) = fs::read_to_string(root.join("tensornote-runtime.json")) else {
                continue;
            };
            let Ok(marker) = serde_json::from_str::<ManagedEnvironmentMarker>(&source) else {
                continue;
            };
            if let Ok(canonical) = python.canonicalize() {
                markers.insert(canonical, marker);
            }
        }
        markers
    }

    fn plan(&self, request: EnvironmentPlanRequest) -> Result<EnvironmentPlan, String> {
        validate_environment_name(&request.name)?;
        validate_python_version(&request.python_version)?;
        let slug = environment_slug(&request.name);
        let target = self.app_data.join("managed-environments").join(&slug);
        if target.exists() {
            return Err("同名 TensorNote Managed Environment 已存在".into());
        }
        let (executable, base_python) = match request.manager.as_str() {
            "uv" | "conda" => {
                let tools = self
                    .tools
                    .lock()
                    .map_err(|_| "Runtime tool registry is unavailable")?;
                let tool = tools
                    .get(&request.manager)
                    .ok_or_else(|| format!("未检测到 {}", display_tool_name(&request.manager)))?;
                (tool.executable.clone(), None)
            }
            "venv" => {
                let environment_id = request
                    .base_environment_id
                    .as_deref()
                    .ok_or("标准 venv 需要选择一个基础 Python")?;
                let environments = self
                    .environments
                    .lock()
                    .map_err(|_| "Runtime environment registry is unavailable")?;
                let environment = environments
                    .get(environment_id)
                    .ok_or("所选基础 Python 已失效，请重新检测")?;
                if !environment
                    .public
                    .python_version
                    .starts_with(&format!("{}.", request.python_version))
                {
                    return Err(format!(
                        "所选基础 Python 为 {}，与计划中的 Python {} 不一致",
                        environment.public.python_version, request.python_version
                    ));
                }
                (environment.python.clone(), Some(environment.python.clone()))
            }
            _ => return Err("只支持 uv、venv 或 Conda 创建计划".into()),
        };
        let id = opaque_id(
            "plan",
            &format!("{}:{}:{}", request.manager, slug, now_millis()),
        );
        let kernel_name = format!("tensornote-{slug}");
        let confirmation = format!("CREATE {}", request.name.trim());
        let expires_at = now_millis() + 15 * 60 * 1000;
        let steps = vec![
            format!(
                "使用 {} 创建独立 Python {} 环境",
                display_tool_name(&request.manager),
                request.python_version
            ),
            format!("安装最小运行依赖：{}", MINIMAL_PACKAGES.join(", ")),
            format!("注册 Jupyter Kernel：{kernel_name}"),
            "完成全部步骤后才标记为可用；失败或取消会清理未完成目录".into(),
        ];
        let public = EnvironmentPlan {
            id: id.clone(),
            manager: request.manager,
            name: request.name.trim().to_string(),
            python_version: request.python_version,
            target_label: format!("TensorNote managed environments / {slug}"),
            packages: MINIMAL_PACKAGES
                .iter()
                .map(|item| (*item).to_string())
                .collect(),
            kernel_name,
            steps,
            confirmation,
            expires_at,
        };
        self.plans
            .lock()
            .map_err(|_| "Runtime plan registry is unavailable")?
            .insert(
                id,
                PlanRecord {
                    public: public.clone(),
                    target,
                    executable,
                    base_python,
                },
            );
        Ok(public)
    }

    fn apply(&self, plan_id: &str, confirmation: &str) -> Result<RuntimeOperation, String> {
        let plan = self
            .plans
            .lock()
            .map_err(|_| "Runtime plan registry is unavailable")?
            .get(plan_id)
            .cloned()
            .ok_or("创建计划不存在或已使用，请重新生成")?;
        if plan.public.expires_at < now_millis() {
            return Err("创建计划已过期，请重新生成".into());
        }
        if confirmation != plan.public.confirmation {
            return Err("确认短语不匹配，未执行任何操作".into());
        }
        self.plans
            .lock()
            .map_err(|_| "Runtime plan registry is unavailable")?
            .remove(plan_id);
        let operation_id = opaque_id("operation", &format!("{}:{}", plan_id, now_millis()));
        let control = Arc::new(OperationControl::new(operation_id.clone()));
        self.operations
            .lock()
            .map_err(|_| "Runtime operation registry is unavailable")?
            .insert(operation_id.clone(), control.clone());
        let manager = self.clone();
        thread::spawn(move || manager.run_environment_plan(plan, control));
        self.operation(operation_id)
    }

    fn run_environment_plan(&self, plan: PlanRecord, control: Arc<OperationControl>) {
        control.append(
            "system",
            "已确认创建计划，开始准备独立环境。请保持 TensorNote 运行。".to_string(),
        );
        let result: Result<String, String> = (|| {
            fs::create_dir_all(
                plan.target
                    .parent()
                    .ok_or("Managed Environment 缺少父目录")?,
            )
            .map_err(error_string)?;
            let python = environment_python(&plan.target);
            let sensitive = vec![self.app_data.clone(), plan.target.clone()];

            control.progress(10);
            match plan.public.manager.as_str() {
                "uv" => run_operation_command(
                    &plan.executable,
                    &[
                        "venv".into(),
                        plan.target.as_os_str().into(),
                        "--python".into(),
                        plan.public.python_version.clone().into(),
                    ],
                    &control,
                    &sensitive,
                )?,
                "conda" => run_operation_command(
                    &plan.executable,
                    &[
                        "create".into(),
                        "--yes".into(),
                        "--prefix".into(),
                        plan.target.as_os_str().into(),
                        format!("python={}", plan.public.python_version).into(),
                        "pip".into(),
                    ],
                    &control,
                    &sensitive,
                )?,
                "venv" => run_operation_command(
                    plan.base_python.as_ref().ok_or("基础 Python 不存在")?,
                    &["-m".into(), "venv".into(), plan.target.as_os_str().into()],
                    &control,
                    &sensitive,
                )?,
                _ => return Err("未知环境管理器".into()),
            }

            if !python.is_file() {
                return Err("环境管理器没有生成可用的 Python".into());
            }
            control.progress(45);
            if plan.public.manager == "uv" {
                let mut args = vec![
                    "pip".into(),
                    "install".into(),
                    "--python".into(),
                    python.as_os_str().into(),
                ];
                args.extend(MINIMAL_PACKAGES.iter().map(|item| (*item).into()));
                run_operation_command(&plan.executable, &args, &control, &sensitive)?;
            } else {
                let mut args = vec![
                    "-m".into(),
                    "pip".into(),
                    "install".into(),
                    "--disable-pip-version-check".into(),
                ];
                args.extend(MINIMAL_PACKAGES.iter().map(|item| (*item).into()));
                run_operation_command(&python, &args, &control, &sensitive)?;
            }

            control.progress(82);
            run_operation_command(
                &python,
                &[
                    "-m".into(),
                    "ipykernel".into(),
                    "install".into(),
                    "--prefix".into(),
                    plan.target.as_os_str().into(),
                    "--name".into(),
                    plan.public.kernel_name.clone().into(),
                    "--display-name".into(),
                    format!("TensorNote · {}", plan.public.name).into(),
                ],
                &control,
                &sensitive,
            )?;

            let marker = ManagedEnvironmentMarker {
                version: 1,
                name: plan.public.name.clone(),
                manager: plan.public.manager.clone(),
                python_version: plan.public.python_version.clone(),
                kernel_name: plan.public.kernel_name.clone(),
            };
            fs::write(
                plan.target.join("tensornote-runtime.json"),
                serde_json::to_vec_pretty(&marker).map_err(error_string)?,
            )
            .map_err(error_string)?;
            let canonical = python.canonicalize().map_err(error_string)?;
            let record = inspect_python(&canonical, &plan.public.manager, Some(&marker))?;
            let environment_id = record.public.id.clone();
            self.environments
                .lock()
                .map_err(|_| "Runtime environment registry is unavailable")?
                .insert(environment_id.clone(), record);
            Ok(environment_id)
        })();

        match result {
            Ok(environment_id) => {
                control.append("system", "环境与 Kernel 已准备完成。".to_string());
                control.finish(environment_id);
            }
            Err(reason) => {
                let _ = fs::remove_dir_all(&plan.target);
                let message = if control.cancelled.load(Ordering::Relaxed) {
                    "创建已取消，未完成环境已清理。".to_string()
                } else {
                    format!(
                        "创建失败，未完成环境已清理：{}",
                        redact(&reason, std::slice::from_ref(&self.app_data))
                    )
                };
                control.append("system", message.clone());
                control.fail(message);
            }
        }
    }

    fn operation(&self, operation_id: String) -> Result<RuntimeOperation, String> {
        self.operations
            .lock()
            .map_err(|_| "Runtime operation registry is unavailable")?
            .get(&operation_id)
            .ok_or_else(|| "Runtime operation 不存在".to_string())?
            .get()
    }

    fn cancel_operation(&self, operation_id: &str) -> Result<RuntimeOperation, String> {
        let operation = self
            .operations
            .lock()
            .map_err(|_| "Runtime operation registry is unavailable")?
            .get(operation_id)
            .cloned()
            .ok_or("Runtime operation 不存在")?;
        operation.cancelled.store(true, Ordering::Relaxed);
        if let Ok(mut child) = operation.child.lock() {
            if let Some(child) = child.as_mut() {
                let _ = child.kill();
            }
        }
        operation.get()
    }

    fn start_server(
        &self,
        environment_id: &str,
        root: PathBuf,
        origin: &str,
    ) -> Result<JupyterServerLaunch, String> {
        validate_origin(origin)?;
        let environment = self
            .environments
            .lock()
            .map_err(|_| "Runtime environment registry is unavailable")?
            .get(environment_id)
            .cloned()
            .ok_or("Python 环境不存在，请重新检测")?;
        if !environment.public.jupyter_installed {
            return Err("所选环境未安装 Jupyter Server".into());
        }
        fs::create_dir_all(&root).map_err(error_string)?;
        let port = available_loopback_port()?;
        let token = secure_token()?;
        let id = opaque_id(
            "server",
            &format!("{}:{}:{}", environment_id, port, now_millis()),
        );
        let mut command = Command::new(&environment.python);
        let args: Vec<std::ffi::OsString> = vec![
            "-m".into(),
            "jupyter".into(),
            "server".into(),
            "--no-browser".into(),
            "--ip=127.0.0.1".into(),
            format!("--port={port}").into(),
            "--ServerApp.port_retries=0".into(),
            "--ServerApp.allow_remote_access=False".into(),
            format!("--ServerApp.allow_origin={origin}").into(),
            format!("--IdentityProvider.token={token}").into(),
            format!("--ServerApp.root_dir={}", root.to_string_lossy()).into(),
        ];
        command
            .args(args)
            .current_dir(&root)
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .env("PYTHONUNBUFFERED", "1");
        configure_command(&mut command);
        let mut child = command
            .spawn()
            .map_err(|error| format!("无法启动 Jupyter Server：{error}"))?;
        let logs = Arc::new(Mutex::new(VecDeque::new()));
        if let Some(stdout) = child.stdout.take() {
            spawn_server_log_reader(
                stdout,
                "stdout",
                logs.clone(),
                token.clone(),
                self.app_data.clone(),
                root.clone(),
            );
        }
        if let Some(stderr) = child.stderr.take() {
            spawn_server_log_reader(
                stderr,
                "stderr",
                logs.clone(),
                token.clone(),
                self.app_data.clone(),
                root.clone(),
            );
        }
        let address = format!("127.0.0.1:{port}").parse().map_err(error_string)?;
        let deadline = SystemTime::now() + Duration::from_secs(12);
        loop {
            if let Some(status) = child.try_wait().map_err(error_string)? {
                return Err(format!("Jupyter Server 启动失败：{status}"));
            }
            if TcpStream::connect_timeout(&address, Duration::from_millis(120)).is_ok() {
                break;
            }
            if SystemTime::now() >= deadline {
                let _ = child.kill();
                let _ = child.wait();
                return Err("Jupyter Server 在 12 秒内没有就绪，已停止该进程".into());
            }
            thread::sleep(Duration::from_millis(120));
        }
        let public = OwnedJupyterServer {
            id: id.clone(),
            environment_id: environment_id.into(),
            environment_name: environment.public.name,
            kernel_name: environment.public.kernel_name,
            url: format!("http://127.0.0.1:{port}"),
            port,
            status: "running".into(),
            owned: true,
            started_at: now_millis(),
        };
        let Ok(mut servers) = self.servers.lock() else {
            let _ = child.kill();
            let _ = child.wait();
            return Err("Owned Server registry is unavailable".into());
        };
        servers.insert(
            id,
            ServerRecord {
                public: public.clone(),
                token: token.clone(),
                child: Some(child),
                logs,
            },
        );
        drop(servers);
        Ok(JupyterServerLaunch {
            server: public,
            token,
        })
    }

    fn owned_servers(&self) -> Vec<OwnedJupyterServer> {
        let Ok(mut servers) = self.servers.lock() else {
            return Vec::new();
        };
        for server in servers.values_mut() {
            if let Some(child) = server.child.as_mut() {
                match child.try_wait() {
                    Ok(Some(_)) => {
                        server.public.status = "exited".into();
                        server.child = None;
                    }
                    Ok(None) => {
                        server.public.status = if TcpStream::connect_timeout(
                            &format!("127.0.0.1:{}", server.public.port)
                                .parse()
                                .expect("loopback socket"),
                            Duration::from_millis(80),
                        )
                        .is_ok()
                        {
                            "running".into()
                        } else {
                            "starting".into()
                        };
                    }
                    Err(_) => server.public.status = "unknown".into(),
                }
            }
        }
        let mut result = servers
            .values()
            .map(|item| item.public.clone())
            .collect::<Vec<_>>();
        result.sort_by_key(|item| std::cmp::Reverse(item.started_at));
        result
    }

    fn server_logs(&self, server_id: &str) -> Result<Vec<RuntimeLogLine>, String> {
        let servers = self
            .servers
            .lock()
            .map_err(|_| "Owned Server registry is unavailable")?;
        let server = servers
            .get(server_id)
            .ok_or("Owned Jupyter Server 不存在")?;
        server
            .logs
            .lock()
            .map(|logs| logs.iter().cloned().collect())
            .map_err(|_| "Jupyter log is unavailable".into())
    }

    fn stop_server(&self, server_id: &str) -> Result<(), String> {
        let mut server = self
            .servers
            .lock()
            .map_err(|_| "Owned Server registry is unavailable")?
            .remove(server_id)
            .ok_or("只能停止当前 TensorNote 启动并仍记录所有权的 Server")?;
        if let Some(mut child) = server.child.take() {
            child.kill().map_err(error_string)?;
            let _ = child.wait_timeout(Duration::from_secs(5));
        }
        server.token.clear();
        Ok(())
    }

    pub fn stop_all(&self) {
        let ids = self
            .servers
            .lock()
            .map(|servers| servers.keys().cloned().collect::<Vec<_>>())
            .unwrap_or_default();
        for id in ids {
            let _ = self.stop_server(&id);
        }
    }
}

#[tauri::command]
pub async fn local_runtime_discover(
    manager: State<'_, LocalRuntimeManager>,
    registry: State<'_, NativeWorkspaceRegistry>,
    workspace_id: Option<String>,
) -> Result<RuntimeDiscovery, String> {
    let root = workspace_id.map(|id| registry.root(&id)).transpose()?;
    let manager = manager.inner().clone();
    tauri::async_runtime::spawn_blocking(move || manager.discover(root.as_deref()))
        .await
        .map_err(error_string)?
}

#[tauri::command]
pub fn local_runtime_plan_environment(
    manager: State<'_, LocalRuntimeManager>,
    request: EnvironmentPlanRequest,
) -> Result<EnvironmentPlan, String> {
    manager.plan(request)
}

#[tauri::command]
pub fn local_runtime_apply_environment(
    manager: State<'_, LocalRuntimeManager>,
    plan_id: String,
    confirmation: String,
) -> Result<RuntimeOperation, String> {
    manager.apply(&plan_id, &confirmation)
}

#[tauri::command]
pub fn local_runtime_operation(
    manager: State<'_, LocalRuntimeManager>,
    operation_id: String,
) -> Result<RuntimeOperation, String> {
    manager.operation(operation_id)
}

#[tauri::command]
pub fn local_runtime_cancel_operation(
    manager: State<'_, LocalRuntimeManager>,
    operation_id: String,
) -> Result<RuntimeOperation, String> {
    manager.cancel_operation(&operation_id)
}

#[tauri::command]
pub fn local_runtime_start_jupyter(
    manager: State<'_, LocalRuntimeManager>,
    registry: State<'_, NativeWorkspaceRegistry>,
    environment_id: String,
    workspace_id: Option<String>,
    origin: String,
) -> Result<JupyterServerLaunch, String> {
    let root = workspace_id
        .map(|id| registry.root(&id))
        .transpose()?
        .unwrap_or_else(|| manager.app_data.join("runtime-root"));
    manager.start_server(&environment_id, root, &origin)
}

#[tauri::command]
pub fn local_runtime_owned_servers(
    manager: State<'_, LocalRuntimeManager>,
) -> Vec<OwnedJupyterServer> {
    manager.owned_servers()
}

#[tauri::command]
pub fn local_runtime_server_logs(
    manager: State<'_, LocalRuntimeManager>,
    server_id: String,
) -> Result<Vec<RuntimeLogLine>, String> {
    manager.server_logs(&server_id)
}

#[tauri::command]
pub fn local_runtime_stop_jupyter(
    manager: State<'_, LocalRuntimeManager>,
    server_id: String,
) -> Result<(), String> {
    manager.stop_server(&server_id)
}

fn tool_version(kind: &str, executable: &Path) -> Result<String, String> {
    let args = match kind {
        "conda" => vec!["--version"],
        "uv" => vec!["--version"],
        "jupyter" => vec!["--version"],
        _ => return Err("Unknown runtime tool".into()),
    };
    let output = run_bounded(executable, &args)?;
    Ok(output
        .lines()
        .next()
        .unwrap_or("detected")
        .trim()
        .to_string())
}

fn inspect_python(
    python: &Path,
    manager: &str,
    marker: Option<&ManagedEnvironmentMarker>,
) -> Result<EnvironmentRecord, String> {
    let script = concat!(
        "import importlib.util,json,os,sys;",
        "print(json.dumps({'version':'.'.join(map(str,sys.version_info[:3])),",
        "'prefix_name':os.path.basename(sys.prefix) or 'Python',",
        "'venv':sys.prefix!=getattr(sys,'base_prefix',sys.prefix),",
        "'jupyter':importlib.util.find_spec('jupyter_server') is not None,",
        "'ipykernel':importlib.util.find_spec('ipykernel') is not None}))"
    );
    let output = run_bounded(python, &["-c", script])?;
    let value: Value = serde_json::from_str(output.trim()).map_err(error_string)?;
    let version = value["version"].as_str().unwrap_or("unknown").to_string();
    let prefix_name = value["prefix_name"].as_str().unwrap_or("Python");
    let managed = marker.is_some();
    let name = marker.map(|item| item.name.clone()).unwrap_or_else(|| {
        if value["venv"].as_bool().unwrap_or(false) {
            prefix_name.to_string()
        } else {
            format!("Python {version}")
        }
    });
    Ok(EnvironmentRecord {
        public: PythonEnvironment {
            id: opaque_id("python", &python.to_string_lossy()),
            name,
            manager: manager.into(),
            python_version: version,
            jupyter_installed: value["jupyter"].as_bool().unwrap_or(false),
            ipykernel_installed: value["ipykernel"].as_bool().unwrap_or(false),
            managed,
            kernel_name: marker.map(|item| item.kernel_name.clone()),
        },
        python: python.to_path_buf(),
    })
}

fn discover_kernels(environment: &EnvironmentRecord) -> Result<Vec<RuntimeKernel>, String> {
    let output = run_bounded(
        &environment.python,
        &["-m", "jupyter", "kernelspec", "list", "--json"],
    )?;
    let value: Value = serde_json::from_str(&output).map_err(error_string)?;
    let mut kernels = Vec::new();
    if let Some(specs) = value["kernelspecs"].as_object() {
        for (name, item) in specs {
            kernels.push(RuntimeKernel {
                name: name.clone(),
                display_name: item["spec"]["display_name"]
                    .as_str()
                    .unwrap_or(name)
                    .to_string(),
                language: item["spec"]["language"]
                    .as_str()
                    .unwrap_or("python")
                    .to_string(),
                environment_id: environment.public.id.clone(),
            });
        }
    }
    Ok(kernels)
}

fn discover_servers(environment: &EnvironmentRecord) -> Result<Vec<DetectedJupyterServer>, String> {
    let output = run_bounded(
        &environment.python,
        &["-m", "jupyter", "server", "list", "--json"],
    )?;
    let mut servers = Vec::new();
    for line in output.lines().filter(|line| !line.trim().is_empty()) {
        let Ok(value) = serde_json::from_str::<Value>(line) else {
            continue;
        };
        let Some(raw_url) = value["url"].as_str() else {
            continue;
        };
        let url = raw_url
            .split('?')
            .next()
            .unwrap_or(raw_url)
            .trim_end_matches('/')
            .to_string();
        if !is_loopback_url(&url) {
            continue;
        }
        servers.push(DetectedJupyterServer {
            id: opaque_id(
                "detected-server",
                &format!("{}:{url}", environment.public.id),
            ),
            url,
            environment_id: environment.public.id.clone(),
            environment_name: environment.public.name.clone(),
            owned: false,
        });
    }
    Ok(servers)
}

fn conda_environment_pythons(conda: &Path) -> Result<Vec<PathBuf>, String> {
    let output = run_bounded(conda, &["env", "list", "--json"])?;
    let value: Value = serde_json::from_str(&output).map_err(error_string)?;
    Ok(value["envs"]
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(Value::as_str)
        .map(PathBuf::from)
        .map(|root| environment_python(&root))
        .collect())
}

fn executable_candidates(names: &[&str]) -> Vec<PathBuf> {
    let mut directories = env::var_os("PATH")
        .map(|value| env::split_paths(&value).collect::<Vec<_>>())
        .unwrap_or_default();
    if let Some(home) = home_directory() {
        directories.extend([
            home.join(".local/bin"),
            home.join(".cargo/bin"),
            home.join("miniconda3/bin"),
            home.join("miniconda3/Scripts"),
            home.join("anaconda3/bin"),
            home.join("anaconda3/Scripts"),
        ]);
    }
    directories.extend([
        PathBuf::from("/opt/homebrew/bin"),
        PathBuf::from("/usr/local/bin"),
        PathBuf::from("/usr/bin"),
    ]);
    let mut seen = HashSet::new();
    let mut result = Vec::new();
    for directory in directories {
        for name in names {
            let candidate = directory.join(name);
            if candidate.is_file() {
                if let Ok(canonical) = candidate.canonicalize() {
                    if seen.insert(canonical.clone()) {
                        result.push(canonical);
                    }
                }
            }
        }
    }
    result
}

fn common_python_candidates() -> Vec<PathBuf> {
    let mut candidates = Vec::new();
    if let Some(home) = home_directory() {
        candidates.extend([
            home.join("miniconda3")
                .join(environment_python(Path::new(""))),
            home.join("anaconda3")
                .join(environment_python(Path::new(""))),
        ]);
    }
    if let Some(local_app_data) = env::var_os("LOCALAPPDATA") {
        let programs = PathBuf::from(local_app_data).join("Programs/Python");
        if let Ok(entries) = fs::read_dir(programs) {
            candidates.extend(
                entries
                    .filter_map(Result::ok)
                    .map(|entry| entry.path().join("python.exe")),
            );
        }
    }
    candidates
        .into_iter()
        .filter(|path| path.is_file())
        .collect()
}

fn workspace_python_candidates(root: &Path) -> Vec<PathBuf> {
    [
        root.join(".venv/bin/python"),
        root.join("venv/bin/python"),
        root.join(".venv/Scripts/python.exe"),
        root.join("venv/Scripts/python.exe"),
    ]
    .into_iter()
    .filter(|path| path.is_file())
    .collect()
}

fn environment_python(root: &Path) -> PathBuf {
    if cfg!(windows) {
        root.join("Scripts/python.exe")
    } else {
        root.join("bin/python")
    }
}

fn environment_root_from_python(python: &Path) -> Option<PathBuf> {
    python.parent()?.parent().map(Path::to_path_buf)
}

fn run_bounded(executable: &Path, args: &[&str]) -> Result<String, String> {
    let mut command = Command::new(executable);
    command
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .env("PYTHONNOUSERSITE", "1");
    configure_command(&mut command);
    let mut child = command.spawn().map_err(error_string)?;
    let stdout = child.stdout.take().ok_or("Command stdout unavailable")?;
    let stderr = child.stderr.take().ok_or("Command stderr unavailable")?;
    let stdout_reader = thread::spawn(move || read_limited(stdout));
    let stderr_reader = thread::spawn(move || read_limited(stderr));
    let status = child.wait_timeout(COMMAND_TIMEOUT).map_err(error_string)?;
    if status.is_none() {
        let _ = child.kill();
        let _ = child.wait();
    }
    let stdout = stdout_reader
        .join()
        .map_err(|_| "Command stdout reader failed")??;
    let stderr = stderr_reader
        .join()
        .map_err(|_| "Command stderr reader failed")??;
    let status = status.ok_or("Command timed out")?;
    if !status.success() {
        let detail = String::from_utf8_lossy(&stderr).trim().to_string();
        return Err(if detail.is_empty() {
            format!("Command exited with {status}")
        } else {
            detail
        });
    }
    Ok(String::from_utf8_lossy(&stdout).into_owned())
}

fn read_limited(reader: impl Read) -> Result<Vec<u8>, String> {
    let mut bytes = Vec::new();
    reader
        .take(MAX_COMMAND_OUTPUT + 1)
        .read_to_end(&mut bytes)
        .map_err(error_string)?;
    if bytes.len() as u64 > MAX_COMMAND_OUTPUT {
        return Err("Command output exceeded 2 MB".into());
    }
    Ok(bytes)
}

fn run_operation_command(
    executable: &Path,
    args: &[std::ffi::OsString],
    control: &Arc<OperationControl>,
    sensitive: &[PathBuf],
) -> Result<(), String> {
    if control.cancelled.load(Ordering::Relaxed) {
        return Err("Operation cancelled".into());
    }
    control.append("system", format!("运行受控步骤：{}", safe_step_label(args)));
    let mut command = Command::new(executable);
    command
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .env("PYTHONUNBUFFERED", "1");
    configure_command(&mut command);
    let mut child = command.spawn().map_err(error_string)?;
    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    *control
        .child
        .lock()
        .map_err(|_| "Operation child state unavailable")? = Some(child);

    let readers = [
        spawn_operation_reader(stdout, "stdout", control.clone(), sensitive.to_vec()),
        spawn_operation_reader(stderr, "stderr", control.clone(), sensitive.to_vec()),
    ];
    let status = loop {
        if control.cancelled.load(Ordering::Relaxed) {
            if let Ok(mut child) = control.child.lock() {
                if let Some(child) = child.as_mut() {
                    let _ = child.kill();
                }
            }
        }
        let status = control
            .child
            .lock()
            .map_err(|_| "Operation child state unavailable")?
            .as_mut()
            .ok_or("Operation child missing")?
            .try_wait()
            .map_err(error_string)?;
        if let Some(status) = status {
            break status;
        }
        thread::sleep(Duration::from_millis(100));
    };
    control
        .child
        .lock()
        .map_err(|_| "Operation child state unavailable")?
        .take();
    for reader in readers.into_iter().flatten() {
        let _ = reader.join();
    }
    if control.cancelled.load(Ordering::Relaxed) {
        return Err("Operation cancelled".into());
    }
    if !status.success() {
        return Err(format!("受控步骤失败：{status}"));
    }
    Ok(())
}

fn spawn_operation_reader(
    reader: Option<impl Read + Send + 'static>,
    stream: &'static str,
    control: Arc<OperationControl>,
    sensitive: Vec<PathBuf>,
) -> Option<thread::JoinHandle<()>> {
    reader.map(|reader| {
        thread::spawn(move || {
            for line in BufReader::new(reader).lines().map_while(Result::ok) {
                control.append(stream, redact(&line, &sensitive));
            }
        })
    })
}

fn spawn_server_log_reader(
    reader: impl Read + Send + 'static,
    stream: &'static str,
    logs: Arc<Mutex<VecDeque<RuntimeLogLine>>>,
    token: String,
    app_data: PathBuf,
    root: PathBuf,
) {
    thread::spawn(move || {
        for line in BufReader::new(reader).lines().map_while(Result::ok) {
            let text = redact(
                &line.replace(&token, "[REDACTED_TOKEN]"),
                &[app_data.clone(), root.clone()],
            );
            if let Ok(mut logs) = logs.lock() {
                let sequence = logs.back().map_or(1, |item| item.sequence + 1);
                logs.push_back(RuntimeLogLine {
                    sequence,
                    timestamp: now_millis(),
                    stream: stream.into(),
                    text,
                });
                while logs.len() > MAX_LOG_LINES {
                    logs.pop_front();
                }
            }
        }
    });
}

fn safe_step_label(args: &[std::ffi::OsString]) -> String {
    args.first()
        .and_then(|item| item.to_str())
        .map(|item| match item {
            "venv" => "创建 uv 环境",
            "create" => "创建 Conda 环境",
            "-m" => "运行 Python 模块",
            "pip" => "安装最小依赖",
            _ => "执行环境步骤",
        })
        .unwrap_or("执行环境步骤")
        .into()
}

fn configure_command(_command: &mut Command) {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        _command.creation_flags(0x08000000);
    }
}

fn display_tool_name(kind: &str) -> String {
    match kind {
        "uv" => "uv".into(),
        "conda" => "Conda".into(),
        "jupyter" => "Jupyter".into(),
        "venv" => "Python venv".into(),
        _ => kind.into(),
    }
}

fn validate_environment_name(name: &str) -> Result<(), String> {
    let value = name.trim();
    if value.is_empty() || value.chars().count() > 40 || value.contains(['\0', '\n', '\r']) {
        return Err("环境名称必须为 1–40 个字符的单行文本".into());
    }
    Ok(())
}

fn validate_python_version(version: &str) -> Result<(), String> {
    if matches!(version, "3.10" | "3.11" | "3.12" | "3.13" | "3.14") {
        Ok(())
    } else {
        Err("Python 版本必须是 3.10–3.14 的受支持版本".into())
    }
}

fn validate_origin(origin: &str) -> Result<(), String> {
    let fixed = matches!(
        origin,
        "tauri://localhost" | "http://tauri.localhost" | "https://tauri.localhost"
    );
    let local_dev = ["http://localhost:", "http://127.0.0.1:"]
        .iter()
        .any(|prefix| {
            origin
                .strip_prefix(prefix)
                .is_some_and(|port| port.parse::<u16>().is_ok())
        });
    if fixed || local_dev {
        Ok(())
    } else {
        Err("Jupyter Origin 不是受信任的 TensorNote Desktop Origin".into())
    }
}

fn is_loopback_url(url: &str) -> bool {
    ["http://127.0.0.1:", "http://localhost:", "http://[::1]:"]
        .iter()
        .any(|prefix| url.starts_with(prefix))
}

fn available_loopback_port() -> Result<u16, String> {
    let listener = TcpListener::bind(("127.0.0.1", 0)).map_err(error_string)?;
    listener
        .local_addr()
        .map(|address| address.port())
        .map_err(error_string)
}

fn secure_token() -> Result<String, String> {
    let mut bytes = [0_u8; 32];
    getrandom(&mut bytes).map_err(error_string)?;
    Ok(bytes.iter().map(|byte| format!("{byte:02x}")).collect())
}

fn environment_slug(name: &str) -> String {
    let slug = name
        .trim()
        .to_ascii_lowercase()
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() {
                character
            } else {
                '-'
            }
        })
        .collect::<String>()
        .split('-')
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join("-");
    if slug.is_empty() {
        format!("environment-{:x}", stable_hash(name))
    } else {
        slug.chars().take(32).collect()
    }
}

fn opaque_id(prefix: &str, value: &str) -> String {
    format!("{prefix}:{:016x}", stable_hash(value))
}

fn stable_hash(value: &str) -> u64 {
    let mut hash = 0xcbf29ce484222325_u64;
    for byte in value.as_bytes() {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x100000001b3);
    }
    hash
}

fn now_millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

fn home_directory() -> Option<PathBuf> {
    env::var_os("HOME")
        .or_else(|| env::var_os("USERPROFILE"))
        .map(PathBuf::from)
}

fn redact(text: &str, sensitive: &[PathBuf]) -> String {
    let mut output = text.to_string();
    for path in sensitive {
        output = output.replace(path.to_string_lossy().as_ref(), "$TENSORNOTE_DATA");
    }
    if let Some(home) = home_directory() {
        output = output.replace(home.to_string_lossy().as_ref(), "$HOME");
    }
    output
}

fn error_string(error: impl std::fmt::Display) -> String {
    error.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn validates_planning_inputs_and_origins() {
        assert!(validate_environment_name("TensorNote Base").is_ok());
        assert!(validate_environment_name("bad\nname").is_err());
        assert!(validate_python_version("3.11").is_ok());
        assert!(validate_python_version("2.7").is_err());
        assert!(validate_origin("tauri://localhost").is_ok());
        assert!(validate_origin("http://localhost:5173").is_ok());
        assert!(validate_origin("https://example.com").is_err());
    }

    #[test]
    fn creates_opaque_ids_and_redacts_personal_paths() {
        let temp = tempdir().expect("tempdir");
        let secret_path = temp.path().join("managed-environments/example");
        let id = opaque_id("python", &secret_path.to_string_lossy());
        assert!(!id.contains(temp.path().to_string_lossy().as_ref()));
        assert_eq!(
            redact(
                &format!("created {}", secret_path.display()),
                &[temp.path().to_path_buf()]
            ),
            format!(
                "created $TENSORNOTE_DATA{separator}managed-environments{separator}example",
                separator = std::path::MAIN_SEPARATOR
            )
        );
    }

    #[test]
    fn discovers_only_ready_managed_environment_markers() {
        let temp = tempdir().expect("tempdir");
        let manager = LocalRuntimeManager::with_app_data(temp.path().to_path_buf());
        let ready = temp.path().join("managed-environments/ready");
        let partial = temp.path().join("managed-environments/partial");
        fs::create_dir_all(&ready).expect("ready");
        fs::create_dir_all(&partial).expect("partial");
        fs::write(
            ready.join("tensornote-runtime.json"),
            r#"{"version":1,"name":"Ready","manager":"venv","pythonVersion":"3.11","kernelName":"tensornote-ready"}"#,
        )
        .expect("marker");
        assert_eq!(manager.managed_environment_pythons().len(), 1);
    }

    #[test]
    fn keeps_minimal_environment_free_of_large_ml_frameworks() {
        assert!(MINIMAL_PACKAGES.contains(&"jupyter-server"));
        assert!(MINIMAL_PACKAGES.contains(&"ipykernel"));
        assert!(!MINIMAL_PACKAGES.contains(&"torch"));
        assert!(!MINIMAL_PACKAGES.contains(&"transformers"));
    }

    #[test]
    fn marks_an_environment_usable_only_after_completion() {
        let operation = OperationControl::new("operation:test".into());
        assert_eq!(operation.get().expect("operation").state, "running");
        operation.finish("python:opaque".into());
        let completed = operation.get().expect("completed operation");
        assert_eq!(completed.state, "completed");
        assert_eq!(completed.progress, 100);
        assert_eq!(completed.environment_id.as_deref(), Some("python:opaque"));
    }
}
