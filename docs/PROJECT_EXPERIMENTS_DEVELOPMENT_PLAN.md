# TensorNote 项目实验系统开发计划

> 状态：全部阶段已完成（TensorNote v1.7.0–v1.16.0）
> 基线：TensorNote v1.6.4  
> 目标：在保留现有笔记内 Inline Lab 的同时，为依赖安装、多文件脚本、Notebook、训练任务和产物管理增加 Project Experiment。  
> 首个试点：`happy-llm-tensornote` 第 5～6 章。

## 完成记录

阶段 0～9 已按顺序完成并分别发布。v1.7.0 固化契约；v1.8.2 完成解析索引；v1.9.0 提供只读界面；v1.10.0 完成环境准备；v1.11.0 完成桌面 Job Runner；v1.12.0 增加 Notebook、torchrun、资源与长任务体验；v1.13.0 提供 Web/Jupyter 子集；v1.14.0 提供固定 Revision Binder 引导；v1.15.0 完成 Skill 与 Happy-LLM 迁移；v1.16.0 完成双语文档、平台边界、快照与稳定发布收尾。

## 1. 背景与问题

TensorNote 当前的可执行能力以 Markdown 内的 `python exec` Cell 为中心。同一 `lab` 的 Cell 共享 Jupyter Kernel，适合概念演示、数据变换、小型可视化和短代码练习。

这种模型不适合下列课程内容：

- 一个实验包含多个 `.py`、`.ipynb`、配置文件和数据文件；
- 不同实验需要不同依赖，不能把所有包塞进一个庞大的 `requirements.txt`；
- 任务需要工作目录、命令参数、环境变量名、GPU 数量、前置步骤和输出目录；
- 训练持续时间较长，需要日志、取消、失败恢复和产物查看；
- 实验需要 `python -m`、`torchrun` 或 Notebook，而不是单个 Jupyter Cell；
- 在线版、本地 Web 版和桌面版的运行能力不同。

因此需要明确区分两种产品对象：

| 对象 | 适用内容 | 执行单元 | 典型入口 |
| --- | --- | --- | --- |
| Inline Lab | 第 1～4 章的概念、公式、短代码 | 笔记内 Python Cell | 笔记中的 Lab Card / Lab Drawer |
| Project Experiment | 第 5～6 章的多脚本实践、训练和导出 | Workspace 文件、受控步骤和产物 | 笔记中的 Experiment Card / 独立实验页 |

现有 Inline Lab 语法、Compute Provider v1、Workspace Schema v1 和已有知识库必须继续可用。

## 2. 产品目标

### 2.1 必须完成

1. 笔记可以引用一个 Workspace 内的实验清单文件。
2. TensorNote 可以解析、校验、索引并展示实验，而不执行任何代码。
3. 用户可以看到环境要求、依赖来源、预计资源、步骤、参数和产物。
4. 桌面版可以在用户确认后创建隔离环境、安装依赖、运行多脚本任务、显示日志、取消任务并打开产物。
5. 本地 Web 版可以通过 Jupyter 运行能力明确的实验子集，并对不支持的步骤给出可操作说明。
6. GitHub Pages 在线版可以安全阅读实验，连接兼容的远程 Jupyter，或跳转到固定 Revision 的 Binder 环境。
7. 所有执行继续受 Workspace 执行授权、GitHub commit trust、Provider 能力和 Host 能力约束。
8. 环境、缓存、日志和 Secret 不污染 Markdown 源文件；需要纳入版本管理的配置和产物必须由清单明确声明。
9. 为知识库智能体提供同一套格式、模板和确定性校验器，避免产生第二种私有格式。

### 2.2 首版不做

- 不实现公共 GPU、云端训练集群或 TensorNote 托管计算服务。
- 不把 Git clone、push、pull、凭据管理混入实验系统。
- 不允许清单内出现任意 Shell 命令字符串。
- 不自动安装依赖、自动下载模型或自动开始训练。
- 不承诺在线版可以运行任意本地仓库脚本。
- 不实现容器编排、Slurm、Kubernetes、多机训练或工作流市场。
- 不把 `.venv`、Conda 环境、模型缓存、Token 或运行历史写入知识库 Git。

## 3. 已确定的设计决策

以下决策作为开发约束，除非先修改本计划并记录原因，否则实现者不得自行改变：

1. **两种实验模型并存。** Inline Lab 继续服务短代码；Project Experiment 负责多文件项目。
2. **清单独立于 `tensornote.yaml`。** 实验使用独立的 `tensornote.experiment.yaml`，不提升 Workspace Schema v1。
3. **Markdown 只保存引用。** 笔记使用 `tensornote-experiment` Fence 引用清单和预设。
4. **桌面优先。** 完整的环境与进程能力先在 Desktop 实现，再为 Web 提供受能力约束的子集。
5. **依赖分组。** 一个项目可以有 `base`、`tokenizer`、`training`、`distributed` 等环境配置；界面不把安装依赖伪装成普通代码 Cell。
6. **先预览再变更。** 安装计划、下载、脚本执行和工作区写入必须先显示来源、目标和影响，再由用户确认。
7. **结构化运行器。** 参数以字符串数组保存；不拼接 Shell 命令。脚本路径必须是 Workspace 相对路径。
8. **运行状态是本机状态。** Job、日志、环境指纹和信任记录保存在应用数据目录；清单仍是可移植数据源。
9. **GitHub 运行绑定 commit SHA。** 分支只用于首次解析；执行与 Binder 跳转使用完整 Revision。
10. **旧版本自然降级。** 不认识新 Fence 的旧版将其显示为普通代码块；它仍能阅读其他 Markdown。

## 4. 用户流程

### 4.1 从笔记进入实验

1. 用户阅读笔记，看到 Experiment Card。
2. Card 显示实验名称、预设、难度、预计耗时、CPU/GPU、依赖状态和当前平台支持度。
3. 用户点击“打开实验”，进入独立实验页；不能运行时仍可查看文件、步骤和说明。
4. 首次运行先进入“环境”页，TensorNote 进行只读检测。
5. 若环境缺失，TensorNote 生成安装计划，列出 Python 版本、环境目录、依赖文件、拟执行动作和可能下载量。
6. 用户确认后才创建或更新环境。
7. 用户选择预设，检查参数和步骤，点击运行。
8. 运行页实时显示步骤、日志、耗时、状态和取消按钮。
9. 成功后在产物页展示声明的文件；失败时定位到具体步骤，并保留可复制的脱敏诊断。

### 4.2 平台体验

#### Desktop

- 打开本地 Workspace 后即可发现实验。
- 应用负责环境发现、创建隔离环境、依赖安装、进程启动、日志和取消。
- 用户无需另开 Vite、Git Bridge 或 Jupyter；Inline Lab 仍可使用应用启动的 Jupyter。
- 进程退出后保留历史摘要；应用重启后把遗留的 `running` Job 标为 `interrupted`。

#### Local Web

- 阅读和编辑清单与桌面版一致。
- Inline Lab 与可转换为 Jupyter 执行的 Python/Notebook 步骤可运行。
- 只有当 Jupyter Server 能访问同一 Workspace 路径时，才允许运行引用文件的步骤；诊断必须验证路径映射。
- 原生进程、`torchrun`、任意脚本执行和本机环境创建显示为“需要桌面版”或“连接支持该能力的远程运行器”。
- Git Bridge 仍只负责 Git，不承担实验执行。

#### Static Web / GitHub Pages

- 默认安全阅读清单、源文件和运行说明。
- 对固定 GitHub Revision，可提供“在 Binder 打开”，并把仓库、Revision 和入口文件传给现有 Binder Connector。
- Direct Jupyter / JupyterHub 只有在 HTTPS、CORS、WebSocket、认证、路径映射和信任诊断通过后才显示运行入口。
- 不暗示浏览器能访问用户的本地文件或自动使用作者的计算资源。

## 5. 内容格式

### 5.1 笔记引用语法

````markdown
```tensornote-experiment
manifest: ./code/tensornote.experiment.yaml
preset: tokenizer-cpu
```
````

规则：

- `manifest` 相对于当前笔记目录解析。
- `preset` 可省略；省略时使用清单的 `defaultPreset`。
- 引用必须留在 Workspace 内，不接受绝对路径、URL、空路径或 `..` 逃逸。
- 一个笔记可引用多个实验；同一清单也可被多篇笔记引用。
- Fence 内只允许声明字段，禁止 Secret、命令和环境变量值。

### 5.2 Experiment Manifest v1

推荐文件名为 `tensornote.experiment.yaml`。完整示例：

```yaml
schemaVersion: 1

experiment:
  id: happy-llm-chapter5
  title: 第五章：从零训练语言模型
  description: 训练 Tokenizer、执行小规模预训练并导出模型
  workingDirectory: .
  difficulty: heavy
  estimatedMinutes: 45

resources:
  cpu: 4
  memoryGB: 8
  gpu:
    optional: true
    count: 1
    memoryGB: 8
  diskGB: 12

environments:
  base:
    python: '3.11'
    files:
      - requirements-base.txt
  tokenizer:
    extends: base
    files:
      - requirements-tokenizer.txt
  training:
    extends: base
    files:
      - requirements-training.txt
  distributed:
    extends: training
    files:
      - requirements-distributed.txt

presets:
  tokenizer-cpu:
    title: CPU 训练 Tokenizer
    environment: tokenizer
    steps:
      - prepare-dataset
      - train-tokenizer
    parameters:
      vocab-size: '6400'
  pretrain-smoke:
    title: 单卡小规模预训练
    environment: training
    steps:
      - prepare-dataset
      - pretrain-smoke
    parameters:
      epochs: '1'

defaultPreset: tokenizer-cpu

parameters:
  vocab-size:
    type: integer
    label: Vocabulary size
    default: 6400
    minimum: 512
    maximum: 32000
  epochs:
    type: integer
    label: Epochs
    default: 1
    minimum: 1
    maximum: 100

steps:
  prepare-dataset:
    title: 准备数据集
    runner: python
    file: deal_dataset.py
    args:
      - --output
      - data/processed
    outputs:
      - data/processed
  train-tokenizer:
    title: 训练 Tokenizer
    runner: python
    file: train_tokenizer.py
    args:
      - --vocab-size
      - '${parameters.vocab-size}'
    dependsOn:
      - prepare-dataset
    outputs:
      - tokenizer_k
  pretrain-smoke:
    title: 执行小规模预训练
    runner: python
    file: ddp_pretrain.py
    args:
      - --epochs
      - '${parameters.epochs}'
    dependsOn:
      - prepare-dataset
    outputs:
      - out

artifacts:
  tokenizer:
    title: Tokenizer
    path: tokenizer_k
    kind: directory
  checkpoints:
    title: Checkpoints
    path: out
    kind: directory
```

### 5.3 v1 字段约束

#### 顶层

- `schemaVersion`：必须为整数 `1`。
- `experiment`：必填元数据。
- `resources`：可选提示信息，不用于绕过系统限制。
- `environments`：至少一个环境。
- `presets`：至少一个可运行预设。
- `defaultPreset`：必须引用存在的预设。
- `parameters`：可选参数定义。
- `steps`：至少一个结构化步骤。
- `artifacts`：可选产物声明。

#### ID 和路径

- ID 使用小写 kebab-case，在当前清单内唯一。
- 所有路径使用 `/`、相对清单所在目录解析、规范化后仍须位于 Workspace 内。
- 文件必须存在；输出可在运行前不存在，但其父目录必须仍在 Workspace 内。
- 禁止绝对路径、`~`、Windows 盘符、UNC 路径、空字节和 `..` 逃逸。
- 符号链接解析后若离开 Workspace，视为不安全并拒绝运行。

#### 环境

- v1 支持 `requirements*.txt`、`pyproject.toml`、`uv.lock` 和 `environment.yml` 的检测与展示。
- Desktop v1 的自动创建以 `venv + pip` 为可靠基线；检测到 `uv` 时可提供 `uv` 加速选项。
- Conda 清单首版只做检测和说明；自动创建放到后续兼容阶段，除非现有 Runtime Assistant 已完整支持。
- `extends` 必须形成无环继承链。合并顺序从父到子，重复文件只保留一次。
- 安装必须使用清单文件，不接受 UI 直接拼接任意包名作为已信任计划。

#### 参数

- v1 支持 `string`、`integer`、`number`、`boolean`、`enum` 和 Workspace 相对路径。
- 参数替换只发生在 `args` 的完整数组元素或明确模板段中；替换后仍作为一个 argv 参数传递。
- 参数必须经过类型、范围、枚举和路径校验。
- Secret 只能声明引用名，例如 `secretRef: huggingface-token`；值来自 Secret Store 或当前会话，绝不写入清单、URL和日志。

#### 步骤运行器

首个稳定版支持：

| Runner | 含义 | Desktop | Local Web / Remote Jupyter | Online |
| --- | --- | --- | --- | --- |
| `python` | `python <file> <args>` | 完整 | 路径映射通过后支持 | 取决于远程环境 |
| `python-module` | `python -m <module> <args>` | 完整 | 支持 | 取决于远程环境 |
| `notebook` | 运行或打开 `.ipynb` | 执行与查看 | 执行与查看 | Binder/远程 Jupyter |
| `torchrun` | 结构化分布式启动 | 完整 | 首版不支持 | 首版不支持 |

`shell-script`、裸 `command` 和命令字符串不进入首个稳定版。确需运行仓库已有下载脚本时，先提供等价 Python 步骤，或在后续 RFC 中增加受控脚本运行器。

#### 步骤图

- `dependsOn` 形成有向无环图；解析时拒绝循环和不存在的依赖。
- 一个预设引用的步骤按拓扑顺序执行。
- 首版串行执行，避免隐藏资源竞争；并行执行另行设计。
- 某一步失败后，依赖它的步骤标记为 `blocked`，不自动继续。
- 重试默认从失败步骤开始，但前置步骤必须仍有有效输出指纹；否则提示从头运行。

## 6. 架构方案

### 6.1 模块边界

建议新增以下模块；实际文件名可按项目习惯微调，但职责不能混合：

```text
src/experiments/
├── types.ts                 # Manifest、Preset、Step、Job 公共类型
├── schema.ts                # YAML 解析、版本兼容和确定性校验
├── referenceParser.ts       # Markdown Fence 引用解析
├── resolver.ts              # 路径、引用、继承、参数和步骤图解析
├── indexer.ts               # Workspace 实验索引
├── capabilities.ts          # Host + Provider + trust 能力判定
├── permissions.ts           # 执行授权和 GitHub Revision trust
├── environment.ts           # 环境指纹与依赖计划
├── jobs.ts                  # 状态机、事件与持久化模型
├── runner.ts                # ExperimentRunner 接口
├── jupyterRunner.ts         # Web/Jupyter 子集
└── validation.ts            # 面向 UI 与 CLI 的诊断

src/components/experiments/
├── ExperimentCard.tsx
├── ExperimentPage.tsx
├── EnvironmentPanel.tsx
├── StepsPanel.tsx
├── FilesPanel.tsx
├── RunPanel.tsx
├── ArtifactsPanel.tsx
└── ExperimentStatus.tsx

src-tauri/src/
└── experiment_runtime.rs    # Desktop 计划、进程、日志、取消和恢复
```

不得把项目实验塞进 `LabDrawer`，也不得让 React 组件直接调用 Tauri Command。调用链应为：

```text
UI → Experiment service/runtime → ExperimentRunner → HostAdapter / ComputeProvider
```

### 6.2 公共契约策略

- Phase 1～2 先把新模块视为内部 API，不修改 `src/platform/index.ts`。
- 清单、状态机和安全模型稳定后，再通过单独契约审查决定是否导出 `EXPERIMENT_MANIFEST_VERSION` 与只读类型。
- 不给 `ComputeProvider v1` 强加进程、文件同步或环境安装方法。
- 新建 `ExperimentRunner`，以 capability 描述 `python`、`notebook`、`torchrun`、环境准备、取消、产物访问等能力。
- Desktop 实现由 HostAdapter 的可选能力承载；Web 实现组合现有 Compute Connector 与 Jupyter Provider。
- UI 只读取 capability，不按 `desktop`、`web` 或具体 Provider 名称硬编码主要流程。

建议接口形状：

```ts
interface ExperimentRunnerCapabilities {
  runners: Array<'python' | 'python-module' | 'notebook' | 'torchrun'>
  environmentInspection: boolean
  environmentMutation: boolean
  processCancellation: boolean
  artifactAccess: boolean
  persistentJobs: boolean
}

interface ExperimentRunner {
  readonly id: string
  readonly capabilities: ExperimentRunnerCapabilities
  inspectEnvironment(request: EnvironmentInspectionRequest): Promise<EnvironmentInspection>
  planEnvironment(request: EnvironmentPlanRequest): Promise<ExperimentEnvironmentPlan>
  applyEnvironment(planId: string, confirmation: string): Promise<ExperimentOperation>
  start(request: ExperimentStartRequest): Promise<ExperimentJob>
  getJob(jobId: string): Promise<ExperimentJob>
  cancel(jobId: string): Promise<ExperimentJob>
  subscribe(jobId: string, handler: (event: ExperimentJobEvent) => void): () => void
}
```

最终接口要使用项目实际命名，并在实现前写测试固定关键行为。

### 6.3 Job 状态机

Job 顶层状态：

```text
draft → checking → awaiting-confirmation → preparing → queued → running
running → succeeded | failed | cancelled | interrupted
```

Step 状态：

```text
pending → ready → running → succeeded | failed | cancelled | blocked | skipped
```

约束：

- 状态转换集中在一个纯函数或 reducer 中；UI 和 Tauri 不能各自定义规则。
- 每个事件含单调递增序号、时间、Job ID、Step ID、事件类型和脱敏内容。
- 取消先发送温和终止，超时后再终止进程树；结果必须区分用户取消和运行失败。
- 应用退出或崩溃后，未能重新附着的 Job 标为 `interrupted`。
- 日志按大小轮换并限制 UI 内存；保留完整文件与最近窗口，不能无限增长。

### 6.4 环境与缓存

Desktop 环境默认放在应用数据目录的 Experiment Runtime Root，以 Workspace ID、环境定义摘要和平台组成键。不得默认在知识库中创建 `.venv`。

环境指纹至少包含：

- Manifest schema 版本；
- Python 主次版本；
- 依赖文件的内容摘要；
- 平台、架构和环境管理器；
- TensorNote Runtime 版本；
- 可选的 GPU/CUDA 能力摘要。

依赖文件变化时环境显示为 `stale`。用户可以查看差异、更新或创建新环境。首版不自动删除旧环境，设置页提供带体积统计的清理入口。

### 6.5 文件与产物

- 清单和输入文件只读解析，不在索引阶段执行。
- 默认运行工作目录是清单所在目录或 `experiment.workingDirectory`。
- 未声明的输出仍属于 Workspace 文件，但不进入“产物”页。
- 产物支持文件、目录、图片、JSON、CSV、Markdown、Notebook 和模型目录的基础展示。
- 删除、覆盖已有文件或写入 Workspace 前，运行计划要显示写入范围。
- 大模型、数据集和缓存应默认进入用户缓存目录；知识库只保存下载说明、校验值和相对引用。

## 7. 安全与信任模型

Project Experiment 比 Inline Lab 权限更高，必须同时满足：

1. Workspace Schema 不是未来版本的只读降级状态；
2. Workspace 或当前设备明确允许执行；
3. GitHub Workspace 已信任当前完整 commit SHA；
4. 当前 Host / Runner 声明支持所有步骤；
5. 环境计划已由用户确认；
6. 运行计划展示输入、参数、依赖和写入范围后由用户启动。

实现必须防止：

- 路径穿越与符号链接逃逸；
- 参数注入和 Shell 拼接；
- 依赖清单替换后继续使用旧确认；
- 分支更新后沿用旧 commit trust；
- 日志泄露 Token、Cookie、Authorization Header、Secret 和环境变量值；
- Renderer 直接启动系统进程；
- 子进程脱离取消控制；
- 恶意脚本造成无限日志、磁盘写满或进程风暴；
- 在线页面借用作者凭据或未经同意连接本机服务。

清单中的 URL、包名和文件内容均视为不受信任数据。依赖安装确认绑定 Manifest、依赖文件内容、目标环境和 Revision 的摘要；任一项变化都必须重新确认。

## 8. 分阶段实施计划

每个阶段应单独提交，可独立回退。实现者必须在开始下一阶段前满足本阶段退出条件。

### 阶段 0：RFC、样例和验收基线

**目标：** 在写运行代码前冻结格式与安全边界。

工作项：

- 将本计划转为正式 RFC，补充 JSON Schema 或等价的确定性字段定义。
- 建立最小合法、完整合法和各类非法 Manifest fixtures。
- 建立含一个 Experiment Fence 的 Markdown fixture。
- 记录 Desktop、Local Web、Pages 的能力矩阵和错误文案原则。
- 为 Happy-LLM 第 5～6 章列出脚本、输入、输出、依赖和资源清单。
- 决定 v1 中 Notebook 的语义：原地执行副本还是执行到 Runtime 临时目录；推荐在 Runtime 临时目录执行并显式导出产物。

交付物：

- Manifest v1 RFC；
- Schema fixtures；
- Happy-LLM 迁移表；
- 威胁模型检查表；
- 更新后的 Host Feature Matrix 草案。

退出条件：所有必填字段、路径规则、Runner 和降级行为无歧义；没有任意命令字符串字段。

### 阶段 1：只读解析、校验和索引

**目标：** 所有平台都能安全发现和理解实验。

工作项：

- 实现 Fence 解析器，返回引用位置、清单路径和预设。
- 实现 Manifest YAML 解析、版本兼容、字段校验和诊断。
- 实现路径解析、环境继承、参数验证和步骤 DAG 校验。
- 将实验引用加入 Note / Workspace 派生索引，但不执行文件。
- 对不存在、无权限、未来版本和非法清单提供精确错误。
- 扩展 Workspace validator，验证清单及所有引用。
- 更新知识库 Skill 的格式参考、模板和 validator 路由。

建议测试：

- 合法最小清单与完整清单；
- 相对路径、中文路径、空格、大小写和不同分隔符；
- 绝对路径、`..`、符号链接逃逸和不存在文件；
- 环境继承循环、步骤循环、重复 ID 和坏参数；
- 未来 Manifest 只读展示；
- 旧 Markdown 和 Inline Lab 解析结果不变。

退出条件：fixtures 与现有 Workspace 均可确定性校验；解析过程没有进程、网络或写文件副作用。

### 阶段 2：只读产品界面

**目标：** 用户在不能运行时也能完整理解实验。

工作项：

- Markdown Renderer 将引用渲染为 Experiment Card。
- 增加独立实验页及 Environment、Steps、Files、Run、Artifacts 五个页签。
- 展示平台支持度、执行授权、Revision trust 和环境状态。
- 支持从实验页打开 Workspace 文件；写权限仍由 Provider capability 决定。
- 增加加载、空、无效、缺失、只读、不支持和权限不足状态。
- 在窄屏中使用单栏和底部操作区；日志区保持可读且不覆盖正文。
- 增加命令面板入口与键盘焦点管理。

验收场景：

- Desktop、本地 Web、Pages 打开同一仓库时看到一致的实验信息。
- Pages 明确显示“只读查看 / 连接远程环境 / Binder”可用项。
- 无效 Manifest 不造成整篇笔记或 Workspace 崩溃。
- Inline Lab Card 和现有阅读、编辑、双栏、Outline 不回归。

退出条件：无需执行权限即可完成实验发现、理解和导航。

### 阶段 3：Desktop 环境检查与准备

**目标：** 桌面版能以可审计方式准备隔离环境。

工作项：

- 扩展现有 Local Runtime Assistant 的内部能力，使计划可以引用经过校验的依赖文件。
- 新增环境检查、指纹、缺失依赖、过期和磁盘占用模型。
- 新增“检查 → 计划 → 确认 → 应用 → 日志 → 完成/取消”流程。
- Tauri 端只接收结构化计划 ID，不接收 Renderer 拼出的命令。
- 固定 Python 可执行文件、目标目录和依赖摘要；应用前再次核验。
- 支持 `venv + pip`；若 `uv` 可用，可作为同等语义的加速实现。
- 增加环境清理页，不删除当前运行中或被 Job 引用的环境。

安全测试：

- 计划过期、文件变化、Revision 变化时拒绝应用；
- 取消安装能终止子进程并留下可诊断状态；
- 包安装输出脱敏；
- 恶意路径和参数无法进入系统命令；
- 应用数据目录与 Workspace 清晰隔离。

退出条件：Happy-LLM 的一个轻量依赖配置可在全新 Desktop 安装中完成检查和创建；没有静默安装。

### 阶段 4：Desktop 多脚本 Job Runner

**目标：** 桌面版可靠运行 `python` 与 `python-module` 步骤。

工作项：

- 实现 ExperimentRunner、Job 状态机、事件流和持久化。
- Tauri 使用 argv 数组和固定环境 Python 启动子进程。
- 实现工作目录、参数替换、stdout/stderr、日志限流、取消和进程树清理。
- 串行执行 DAG；失败后正确阻塞依赖步骤。
- 支持重新运行全部、重试失败步骤和清空本机历史。
- 运行前显示脚本、参数、环境、资源和写入范围。
- 实现产物索引和“在 Finder/资源管理器中显示”。

关键集成测试：

- 成功的两步骤任务；
- 第一步失败、第二步 blocked；
- 用户取消长任务；
- 大量日志不会冻结 UI；
- 应用重启后 Job 状态正确恢复为 interrupted；
- 带中文、空格的 Workspace 路径可执行；
- Workspace 文件变化后旧运行计划失效。

退出条件：Happy-LLM Tokenizer CPU smoke preset 可从环境准备运行到产物查看，且取消和失败路径可用。

### 阶段 5：Notebook、torchrun 与训练体验

**目标：** 覆盖 Happy-LLM 第 5～6 章的主要实践形态。

工作项：

- 实现 Notebook Runner，保留原 Notebook，输出执行副本与日志。
- 实现结构化 `torchrun`：脚本、进程数、节点参数和 argv 分字段传入。
- 检测 GPU、CUDA、内存和磁盘，资源不足时阻止明显不可能的预设或要求用户明确继续。
- 支持 smoke、CPU、单 GPU、分布式等预设；默认推荐最轻可验证路径。
- 为长任务增加阶段进度、最近日志、运行时长和系统休眠提示。
- 产物支持 checkpoint、指标 JSON/CSV、图片与 Notebook 快速查看。
- 明确模型/数据下载来源、大小、缓存位置和校验方式。

退出条件：Happy-LLM 第 5～6 章各至少一个 smoke preset 稳定运行；重型训练预设完成计划与启动验证，不要求发布门中完成长时间训练。

### 阶段 6：Local Web / Remote Jupyter 子集

**目标：** Web 用户在能力允许时运行安全子集，并获得明确引导。

工作项：

- 为 Jupyter Runner 定义文件存在与 Workspace 路径映射诊断。
- 将 `python` / `python-module` 转换为不使用 Shell 的 Kernel 执行包装器。
- Notebook 使用 Jupyter API 或 Kernel 逐 Cell 执行；失败定位到 Notebook Cell。
- 环境安装只在远程服务明确支持且用户确认时开放；首版可只显示安装命令与文档，不代执行。
- 不支持 `torchrun` 时给出“桌面版运行”“在远程环境手动运行”和“选择兼容预设”。
- Git Bridge 入口和实验 Runner 保持独立。

退出条件：本地 Web + 同机 Jupyter 能运行一个 Python smoke 实验；错误的路径映射会在运行前被发现。

### 阶段 7：GitHub Pages 与 Binder 引导

**目标：** 分享链接的访问者可阅读实验并进入可复现的在线环境。

工作项：

- 使用当前 Workspace 已解析的 owner/repo/full commit SHA 构建 Binder 请求。
- 检查仓库是否存在 Binder 可识别的环境入口和 Notebook。
- Experiment Card 显示 Binder 的临时性、构建时间、资源限制和数据持久性。
- Binder 构建失败时保留阅读体验和诊断，不陷入循环重试。
- 分享链接继续固定 Revision；不得把 Token、Profile 或执行授权放入 URL。
- 为没有 Binder 配置的项目提供“下载桌面版 / 克隆仓库 / 查看配置指南”。

退出条件：固定 Revision 的公开示例可以从 TensorNote Pages 跳转到正确 Binder 环境；不可运行时仍完整可读。

### 阶段 8：知识库 Skill 与 Happy-LLM 试点迁移

**目标：** 让智能体可按规范创建、更新和维护项目实验。

工作项：

- 更新 `skills/tensornote-knowledge-workspace/SKILL.md` 的 reference routing。
- 新增 `references/project-experiments.md`，完整描述格式、选择规则、安全和审查清单。
- 新增最小与完整 Manifest 模板。
- Validator 校验 Manifest、Fence、依赖文件、脚本、Preset、DAG 和产物路径。
- `quick_validate.py` 覆盖新 reference 与模板结构。
- 为智能体增加明确决策：短代码用 Inline Lab，多脚本/重依赖/长任务用 Project Experiment。
- 迁移 Happy-LLM 时保留原脚本语义，先增加清单和依赖拆分，再做必要的小型 CLI 参数适配。

Happy-LLM 推荐拆分：

| 章节 | 保留/新增 | 推荐预设 |
| --- | --- | --- |
| 1～4 | 继续 Inline Lab，必要时增加小型 Cell | `basic-cpu` |
| 5 | Project Experiment | `tokenizer-cpu`、`model-smoke`、`pretrain-single`、`pretrain-ddp`、`sft-full`、`export-model` |
| 6 | Project Experiment | `download-assets`、`process-dataset`、`pretrain-smoke`、`finetune-single`、`finetune-deepspeed` |

依赖建议拆为：

```text
requirements-base.txt
requirements-tokenizer.txt
requirements-training.txt
requirements-distributed.txt
requirements-notebook.txt
```

要求：

- 公共基础包放 `base`，其余配置通过 `extends` 组合；
- GPU/CUDA 相关依赖在文档中说明支持矩阵，不盲目固定跨平台 wheel；
- 下载步骤必须写明来源、许可、预计大小和缓存位置；
- 每个重型预设都有轻量 smoke 版本；
- 依赖版本逐步锁定，避免一次迁移改变教学代码行为。

退出条件：另一个智能体仅凭 Skill、模板和 validator 即可为新课程创建合规实验；Happy-LLM 第 5～6 章通过严格校验。

### 阶段 9：稳定化、文档与发布

**目标：** 达到可发布稳定版本，而不是功能演示。

工作项：

- 完成中英文用户手册、作者指南、安全说明和平台差异表。
- README 以“下载/打开 → 选择实验 → 准备环境 → 运行 → 查看产物 → 清理”为主线。
- 为 Desktop、Local Web、Pages 制作最新截图或短动图。
- 补充无 Python、无网络、无 GPU、低磁盘、依赖冲突、取消和崩溃恢复说明。
- 运行应用发布门：`pnpm check`、性能测试、生产依赖审计、Static build 与边界检查。
- Desktop 做干净机器安装 smoke；Pages 做固定 Revision 阅读与 Binder 跳转 smoke。
- 更新 `AGENT_HANDOFF.md`、`PLATFORM_CONTRACTS.md`、`HOST_FEATURE_MATRIX.md` 和 Release Matrix。
- 发布说明列出完整功能边界、已知限制和迁移兼容性。

退出条件：所有 Definition of Done 条目满足；没有阻断级已知问题；三种 Web/Desktop 入口均提供与能力一致的体验。

## 9. Happy-LLM 具体落地顺序

1. 盘点第 5、6 章每个脚本的 CLI、输入、输出、网络下载和 GPU 假设。
2. 选 `train_tokenizer.py` 作为第一个端到端 smoke，因为它比完整预训练风险低。
3. 将原有大依赖文件拆为环境配置，但先保持一个兼容入口，避免破坏原项目用户。
4. 给脚本补充确定性的轻量参数：小数据、少 epoch、固定 seed、独立输出目录。
5. 创建第 5 章 Manifest，先实现 `tokenizer-cpu`，再实现 `model-smoke` 和单卡预训练。
6. 完成 `torchrun` 后加入 DDP；未检测到足够 GPU 时只展示说明。
7. 创建第 6 章 Manifest，先处理数据与 Notebook，再接入微调和 DeepSpeed。
8. 把章节笔记中的长命令说明替换或补充为 Experiment Card，同时保留普通 Markdown 使用说明。
9. 在 Desktop 做全新环境 smoke，在 Local Web 做 Jupyter 子集 smoke，在 Pages 做只读与 Binder smoke。

## 10. 测试策略

测试聚焦契约、安全和跨层行为，不为简单样式或实现细节堆测试。

### 单元测试

- Manifest 解析与兼容；
- 路径与符号链接安全；
- 参数类型与 argv 构造；
- 环境继承与摘要；
- DAG 拓扑与循环检测；
- Job / Step 状态转换；
- 日志脱敏与限流；
- Host / Runner capability 判定。

### 集成测试

- Workspace Provider 读取 Manifest 和脚本；
- Fence → 索引 → Card → 实验页；
- Desktop 计划 ID 的创建、过期、应用和取消；
- 进程日志、失败、取消、产物与重启恢复；
- Jupyter 路径映射和 Python smoke；
- GitHub Revision trust 变化使旧批准失效。

### 人工 smoke

- macOS Desktop 全新安装；
- 带中文与空格路径的本地 Workspace；
- Local Web + Chrome/Edge + 本机 Jupyter；
- Pages 公开分享 URL + 固定 Revision；
- Happy-LLM 第 5、6 章各一个轻量预设。

## 11. Definition of Done

稳定版必须同时满足：

- 现有 Inline Lab、Workspace Schema v1、Compute Provider v1 和公开分享链接保持兼容；
- 合法 Manifest 在所有入口显示一致，非法内容给出定位到字段/文件的错误；
- 所有路径经规范化、Workspace 边界和符号链接检查；
- 不存在清单驱动的静默安装、静默下载或自动执行；
- Desktop 环境与 Job 能检查、计划、确认、运行、取消、恢复和清理；
- 日志不会泄露 Secret，不会因无限输出拖垮界面；
- Local Web 和 Pages 对不支持能力提供准确说明和下一步；
- GitHub 执行与 Binder 均绑定完整 commit SHA；
- Happy-LLM 两章 smoke preset 可复现，并保留普通命令行使用方式；
- Skill、模板、validator、中英文文档与平台矩阵同步更新；
- 应用发布门和严格 Workspace/Skill 校验全部通过；
- 发布包、Pages、版本号、更新元数据和 Release 说明一致。

## 12. 风险与应对

| 风险 | 应对 |
| --- | --- |
| 依赖安装慢或失败 | 内容摘要缓存、可取消日志、失败诊断、轻量预设 |
| CUDA/PyTorch 组合复杂 | 自动检测只做建议；展示官方安装路径；不承诺跨平台统一 wheel |
| 恶意公开仓库诱导执行 | commit trust、双重确认、路径/argv 限制、无自动执行 |
| Web 与 Jupyter 文件路径不一致 | 运行前路径映射诊断；失败时阻止运行 |
| 长任务因应用退出丢失状态 | Desktop Job 持久化、进程归属记录、interrupted 恢复 |
| 大日志或大产物卡顿 | 流式窗口、文件轮换、分页和按需预览 |
| 新接口破坏 v1 契约 | 独立 Runner；稳定前不导出 public API；契约审查后再开放 |
| Happy-LLM 依赖一次性重构过大 | 按预设渐进拆分，保留原 requirements 兼容入口 |
| Binder 构建慢且资源有限 | 固定 Revision、预检查、明确临时性、保留只读体验 |

## 13. 建议里程碑

版本号由维护者在发布时确定，建议按以下产品门组织：

1. **Preview A：** 阶段 0～2，只读 Manifest、Card、实验页和 validator。
2. **Preview B：** 阶段 3～4，Desktop 环境准备、Python 多脚本 Runner 和产物。
3. **Release Candidate：** 阶段 5～8，Notebook、torchrun、Web 子集、Binder、Skill 和 Happy-LLM 试点。
4. **Stable：** 阶段 9，完整文档、跨平台 smoke、发布门和稳定 Release。

Preview 不应替代现有稳定版；只有 Definition of Done 全部满足后才能标记 Stable。

## 14. 交给下一位智能体的执行说明

开发智能体开始工作前必须依次阅读：

1. 根目录 `AGENTS.md`；
2. `docs/AGENT_HANDOFF.md`；
3. `docs/PLATFORM_CONTRACTS.md`；
4. `docs/HOST_FEATURE_MATRIX.md`；
5. `skills/tensornote-knowledge-workspace/SKILL.md` 及其引用的 Lab、Workspace、Runtime 规范；
6. 本计划。

执行规则：

- 从阶段 0 开始，不直接跳到运行器。
- 每次只实现一个阶段，先写/更新对应契约与 fixtures，再改产品代码。
- 使用 `codex/` 前缀分支；保留用户和其他智能体的无关改动。
- 不把实验运行逻辑写进 `LabDrawer`、React 组件或 Git Bridge。
- 不修改稳定公共接口，除非该阶段包含独立契约评审和兼容测试。
- 不在仓库中保存 Token、密钥、Cookie、环境目录、运行日志或模型缓存。
- 每个阶段结束时报告：完成项、改动文件、测试、未解决风险、是否提交/推送/发布。
- Application source 变更至少运行 `pnpm check`；发布候选再执行性能、审计、Static build 和发布矩阵检查。
- Skill 变更运行 `quick_validate.py`、严格模板校验、仓库 validator 和所有改动脚本。
- 文档变更至少运行 `git diff --check`。

建议首个开发任务应限定为：完成阶段 0 和阶段 1，不创建进程、不安装依赖、不改 Happy-LLM 运行脚本。这样可以先让格式、安全边界和 validator 成为后续所有实现的共同基线。
