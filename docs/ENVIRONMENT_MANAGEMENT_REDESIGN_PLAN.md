# TensorNote 环境管理与 Experiment 依赖体验重构计划

状态：阶段 A–E 已完成，进入 v1.17.0 发行验证  
基线：TensorNote v1.16.1  
更新：2026-09-09

## 1. 背景与目标

当前“计算与 Jupyter”设置页同时展示执行授权、本地运行时探测、环境创建、Jupyter Server 生命周期、Compute Profile、远程连接器和诊断。功能已经存在，但层级混杂，用户很难判断自己应该操作哪一块。

本次重构以用户的运行位置为第一层选择：

1. **本地运行**：计算发生在用户当前电脑。
2. **远程运行**：计算发生在远程机器、JupyterHub 或 Binder。

本地运行再分为：

1. **便捷连接**：TensorNote Desktop 探测或创建 Python 环境，启动受控 Jupyter Server，并自动建立连接。
2. **手动连接**：用户自行启动 Jupyter Server，TensorNote 只连接地址，不管理 Server 生命周期。

主要目标：

- Desktop 能发现终端中已经可用、但 GUI 应用 PATH 中不可见的 Conda。
- 用户能用 Conda 或 uv 创建 Python 3.11 环境，不再受系统 Python 3.9.6 限制。
- 创建前明确显示环境的完整落盘位置、管理器、Python 版本和将安装的基础包。
- 已有环境、托管环境和运行中的 Server 形成一条清晰流程。
- Experiment 页面可把每个声明或检测到的 `requirements*.txt` 安装到当前明确选中的环境。
- 在线 Web、本地 Web、Desktop 只显示自身真实可用的入口。

## 2. 当前实现与问题判断

### 2.1 已有能力

原生运行时已经支持：

- 探测 `uv`、`conda`、`jupyter` 和多个 Python 可执行文件。
- 读取 Conda 环境列表。
- 使用 `uv`、标准库 `venv` 或 Conda 创建 TensorNote 托管环境。
- 在托管环境中安装最小 Jupyter 依赖、注册 Kernel。
- 启动、停止 TensorNote 所有的本地 Jupyter Server。
- 删除 TensorNote 托管环境。
- 为 Project Experiment 创建包含依赖文件摘要的环境准备计划。

因此，“不支持 Conda”不是准确结论。当前问题是探测覆盖、状态解释和交互组织不足。

### 2.2 Python 3.11 无法创建的原因

三种管理器的能力不同：

| 管理器 | Python 版本来源 | 能否在只有 Python 3.9.6 时创建 3.11 |
| --- | --- | --- |
| venv | 已安装的基础 Python | 不能，必须先存在 Python 3.11 |
| uv | uv 解析并获取所选 Python | 可以 |
| Conda | Conda 解析并安装 `python=3.11` | 可以 |

当前界面把“Python 版本”和“基础 Python”并列显示，却没有解释 venv 的版本由基础解释器决定，容易让用户认为选择 3.11 后仍可由 Python 3.9.6 创建。界面还可能在 uv 不可见时直接退回 venv，即使 Conda 已经安装。

### 2.3 Conda 已安装但没有显示的原因

macOS 从 Finder 启动的 `.app` 通常不会加载用户 Shell 的 `.zshrc`、Conda 初始化脚本或终端 PATH。Conda 在终端可用，不代表桌面应用能通过裸命令名找到它。

探测层需要主动检查常见安装位置，并把最终找到的可执行文件路径返回界面：

- `~/miniconda3/bin/conda`
- `~/anaconda3/bin/conda`
- `~/miniforge3/bin/conda`
- `~/mambaforge/bin/conda`
- `/opt/homebrew/bin/conda`
- `/usr/local/bin/conda`
- `/opt/anaconda3/bin/conda`
- `/opt/miniconda3/bin/conda`
- `/opt/miniforge3/bin/conda`
- Windows 的常见 `Scripts/conda.exe`、`condabin/conda.bat` 路径

如果自动探测仍失败，Desktop 应提供“选择 Conda 可执行文件”入口，并将路径作为设备设置保存。它不能写入 Workspace，也不能读取或保存 Conda 凭据。

## 3. 平台功能矩阵

| 功能 | Desktop | 本地 Web | 在线 Web |
| --- | --- | --- | --- |
| 本地运行板块 | 有 | 有 | 无 |
| 本地便捷连接 | 有 | 无 | 无 |
| 探测 Python/uv/Conda | 有 | 无 | 无 |
| 创建/删除托管环境 | 有 | 无 | 无 |
| 启停 TensorNote 所有的 Jupyter | 有 | 无 | 无 |
| 本地手动连接 | 有 | 有 | 无 |
| 远程 Generic Jupyter | 有 | 有 | 有 |
| JupyterHub | 有 | 有 | 有 |
| BinderHub | 有 | 有 | 有 |

“本地 Web”中的本地运行只表示连接 `127.0.0.1` 上由用户自行启动的 Jupyter。浏览器不能获得进程管理能力，也不能伪装成 Desktop 的便捷连接。

在线 Web 只展示远程运行。HTTPS 页面不得引导连接普通 `http://127.0.0.1`，避免混合内容、Origin 和 WebSocket 失败造成误导。

## 4. 设置页信息架构

### 4.1 第一层：运行位置

“计算与 Jupyter”页顶部保留 Workspace 执行授权，其下显示运行位置切换：

- **本地运行**：说明“在这台电脑上运行”。
- **远程运行**：说明“在远程机器或云平台运行”。

在线 Web 不显示切换按钮，直接进入远程运行，并显示当前平台说明。

切换只改变设置板块，不应删除或覆盖已有 Profile。

### 4.2 Desktop 本地运行

按任务顺序排列为两个模式：

#### A. 便捷连接

页面只保留一条主线：

1. 选择已有环境，或点击“新建环境”。
2. 环境可用时点击“启动并连接”。
3. 启动后显示 Server 状态，可停止。
4. TensorNote 托管环境可删除；正在被 Server 或任务使用时禁止删除。

环境列表每行显示：

- 环境名。
- Python 完整版本。
- 管理器：Conda、uv、venv、系统 Python。
- 状态：可直接启动、缺少 Jupyter、正在运行、不可用。
- 简化路径，悬停或详情中显示完整 Python 路径。
- 是否由 TensorNote 管理。

默认只允许“可直接启动”的环境进入主选择框。缺少 Jupyter 的外部环境仍展示，但操作是“查看处理方式”，不能把安装动作伪装成启动。

#### B. 手动连接

折叠为相对次要的独立卡片：

- Server URL。
- Kernel。
- Workspace 路径映射。
- Token。
- Session Scope。
- 连接诊断。
- 连接 / 断开。

文案明确：TensorNote 不启动、不停止这个外部 Server。

### 4.3 本地 Web 的本地运行

只展示“手动连接”，并提供可复制的启动示例。示例必须说明允许的 Origin、Token 与工作目录，但不能把 Token 写进 Workspace 或长期存储。

### 4.4 远程运行

先选择连接类型，再显示对应字段：

- Generic Jupyter。
- JupyterHub。
- BinderHub。

Profile 列表只管理远程连接配置。Desktop 自动创建的 Owned Profile 不应混入远程 Profile 列表。

## 5. 新建环境流程

### 5.1 创建对话框

字段顺序：

1. 环境名称。
2. 管理器。
3. Python 版本。
4. 基础 Python，仅 venv 显示。
5. 创建位置，只读展示。
6. 将安装的基础组件。

管理器选择使用带状态的卡片：

- `uv`：版本、可执行路径、是否可用。
- `Conda`：版本、可执行路径、是否可用。
- `Python venv`：可选基础解释器数量。

不可用的管理器仍可见，并说明原因。Conda 已安装但未找到时提供“重新检测”和“手动选择 Conda”操作。

### 5.2 Python 版本规则

- uv / Conda：允许选择受支持的 3.10、3.11、3.12、3.13 等版本，并在计划阶段验证管理器能否解析。
- venv：Python 版本控件由“基础 Python”推导并只读，禁止形成“选择 3.11、实际使用 3.9”的矛盾计划。
- 默认优先级建议：上次成功使用的管理器 → uv → Conda → venv。
- 不要把最新版本硬编码为永久列表；应由应用维护一个受支持版本范围，并在小版本升级时更新。

### 5.3 环境位置

默认环境继续放在应用数据目录的 `managed-environments/<safe-name>` 下，保持“不写入 Workspace”的现有安全边界。

创建计划必须返回并显示规范化后的完整目标路径。不同平台的实际根目录由 Tauri 路径 API 决定，文档不要硬编码成一个 macOS 路径。

创建确认页显示：

- 完整目标路径。
- 管理器和其可执行路径。
- Python 版本。
- 基础包。
- Project Experiment 依赖文件及 SHA-256 摘要。
- 失败或取消时的清理策略。

### 5.4 外部环境与托管环境

需要严格区分：

- **外部环境**：TensorNote 可使用，但不能删除。向其中安装包必须单独确认。
- **TensorNote 托管环境**：TensorNote 创建，可停止关联 Server 后删除。

删除按钮必须显示完整目标路径，并要求明确确认。任何删除请求都应在原生端再次验证目标位于 TensorNote 托管环境根目录且含合法 marker。

## 6. Experiment 页面依赖安装

### 6.1 文件来源

环境页展示两类依赖文件：

1. Manifest 环境及其 `extends` 链明确声明的文件。
2. 当前 Experiment 工作目录中检测到的 `requirements*.txt`。

自动检测只作为建议。未写入 Manifest 的文件标记为“检测到，未声明”，不能悄悄加入运行计划。作者可继续通过 Manifest 固化正式依赖集合。

首期一键安装只处理 `requirements*.txt`。`environment.yml` 应走 Conda 专用更新计划，`pyproject.toml` 需要另行设计 editable/build isolation 规则，避免用 `pip -r` 错误处理。

### 6.2 用户流程

Experiment 环境页增加“依赖文件”卡片：

- 每个 `requirements*.txt` 单独一行。
- 显示相对路径、来源环境、继承关系、是否存在、文件大小。
- 提供“安装到当前环境”按钮。
- 支持多选后“安装所选文件”。

顶部必须先选择目标环境。按钮文案包含环境名，例如“安装到 `happy-llm-py311`”。没有目标环境时按钮禁用并提示先选择。

### 6.3 安装计划与执行边界

依赖安装必须复用 Host Adapter 的受控计划，而不是由 React 拼接 Shell 命令。建议新增：

```ts
interface DependencyInstallPlanRequest {
  workspaceId: string
  environmentId: string
  dependencyFiles: string[]
  manifestPath: string
  manifestDigest: string
  revision?: string
}
```

计划返回：

- 目标环境 ID、名称、Python 路径和管理器。
- 每个文件的相对路径、大小和 SHA-256。
- 将调用的安装器类型。
- 确认短语和过期时间。

应用计划前，原生端重新验证：

- Workspace 授权根目录。
- 所有相对路径没有越界。
- Manifest 和依赖文件摘要未变化。
- 目标环境仍存在且不是正在删除的环境。
- 当前 Workspace 执行已授权。
- GitHub 内容仍满足固定 Revision trust；GitHub 只读 Workspace 不能调用本机安装。

执行使用参数数组调用目标环境的 Python，不接受 Manifest 提供 Shell 字符串。日志需脱敏并限制长度。

### 6.4 安装到外部环境

外部环境属于用户，安装依赖可能改变既有项目。首次对外部环境安装时应使用更明确的确认语，并显示：

“此环境不是 TensorNote 创建的。安装会修改该环境；TensorNote 无法自动回滚。”

托管环境安装失败时保留环境本身并报告部分安装状态，不能删除一个已经存在且可能有其他用途的环境。只有“新建环境”流程失败时才清理未完成目录。

### 6.5 与运行页共享选择

环境页选择的“当前环境”与运行页必须共享同一个 Experiment 级状态。用户安装依赖后进入“运行”，不应再次猜测或切换到另一个环境。

## 7. 原生探测与接口调整

### 7.1 Discovery 返回信息

建议在兼容的可选字段中增加：

```ts
interface RuntimeTool {
  executablePath?: string
  source?: 'path' | 'common-location' | 'user-selected'
}

interface PythonEnvironment {
  pythonPath?: string
  location?: string
}

interface RuntimeDiscovery {
  managedEnvironmentRoot?: string
  managerDiagnostics?: Array<{
    kind: 'uv' | 'conda' | 'venv'
    status: 'available' | 'missing' | 'error'
    detail: string
  }>
}
```

这些字段均为可选，保持 Host API v1 向后兼容。

### 7.2 用户选择的工具路径

新增设备级设置：

- `runtime.condaExecutable`
- 后续可扩展 `runtime.uvExecutable`

原生端使用前必须验证文件存在、是允许的可执行文件，并通过受限版本命令确认类型。界面不能允许任意额外参数。

### 7.3 探测顺序

1. 用户保存的显式路径。
2. 当前进程 PATH。
3. 平台常见安装目录。
4. Workspace 内 `.venv` / `venv`。
5. Conda `env list --json`。
6. TensorNote 托管环境 marker。

探测结果按稳定规则去重，保留真实管理器来源。Conda 环境不能统一标为普通 `python`。

## 8. 状态、错误与文案

界面使用用户可行动的状态：

- “已找到 Conda 24.x”。
- “Conda 已安装，但 TensorNote 尚未找到它；重新检测或选择可执行文件”。
- “venv 需要已安装的 Python 3.11；改用 Conda/uv 可自动创建”。
- “环境创建于：完整路径”。
- “Jupyter 未安装，暂时不能启动”。
- “Server 由 TensorNote 管理，退出应用时会停止”。
- “手动连接的 Server 由你管理，断开不会停止它”。

不要只显示工具数量、Python 数量或通用“检测失败”，这些信息不能帮助用户完成下一步。

## 9. 分阶段开发建议

### 阶段 A：探测与契约

- 扩展 Conda 常见路径探测。
- 返回工具、Python、托管根目录的可解释路径信息。
- 修正 Conda 环境来源识别。
- 支持用户选择 Conda 可执行文件。
- 增加原生单元测试：PATH 缺失、常见路径、显式路径、Conda JSON、去重。

完成标准：已安装 Conda 的 macOS Desktop 即使从 Finder 启动也能检测；检测失败时能手动选择。

### 阶段 B：设置页信息架构

- 增加本地/远程切换。
- 按平台隐藏不可能的入口。
- Desktop 本地页拆成便捷连接和手动连接。
- 分离 Owned Profile 与远程 Profile。
- 重做环境列表、状态和 Server 控制。

完成标准：用户不阅读手册也能从“选择环境”走到“启动并连接”，且能判断 Server 所有权。

### 阶段 C：创建环境

- 重做创建对话框。
- venv 的版本随基础 Python 联动。
- Conda/uv 支持 Python 3.11。
- 创建前显示完整路径与计划。
- 完成后自动选中新环境并允许一键启动。

完成标准：只有系统 Python 3.9.6、但已安装 Conda 的用户可创建并启动 Python 3.11 环境。

### 阶段 D：Experiment 依赖安装

- 增加 Experiment 级目标环境选择。
- 列出声明与检测到的 `requirements*.txt`。
- 新增依赖安装计划接口。
- 支持单文件和多文件安装。
- 处理外部环境警告、摘要变化、取消和部分失败。

完成标准：用户可明确选择一个 Python 3.11 环境，将某个 `requirements.txt` 安装进去，再用同一环境运行预设。

### 阶段 E：文档与跨平台验收

- 更新中英文用户指南、平台契约和发行说明。
- 录制或截图三种发行形态的真实界面。
- 验证 macOS Finder 启动、Windows 普通启动、Linux desktop file 启动。
- 验证在线 Web 不显示本地管理入口，本地 Web 不显示便捷连接。

## 10. 必要测试范围

保持测试集中在高风险边界：

- Conda 常见路径与显式路径探测。
- venv 版本一致性。
- 管理器优先级。
- 环境目标路径限制和删除保护。
- 依赖文件越界、摘要变化、计划过期。
- 已存在环境安装失败时不得删除环境。
- 新建环境失败时清理未完成目录。
- 三种部署形态的入口矩阵。
- Owned Server 启停与 Profile 生命周期。

视觉验收至少覆盖浅色、深色、窄窗口和设置弹窗内滚动，避免信息重排后出现控件溢出。

## 11. 不在本轮范围

- TensorNote 自动安装 Conda、uv 或系统 Python。
- 任意 Shell 命令执行。
- 自动修改用户 Shell 配置。
- 自动处理所有 `pyproject.toml`、Poetry、PDM、Docker 或 CUDA 环境。
- 在线 Web 直接管理用户本机进程。
- 自动回滚外部环境中已经安装或升级的包。

## 12. 交付原则

- Markdown、Assets 和 `tensornote.yaml` 仍是 Workspace 可移植事实来源。
- 环境路径、工具路径和 Token 属于设备设置，不写入 Workspace。
- UI 通过 Host/Compute 能力判断展示入口，不按组件内部硬编码平台旁路。
- 所有安装和进程操作都由原生受限接口执行，先计划、后确认、再执行。
- 保持 ComputeProvider v1、ComputeConnector v1 和 Workspace Schema v1 兼容。
