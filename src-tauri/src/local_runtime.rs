use crate::native_workspace::NativeWorkspaceRegistry;
use getrandom::getrandom;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};
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
use tauri_plugin_dialog::DialogExt;
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
    executable_path: String,
    source: String,
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
    python_path: String,
    location: String,
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
    managed_environment_root: String,
    manager_diagnostics: Vec<RuntimeManagerDiagnostic>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeManagerDiagnostic {
    kind: String,
    status: String,
    detail: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnvironmentPlanRequest {
    manager: String,
    name: String,
    python_version: String,
    base_environment_id: Option<String>,
    workspace_id: Option<String>,
    #[serde(default)]
    dependency_files: Vec<String>,
    manifest_digest: Option<String>,
    manifest_path: Option<String>,
    revision: Option<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DependencyInstallPlanRequest {
    environment_id: String,
    workspace_id: String,
    dependency_files: Vec<String>,
    manifest_path: Option<String>,
    manifest_digest: Option<String>,
    revision: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EnvironmentPlanDependency {
    path: String,
    sha256: String,
    size: u64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EnvironmentPlan {
    id: String,
    kind: String,
    manager: String,
    name: String,
    python_version: String,
    target_label: String,
    target_path: String,
    manager_executable_path: String,
    environment_id: Option<String>,
    external_environment: bool,
    packages: Vec<String>,
    kernel_name: String,
    steps: Vec<String>,
    confirmation: String,
    expires_at: u64,
    dependencies: Vec<EnvironmentPlanDependency>,
    manifest_digest: Option<String>,
    manifest_sha256: Option<String>,
    revision: Option<String>,
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
    dependency_files: Vec<PathBuf>,
    manifest_file: Option<PathBuf>,
    install_only: bool,
    jupyter_support_only: bool,
    existing_environment_id: Option<String>,
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
    selected_tools: Arc<Mutex<HashMap<String, PathBuf>>>,
}

impl LocalRuntimeManager {
    pub(crate) fn environment_python(&self, environment_id: &str) -> Result<PathBuf, String> {
        self.environments
            .lock()
            .map_err(|_| "Runtime environment registry is unavailable")?
            .get(environment_id)
            .map(|environment| environment.python.clone())
            .ok_or_else(|| "所选 Python 环境不存在，请重新检测".into())
    }
    pub fn new(app: &AppHandle) -> Result<Self, String> {
        let app_data = app.path().app_local_data_dir().map_err(error_string)?;
        fs::create_dir_all(app_data.join("managed-environments")).map_err(error_string)?;
        fs::create_dir_all(app_data.join("runtime-root")).map_err(error_string)?;
        Ok(Self::with_app_data(app_data))
    }

    fn with_app_data(app_data: PathBuf) -> Self {
        let selected_tools = read_selected_tools(&app_data);
        Self {
            app_data,
            tools: Arc::new(Mutex::new(HashMap::new())),
            environments: Arc::new(Mutex::new(HashMap::new())),
            plans: Arc::new(Mutex::new(HashMap::new())),
            operations: Arc::new(Mutex::new(HashMap::new())),
            servers: Arc::new(Mutex::new(HashMap::new())),
            selected_tools: Arc::new(Mutex::new(selected_tools)),
        }
    }

    fn discover(&self, workspace_root: Option<&Path>) -> Result<RuntimeDiscovery, String> {
        let mut warnings = Vec::new();
        let mut tool_records = HashMap::new();
        let selected_tools = self
            .selected_tools
            .lock()
            .map_err(|_| "Runtime tool settings are unavailable")?
            .clone();
        for (kind, names) in [
            ("uv", &["uv", "uv.exe"][..]),
            ("conda", &["conda", "conda.exe", "conda.bat"][..]),
            ("jupyter", &["jupyter", "jupyter.exe"][..]),
        ] {
            let selected = selected_tools
                .get(kind)
                .filter(|path| path.is_file())
                .cloned();
            let (candidate, source) = if let Some(path) = selected {
                (Some(path), "user-selected")
            } else {
                let path_candidates = path_executable_candidates(names);
                if let Some(path) = path_candidates.into_iter().next() {
                    (Some(path), "path")
                } else {
                    (
                        common_tool_candidates(kind).into_iter().next(),
                        "common-location",
                    )
                }
            };
            if let Some(executable) = candidate {
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
                                    executable_path: executable.to_string_lossy().into_owned(),
                                    source: source.into(),
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
        let mut conda_pythons = HashSet::new();
        if let Some(conda) = tool_records.get("conda") {
            match conda_environment_pythons(&conda.executable) {
                Ok(paths) => {
                    for path in paths {
                        if let Ok(canonical) = path.canonicalize() {
                            conda_pythons.insert(canonical);
                        }
                        python_candidates.push(path);
                    }
                }
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
                .or_else(|| conda_pythons.contains(&canonical).then_some("conda"))
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

        let manager_diagnostics = ["uv", "conda"]
            .into_iter()
            .map(
                |kind| match public_tools.iter().find(|tool| tool.kind == kind) {
                    Some(tool) => RuntimeManagerDiagnostic {
                        kind: kind.into(),
                        status: "available".into(),
                        detail: format!("{} · {}", tool.version, tool.executable_path),
                    },
                    None => RuntimeManagerDiagnostic {
                        kind: kind.into(),
                        status: "missing".into(),
                        detail: format!("未检测到 {}", display_tool_name(kind)),
                    },
                },
            )
            .chain(std::iter::once(RuntimeManagerDiagnostic {
                kind: "venv".into(),
                status: if public_environments.is_empty() {
                    "missing"
                } else {
                    "available"
                }
                .into(),
                detail: if public_environments.is_empty() {
                    "未检测到可作为基础解释器的 Python".into()
                } else {
                    format!("{} 个基础 Python 可用", public_environments.len())
                },
            }))
            .collect();

        Ok(RuntimeDiscovery {
            tools: public_tools,
            environments: public_environments,
            kernels,
            servers,
            warnings,
            managed_environment_root: self
                .app_data
                .join("managed-environments")
                .to_string_lossy()
                .into_owned(),
            manager_diagnostics,
        })
    }

    fn set_tool(&self, kind: &str, path: &Path) -> Result<(), String> {
        if !matches!(kind, "uv" | "conda") {
            return Err("只能配置 uv 或 Conda 可执行文件".into());
        }
        let canonical = path.canonicalize().map_err(|_| "所选工具文件不存在")?;
        if !canonical.is_file() {
            return Err("所选路径不是文件".into());
        }
        tool_version(kind, &canonical).map_err(|reason| {
            format!("所选文件不是可用的 {}：{reason}", display_tool_name(kind))
        })?;
        let mut selected = self
            .selected_tools
            .lock()
            .map_err(|_| "Runtime tool settings are unavailable")?;
        selected.insert(kind.into(), canonical);
        write_selected_tools(&self.app_data, &selected)
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

    fn plan(
        &self,
        request: EnvironmentPlanRequest,
        workspace_root: Option<&Path>,
    ) -> Result<EnvironmentPlan, String> {
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
        if request.dependency_files.len() > 8 {
            return Err("单个环境最多声明 8 个依赖文件".into());
        }
        let mut dependency_files = Vec::new();
        let mut dependencies = Vec::new();
        for relative in &request.dependency_files {
            let root = workspace_root.ok_or("项目依赖计划需要已授权的本地 Workspace")?;
            let path = secure_workspace_file(root, relative)?;
            let source = fs::read(&path).map_err(error_string)?;
            if source.len() > 2 * 1024 * 1024 {
                return Err(format!("依赖文件过大：{relative}"));
            }
            dependencies.push(EnvironmentPlanDependency {
                path: relative.clone(),
                sha256: sha256_hex(&source),
                size: source.len() as u64,
            });
            dependency_files.push(path);
        }
        let (manifest_file, manifest_sha256) =
            if let Some(relative) = request.manifest_path.as_deref() {
                let root = workspace_root.ok_or("项目环境计划需要已授权的本地 Workspace")?;
                let path = secure_workspace_file(root, relative)?;
                let source = fs::read(&path).map_err(error_string)?;
                (Some(path), Some(sha256_hex(&source)))
            } else {
                (None, None)
            };
        let mut steps = vec![
            format!(
                "使用 {} 创建独立 Python {} 环境",
                display_tool_name(&request.manager),
                request.python_version
            ),
            format!("安装最小运行依赖：{}", MINIMAL_PACKAGES.join(", ")),
            format!("注册 Jupyter Kernel：{kernel_name}"),
            "完成全部步骤后才标记为可用；失败或取消会清理未完成目录".into(),
        ];
        for dependency in &dependencies {
            steps.insert(
                2,
                format!(
                    "从 Workspace 安装 {}（SHA-256 {}…）",
                    dependency.path,
                    &dependency.sha256[..12]
                ),
            );
        }
        let public = EnvironmentPlan {
            id: id.clone(),
            kind: "create".into(),
            manager: request.manager,
            name: request.name.trim().to_string(),
            python_version: request.python_version,
            target_label: format!("TensorNote managed environments / {slug}"),
            target_path: target.to_string_lossy().into_owned(),
            manager_executable_path: executable.to_string_lossy().into_owned(),
            environment_id: None,
            external_environment: false,
            packages: MINIMAL_PACKAGES
                .iter()
                .map(|item| (*item).to_string())
                .collect(),
            kernel_name,
            steps,
            confirmation,
            expires_at,
            dependencies,
            manifest_digest: request.manifest_digest,
            manifest_sha256,
            revision: request.revision,
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
                    dependency_files,
                    manifest_file,
                    install_only: false,
                    jupyter_support_only: false,
                    existing_environment_id: None,
                },
            );
        Ok(public)
    }

    fn plan_dependencies(
        &self,
        request: DependencyInstallPlanRequest,
        workspace_root: &Path,
    ) -> Result<EnvironmentPlan, String> {
        if request.dependency_files.is_empty() || request.dependency_files.len() > 8 {
            return Err("请选择 1–8 个 requirements 文件".into());
        }
        let environment = self
            .environments
            .lock()
            .map_err(|_| "Runtime environment registry is unavailable")?
            .get(&request.environment_id)
            .cloned()
            .ok_or("目标环境不存在，请重新检测")?;
        let mut files = Vec::new();
        let mut dependencies = Vec::new();
        for relative in &request.dependency_files {
            if !is_requirements_file(relative) {
                return Err(format!("首期仅支持 requirements*.txt：{relative}"));
            }
            let path = secure_workspace_file(workspace_root, relative)?;
            let source = fs::read(&path).map_err(error_string)?;
            if source.len() > 2 * 1024 * 1024 {
                return Err(format!("依赖文件过大：{relative}"));
            }
            dependencies.push(EnvironmentPlanDependency {
                path: relative.clone(),
                sha256: sha256_hex(&source),
                size: source.len() as u64,
            });
            files.push(path);
        }
        let (manifest_file, manifest_sha256) =
            if let Some(relative) = request.manifest_path.as_deref() {
                let path = secure_workspace_file(workspace_root, relative)?;
                let source = fs::read(&path).map_err(error_string)?;
                (Some(path), Some(sha256_hex(&source)))
            } else {
                (None, None)
            };
        let (executable, manager_path) = if environment.public.manager == "uv" {
            let tools = self
                .tools
                .lock()
                .map_err(|_| "Runtime tool registry is unavailable")?;
            let tool = tools
                .get("uv")
                .ok_or("该环境由 uv 管理，但当前未检测到 uv")?;
            (
                tool.executable.clone(),
                tool.executable.to_string_lossy().into_owned(),
            )
        } else {
            (
                environment.python.clone(),
                environment.python.to_string_lossy().into_owned(),
            )
        };
        let id = opaque_id(
            "dependency-plan",
            &format!("{}:{}", request.environment_id, now_millis()),
        );
        let confirmation = format!("INSTALL {}", environment.public.name);
        let target =
            environment_root_from_python(&environment.python).ok_or("无法确定目标环境目录")?;
        let steps = dependencies
            .iter()
            .map(|item| format!("安装 {}（SHA-256 {}…）", item.path, &item.sha256[..12]))
            .chain(std::iter::once("保留现有环境；失败或取消不会删除它".into()))
            .collect();
        let public = EnvironmentPlan {
            id: id.clone(),
            kind: "install".into(),
            manager: environment.public.manager.clone(),
            name: environment.public.name.clone(),
            python_version: environment.public.python_version.clone(),
            target_label: environment.public.location.clone(),
            target_path: target.to_string_lossy().into_owned(),
            manager_executable_path: manager_path,
            environment_id: Some(request.environment_id.clone()),
            external_environment: !environment.public.managed,
            packages: Vec::new(),
            kernel_name: environment
                .public
                .kernel_name
                .clone()
                .unwrap_or_else(|| "python3".into()),
            steps,
            confirmation,
            expires_at: now_millis() + 15 * 60 * 1000,
            dependencies,
            manifest_digest: request.manifest_digest,
            manifest_sha256,
            revision: request.revision,
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
                    base_python: Some(environment.python),
                    dependency_files: files,
                    manifest_file,
                    install_only: true,
                    jupyter_support_only: false,
                    existing_environment_id: Some(request.environment_id),
                },
            );
        Ok(public)
    }

    fn plan_jupyter_support(&self, environment_id: &str) -> Result<EnvironmentPlan, String> {
        let environment = self
            .environments
            .lock()
            .map_err(|_| "Runtime environment registry is unavailable")?
            .get(environment_id)
            .cloned()
            .ok_or("目标环境不存在，请重新检测")?;
        if environment.public.managed {
            return Err(
                "TensorNote Managed Environment 应已包含 Jupyter 支持，请重新检测或重建环境".into(),
            );
        }
        let (executable, manager_path) = if environment.public.manager == "uv" {
            let tools = self
                .tools
                .lock()
                .map_err(|_| "Runtime tool registry is unavailable")?;
            let tool = tools
                .get("uv")
                .ok_or("该环境由 uv 管理，但当前未检测到 uv")?;
            (
                tool.executable.clone(),
                tool.executable.to_string_lossy().into_owned(),
            )
        } else {
            (
                environment.python.clone(),
                environment.python.to_string_lossy().into_owned(),
            )
        };
        let target =
            environment_root_from_python(&environment.python).ok_or("无法确定目标环境目录")?;
        let id = opaque_id(
            "jupyter-support-plan",
            &format!("{}:{}", environment_id, now_millis()),
        );
        let kernel_name = format!(
            "tensornote-external-{}",
            &sha256_hex(environment_id.as_bytes())[..12]
        );
        let confirmation = format!("INSTALL JUPYTER {}", environment.public.name);
        let public = EnvironmentPlan {
            id: id.clone(),
            kind: "jupyter-support".into(),
            manager: environment.public.manager.clone(),
            name: environment.public.name.clone(),
            python_version: environment.public.python_version.clone(),
            target_label: environment.public.location.clone(),
            target_path: target.to_string_lossy().into_owned(),
            manager_executable_path: manager_path,
            environment_id: Some(environment_id.to_string()),
            external_environment: true,
            packages: MINIMAL_PACKAGES
                .iter()
                .map(|item| (*item).to_string())
                .collect(),
            kernel_name,
            steps: vec![
                format!(
                    "安装 TensorNote Notebook 基础支持：{}",
                    MINIMAL_PACKAGES.join(", ")
                ),
                "在该 Python 环境的 sys-prefix 中注册 Jupyter Kernel".into(),
                "保留现有外部环境；失败或取消不会删除它，但部分包可能已安装".into(),
            ],
            confirmation,
            expires_at: now_millis() + 15 * 60 * 1000,
            dependencies: Vec::new(),
            manifest_digest: None,
            manifest_sha256: None,
            revision: None,
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
                    base_python: Some(environment.python),
                    dependency_files: Vec::new(),
                    manifest_file: None,
                    install_only: true,
                    jupyter_support_only: true,
                    existing_environment_id: Some(environment_id.to_string()),
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
        for (index, path) in plan.dependency_files.iter().enumerate() {
            let source = fs::read(path).map_err(|_| "依赖文件已移动或无法读取，请重新生成计划")?;
            if sha256_hex(&source) != plan.public.dependencies[index].sha256 {
                return Err("依赖文件内容已变化，请重新检查并确认安装计划".into());
            }
        }
        if let (Some(path), Some(expected)) = (&plan.manifest_file, &plan.public.manifest_sha256) {
            let source = fs::read(path)
                .map_err(|_| "Experiment Manifest 已移动或无法读取，请重新生成计划")?;
            if sha256_hex(&source) != *expected {
                return Err("Experiment Manifest 已变化，请重新检查并确认安装计划".into());
            }
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
        thread::spawn(move || {
            if plan.install_only {
                manager.run_dependency_plan(plan, control)
            } else {
                manager.run_environment_plan(plan, control)
            }
        });
        self.operation(operation_id)
    }

    fn run_dependency_plan(&self, plan: PlanRecord, control: Arc<OperationControl>) {
        control.append("system", "已确认依赖安装计划。现有环境会保留。".to_string());
        let result: Result<String, String> = (|| {
            let python = plan.base_python.as_ref().ok_or("目标 Python 不存在")?;
            let sensitive = vec![self.app_data.clone(), plan.target.clone()];
            if plan.jupyter_support_only {
                control.progress(15);
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
                    run_operation_command(python, &args, &control, &sensitive)?;
                }
                control.progress(75);
                run_operation_command(
                    python,
                    &[
                        "-m".into(),
                        "ipykernel".into(),
                        "install".into(),
                        "--sys-prefix".into(),
                        "--name".into(),
                        plan.public.kernel_name.clone().into(),
                        "--display-name".into(),
                        format!("TensorNote · {}", plan.public.name).into(),
                    ],
                    &control,
                    &sensitive,
                )?;
            }
            for (index, dependency) in plan.dependency_files.iter().enumerate() {
                control.progress(10 + ((index as u8) * 80 / plan.dependency_files.len() as u8));
                if plan.public.manager == "uv" {
                    run_operation_command(
                        &plan.executable,
                        &[
                            "pip".into(),
                            "install".into(),
                            "--python".into(),
                            python.as_os_str().into(),
                            "--requirement".into(),
                            dependency.as_os_str().into(),
                        ],
                        &control,
                        &sensitive,
                    )?;
                } else {
                    run_operation_command(
                        python,
                        &[
                            "-m".into(),
                            "pip".into(),
                            "install".into(),
                            "--disable-pip-version-check".into(),
                            "--requirement".into(),
                            dependency.as_os_str().into(),
                        ],
                        &control,
                        &sensitive,
                    )?;
                }
            }
            Ok(plan
                .existing_environment_id
                .clone()
                .ok_or("目标环境标识不存在")?)
        })();
        match result {
            Ok(environment_id) => {
                control.append(
                    "system",
                    if plan.jupyter_support_only {
                        "Jupyter 支持已安装到所选外部环境。"
                    } else {
                        "依赖已安装到所选环境。"
                    }
                    .to_string(),
                );
                control.finish(environment_id);
            }
            Err(reason) => {
                let message = if control.cancelled.load(Ordering::Relaxed) {
                    "安装已取消；现有环境未删除，部分包可能已经安装。".to_string()
                } else {
                    format!(
                        "安装失败；现有环境未删除，部分包可能已经安装：{}",
                        redact(&reason, std::slice::from_ref(&self.app_data))
                    )
                };
                control.append("system", message.clone());
                control.fail(message);
            }
        }
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

            for dependency in &plan.dependency_files {
                control.progress(70);
                if plan.public.manager == "uv" {
                    run_operation_command(
                        &plan.executable,
                        &[
                            "pip".into(),
                            "install".into(),
                            "--python".into(),
                            python.as_os_str().into(),
                            "--requirement".into(),
                            dependency.as_os_str().into(),
                        ],
                        &control,
                        &sensitive,
                    )?;
                } else {
                    run_operation_command(
                        &python,
                        &[
                            "-m".into(),
                            "pip".into(),
                            "install".into(),
                            "--disable-pip-version-check".into(),
                            "--requirement".into(),
                            dependency.as_os_str().into(),
                        ],
                        &control,
                        &sensitive,
                    )?;
                }
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

    fn remove_environment(&self, environment_id: &str, confirmation: &str) -> Result<(), String> {
        let environment = self
            .environments
            .lock()
            .map_err(|_| "Runtime environment registry is unavailable")?
            .get(environment_id)
            .cloned()
            .ok_or("环境不存在，请重新检测")?;
        if !environment.public.managed {
            return Err("只能清理 TensorNote 创建的 Managed Environment".into());
        }
        if confirmation != format!("DELETE {}", environment.public.name) {
            return Err("确认短语不匹配，未删除环境".into());
        }
        if self
            .servers
            .lock()
            .map_err(|_| "Runtime server registry is unavailable")?
            .values()
            .any(|server| server.public.environment_id == environment_id)
        {
            return Err("环境仍被运行中的 Jupyter Server 使用，请先停止 Server".into());
        }
        let root = environment_root_from_python(&environment.python)
            .ok_or("无法确定 Managed Environment 目录")?;
        let managed_root = self
            .app_data
            .join("managed-environments")
            .canonicalize()
            .map_err(error_string)?;
        let canonical = root.canonicalize().map_err(error_string)?;
        if !canonical.starts_with(&managed_root)
            || !canonical.join("tensornote-runtime.json").is_file()
        {
            return Err("环境目录未通过 Managed Environment 边界检查".into());
        }
        fs::remove_dir_all(canonical).map_err(error_string)?;
        self.environments
            .lock()
            .map_err(|_| "Runtime environment registry is unavailable")?
            .remove(environment_id);
        Ok(())
    }

    fn start_server(
        &self,
        environment_id: &str,
        root: PathBuf,
        origin: &str,
    ) -> Result<JupyterServerLaunch, String> {
        validate_origin(origin)?;
        if let Some(existing) = self
            .servers
            .lock()
            .map_err(|_| "Owned Server registry is unavailable")?
            .values()
            .find(|server| {
                server.public.environment_id == environment_id
                    && server.public.status != "exited"
                    && TcpStream::connect_timeout(
                        &format!("127.0.0.1:{}", server.public.port)
                            .parse()
                            .expect("loopback socket"),
                        Duration::from_millis(120),
                    )
                    .is_ok()
            })
            .map(|server| JupyterServerLaunch {
                server: server.public.clone(),
                token: server.token.clone(),
            })
        {
            return Ok(existing);
        }
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
pub async fn local_runtime_select_tool(
    app: AppHandle,
    manager: State<'_, LocalRuntimeManager>,
    kind: String,
) -> Result<bool, String> {
    if !matches!(kind.as_str(), "uv" | "conda") {
        return Err("只能配置 uv 或 Conda 可执行文件".into());
    }
    let selected = app
        .dialog()
        .file()
        .set_title(if kind == "conda" {
            "选择 Conda 可执行文件"
        } else {
            "选择 uv 可执行文件"
        })
        .blocking_pick_file();
    let Some(path) = selected else {
        return Ok(false);
    };
    manager.set_tool(&kind, &path.into_path().map_err(error_string)?)?;
    Ok(true)
}

#[tauri::command]
pub fn local_runtime_plan_environment(
    manager: State<'_, LocalRuntimeManager>,
    registry: State<'_, NativeWorkspaceRegistry>,
    request: EnvironmentPlanRequest,
) -> Result<EnvironmentPlan, String> {
    let root = request
        .workspace_id
        .as_deref()
        .map(|id| registry.root(id))
        .transpose()?;
    manager.plan(request, root.as_deref())
}

#[tauri::command]
pub fn local_runtime_plan_dependencies(
    manager: State<'_, LocalRuntimeManager>,
    registry: State<'_, NativeWorkspaceRegistry>,
    request: DependencyInstallPlanRequest,
) -> Result<EnvironmentPlan, String> {
    let root = registry.root(&request.workspace_id)?;
    manager.plan_dependencies(request, &root)
}

#[tauri::command]
pub fn local_runtime_plan_jupyter_support(
    manager: State<'_, LocalRuntimeManager>,
    environment_id: String,
) -> Result<EnvironmentPlan, String> {
    manager.plan_jupyter_support(&environment_id)
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
pub fn local_runtime_remove_environment(
    manager: State<'_, LocalRuntimeManager>,
    environment_id: String,
    confirmation: String,
) -> Result<(), String> {
    manager.remove_environment(&environment_id, &confirmation)
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
            python_path: python.to_string_lossy().into_owned(),
            location: environment_root_from_python(python)
                .unwrap_or_else(|| python.to_path_buf())
                .to_string_lossy()
                .into_owned(),
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

fn is_requirements_file(path: &str) -> bool {
    Path::new(path)
        .file_name()
        .and_then(|name| name.to_str())
        .is_some_and(|name| {
            let lower = name.to_ascii_lowercase();
            lower.starts_with("requirements") && lower.ends_with(".txt")
        })
}

fn read_selected_tools(app_data: &Path) -> HashMap<String, PathBuf> {
    let Ok(source) = fs::read(app_data.join("runtime-tools.json")) else {
        return HashMap::new();
    };
    serde_json::from_slice::<HashMap<String, String>>(&source)
        .unwrap_or_default()
        .into_iter()
        .filter(|(kind, _)| matches!(kind.as_str(), "uv" | "conda"))
        .map(|(kind, path)| (kind, PathBuf::from(path)))
        .collect()
}

fn write_selected_tools(app_data: &Path, tools: &HashMap<String, PathBuf>) -> Result<(), String> {
    let public = tools
        .iter()
        .map(|(kind, path)| (kind.clone(), path.to_string_lossy().into_owned()))
        .collect::<HashMap<_, _>>();
    let source = serde_json::to_vec_pretty(&public).map_err(error_string)?;
    fs::write(app_data.join("runtime-tools.json"), source).map_err(error_string)
}

fn executable_candidates(names: &[&str]) -> Vec<PathBuf> {
    let mut result = path_executable_candidates(names);
    let mut seen = result.iter().cloned().collect::<HashSet<_>>();
    for kind in ["uv", "conda", "jupyter"] {
        for candidate in common_tool_candidates(kind) {
            if names
                .iter()
                .any(|name| candidate.file_name().is_some_and(|file| file == *name))
                && seen.insert(candidate.clone())
            {
                result.push(candidate);
            }
        }
    }
    result
}

fn path_executable_candidates(names: &[&str]) -> Vec<PathBuf> {
    let directories = env::var_os("PATH")
        .map(|value| env::split_paths(&value).collect::<Vec<_>>())
        .unwrap_or_default();
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

fn common_tool_candidates(kind: &str) -> Vec<PathBuf> {
    let names: &[&str] = match kind {
        "conda" => &["conda", "conda.exe", "conda.bat"],
        "uv" => &["uv", "uv.exe"],
        "jupyter" => &["jupyter", "jupyter.exe"],
        _ => &[],
    };
    let mut directories = vec![
        PathBuf::from("/opt/homebrew/bin"),
        PathBuf::from("/usr/local/bin"),
        PathBuf::from("/usr/bin"),
        PathBuf::from("/opt/anaconda3/bin"),
        PathBuf::from("/opt/miniconda3/bin"),
        PathBuf::from("/opt/miniforge3/bin"),
        PathBuf::from("/opt/mambaforge/bin"),
    ];
    if let Some(home) = home_directory() {
        directories.extend([
            home.join(".local/bin"),
            home.join(".cargo/bin"),
            home.join("miniconda3/bin"),
            home.join("miniconda3/Scripts"),
            home.join("miniconda3/condabin"),
            home.join("anaconda3/bin"),
            home.join("anaconda3/Scripts"),
            home.join("anaconda3/condabin"),
            home.join("miniforge3/bin"),
            home.join("mambaforge/bin"),
            home.join("micromamba/bin"),
        ]);
    }
    if let Some(local_app_data) = env::var_os("LOCALAPPDATA") {
        let root = PathBuf::from(local_app_data);
        directories.extend([
            root.join("miniconda3/Scripts"),
            root.join("miniconda3/condabin"),
            root.join("anaconda3/Scripts"),
            root.join("anaconda3/condabin"),
        ]);
    }
    let mut seen = HashSet::new();
    directories
        .into_iter()
        .flat_map(|directory| names.iter().map(move |name| directory.join(name)))
        .filter(|path| path.is_file())
        .filter_map(|path| path.canonicalize().ok())
        .filter(|path| seen.insert(path.clone()))
        .collect()
}

fn common_python_candidates() -> Vec<PathBuf> {
    let mut candidates = Vec::new();
    if let Some(home) = home_directory() {
        candidates.extend([
            home.join("miniconda3")
                .join(environment_python(Path::new(""))),
            home.join("anaconda3")
                .join(environment_python(Path::new(""))),
            home.join("miniforge3")
                .join(environment_python(Path::new(""))),
            home.join("mambaforge")
                .join(environment_python(Path::new(""))),
        ]);
    }
    candidates.extend([
        PathBuf::from("/opt/anaconda3").join(environment_python(Path::new(""))),
        PathBuf::from("/opt/miniconda3").join(environment_python(Path::new(""))),
        PathBuf::from("/opt/miniforge3").join(environment_python(Path::new(""))),
        PathBuf::from("/opt/mambaforge").join(environment_python(Path::new(""))),
    ]);
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

fn secure_workspace_file(root: &Path, relative: &str) -> Result<PathBuf, String> {
    let candidate = Path::new(relative);
    if relative.is_empty()
        || candidate.is_absolute()
        || candidate.components().any(|part| {
            matches!(
                part,
                std::path::Component::ParentDir
                    | std::path::Component::RootDir
                    | std::path::Component::Prefix(_)
            )
        })
    {
        return Err("依赖文件必须是 Workspace 内的安全相对路径".into());
    }
    let canonical_root = root.canonicalize().map_err(error_string)?;
    let canonical = canonical_root
        .join(candidate)
        .canonicalize()
        .map_err(|_| format!("依赖文件不存在：{relative}"))?;
    if !canonical.starts_with(&canonical_root) || !canonical.is_file() {
        return Err("依赖文件超出 Workspace 边界或不是普通文件".into());
    }
    Ok(canonical)
}

fn sha256_hex(source: &[u8]) -> String {
    format!("{:x}", Sha256::digest(source))
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
        let redacted = redact(
            &format!("created {}", secret_path.display()),
            &[temp.path().to_path_buf()],
        );
        assert_eq!(
            redacted.replace('\\', "/"),
            "created $TENSORNOTE_DATA/managed-environments/example"
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
    fn plans_jupyter_support_without_taking_ownership_of_external_environment() {
        let temp = tempdir().expect("tempdir");
        let manager = LocalRuntimeManager::with_app_data(temp.path().join("app-data"));
        let python = temp.path().join("external/bin/python");
        fs::create_dir_all(python.parent().expect("python parent")).expect("environment");
        fs::write(&python, "").expect("python placeholder");
        let environment_id = "python:external";
        manager
            .environments
            .lock()
            .expect("environment registry")
            .insert(
                environment_id.into(),
                EnvironmentRecord {
                    public: PythonEnvironment {
                        id: environment_id.into(),
                        name: "External Python".into(),
                        manager: "venv".into(),
                        python_version: "3.11".into(),
                        jupyter_installed: false,
                        ipykernel_installed: false,
                        managed: false,
                        kernel_name: None,
                        python_path: python.to_string_lossy().into_owned(),
                        location: temp.path().join("external").to_string_lossy().into_owned(),
                    },
                    python,
                },
            );

        let plan = manager
            .plan_jupyter_support(environment_id)
            .expect("support plan");
        assert_eq!(plan.kind, "jupyter-support");
        assert!(plan.external_environment);
        assert!(plan
            .packages
            .iter()
            .any(|package| package == "jupyter-server"));
        let stored = manager
            .plans
            .lock()
            .expect("plan registry")
            .get(&plan.id)
            .cloned()
            .expect("stored plan");
        assert!(stored.install_only);
        assert!(stored.jupyter_support_only);
        assert_eq!(
            stored.existing_environment_id.as_deref(),
            Some(environment_id)
        );
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

    #[test]
    fn hashes_dependency_files_and_rejects_workspace_traversal() {
        let temp = tempdir().expect("tempdir");
        let requirements = temp.path().join("requirements.txt");
        fs::write(&requirements, "numpy==2.0\n").expect("requirements");
        assert_eq!(
            secure_workspace_file(temp.path(), "requirements.txt").expect("safe"),
            requirements.canonicalize().expect("canonical")
        );
        assert!(secure_workspace_file(temp.path(), "../requirements.txt").is_err());
        assert_eq!(sha256_hex(b"numpy==2.0\n").len(), 64);
    }

    #[test]
    fn accepts_only_requirements_text_files_for_direct_install() {
        assert!(is_requirements_file("chapter/requirements.txt"));
        assert!(is_requirements_file("chapter/requirements-gpu.TXT"));
        assert!(!is_requirements_file("chapter/environment.yml"));
        assert!(!is_requirements_file("chapter/pyproject.toml"));
    }

    #[test]
    fn persists_only_supported_runtime_tool_paths() {
        let temp = tempdir().expect("tempdir");
        let mut tools = HashMap::new();
        tools.insert("conda".into(), PathBuf::from("/example/conda"));
        tools.insert("shell".into(), PathBuf::from("/example/shell"));
        write_selected_tools(temp.path(), &tools).expect("write tools");
        let loaded = read_selected_tools(temp.path());
        assert_eq!(loaded.get("conda"), Some(&PathBuf::from("/example/conda")));
        assert!(!loaded.contains_key("shell"));
    }
}
