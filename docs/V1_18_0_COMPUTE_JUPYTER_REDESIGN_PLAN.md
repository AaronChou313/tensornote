# TensorNote v1.18.0 开发计划
## “计算与 Jupyter”配置页与运行时体验重构

> **目标版本**：v1.18.0  
> **基线版本**：v1.17.0  
> **主要范围**：计算与 Jupyter 设置页、Desktop 本地环境管理、本地 Web Jupyter 连接、远程计算连接、Compute/Host 能力模型、相关状态管理、测试、文档与发布  
> **核心原则**：**不推倒 v1.17.0 已有运行时能力。v1.18.0 重点是重新组织用户心智、统一三端能力边界、提升环境/Kernel 管理体验，并降低未来维护成本。**

---

# 0. 本计划的使用方式

本计划直接交给本地智能体执行。

智能体在开始任何修改前，必须首先阅读当前仓库最新代码，确认实际实现与本计划之间是否存在差异。**禁止只根据本文档想象代码结构后直接大规模改写。**

至少先检查：

- `src/pages/SettingsPage.tsx`
- `src/components/settings/LocalRuntimeAssistant.tsx`
- `src/compute/runtimeSettings.ts`
- `src/compute/types.ts`
- `src/compute/ComputeRuntime.ts`
- `src/store/useComputeStore.ts`
- `src/host/types.ts`
- `src/host/runtime.ts`
- `src/host/TauriHostAdapter.ts`
- `src/host/WebHostAdapter.ts`
- `src/deployment/config.ts`
- `src-tauri/src/local_runtime.rs`
- `src-tauri/permissions/local-runtime.toml`
- `docs/ENVIRONMENT_MANAGEMENT_REDESIGN_PLAN.md`
- `docs/COMPUTE_PLATFORM.md`
- `docs/zh-CN/USER_GUIDE.md`
- `docs/en/USER_GUIDE.md`
- `requirements-jupyter.txt`
- 与 Settings / Compute / Runtime / Host / Environment 相关的全部测试
- `package.json`、Tauri 配置与现有 Release 脚本

如果当前 `main` 已经在 v1.17.0 之后发生变化，应以**最新代码为准**，并在实施日志中记录“计划与实际代码的差异及处理方式”。

---

# 1. 强制执行：断点续作与智能体切换协议

## 1.1 为什么必须记录

本项目可能因为模型额度、上下文限制、应用重启或人工切换智能体而在任意时刻暂停。

因此，本次 v1.18.0 开发禁止依赖“当前智能体记得做到哪了”。

**仓库中的实施日志必须成为唯一可信的进度来源。**

建议在真正实施时新建：

```text
docs/V1_18_0_IMPLEMENTATION_LOG.md
```

本文档是目标计划；`V1_18_0_IMPLEMENTATION_LOG.md` 是实际进度记录。

---

## 1.2 每完成一个“小步骤”都必须记录

“小步骤”指一个可以独立说明、独立验证的原子改动，例如：

- 新增 ComputeCapabilities 类型；
- 补齐 capability matrix 测试；
- 拆出 ComputeOverview 组件；
- 完成本地环境列表；
- 完成 Kernel 子项展示；
- 完成“添加环境或连接”Dialog 骨架；
- 完成 uv 创建流程；
- 完成 Local Web 手动连接页；
- 完成远程连接列表；
- 完成一组 store migration；
- 完成一组样式调整。

**不要等完成一整个大阶段才写日志。**

每完成一个原子步骤，必须立即更新：

```text
docs/V1_18_0_IMPLEMENTATION_LOG.md
```

至少记录：

1. Step ID。
2. 状态：`TODO / IN_PROGRESS / DONE / BLOCKED`。
3. 本步目标。
4. 实际完成内容。
5. 修改文件。
6. 新增/修改测试。
7. 已执行的验证命令。
8. 验证结果。
9. 关键设计决定。
10. 是否存在未提交修改。
11. 下一步明确动作。
12. 若存在风险、已知问题或临时兼容逻辑，必须写明。
13. 若已提交 Git，记录 commit SHA。

---

## 1.3 每次智能体开始工作前的固定流程

新的智能体或新的会话开始时，**不要立即改代码**。

按顺序执行：

```text
1. 阅读本计划。
2. 阅读 docs/V1_18_0_IMPLEMENTATION_LOG.md。
3. 查看 git status。
4. 查看最近若干次提交。
5. 查看当前未提交 diff。
6. 对照日志确认最后一个 DONE Step。
7. 对 IN_PROGRESS Step 判断：
   - 是否已经完成但没记录；
   - 是否只完成一半；
   - 是否应该回滚；
   - 是否可继续。
8. 必要时重跑该 Step 最近一次相关测试。
9. 更新日志中的“当前接手状态”。
10. 再继续开发。
```

不得因为“看起来像没做”就重复实现已经存在的功能。

---

## 1.4 每次智能体准备结束或可能中断时

若能感知到即将切换任务、结束会话或额度不足，应优先做：

```text
1. 停止继续扩大修改范围。
2. 确保当前代码至少处于可解释状态。
3. 更新实施日志。
4. 写清未完成部分。
5. 写清下一步第一条具体动作。
6. 写清 git status。
7. 若当前 Step 已完成且验证通过，进行小提交。
8. 将 commit SHA 写入日志。
```

如果无法提交，也必须明确记录：

```text
未提交修改：
- src/...
- src/...

当前 diff 的目的：
...

下一位智能体请先：
...
```

---

## 1.5 Git 提交策略

本次 v1.18.0 推荐“小步提交”，不要积累一个超大提交。

提交信息建议带 Step ID，例如：

```text
feat(compute): A1 add unified compute capabilities
refactor(settings): A2 split compute settings components
feat(runtime): B1 add environment-first local runtime list
feat(runtime): B4 add external env Jupyter support plan
feat(compute): C2 redesign remote connection list
test(compute): E1 cover deployment capability matrix
docs: E2 update v1.18 compute guide
release: v1.18.0
```

只有在：

- 当前 Step 达到定义完成；
- 相关测试通过；
- 实施日志已更新；

之后再提交。

不要为了“留下记录”提交明显不可运行的随机中间状态；这种情况使用实施日志记录 `IN_PROGRESS` 即可。

---

# 2. v1.18.0 产品目标

v1.17.0 已解决了大量“能不能做”的问题。

v1.18.0 要解决的是：

> **用户能不能在几秒钟内理解自己当前在哪里、有哪些计算资源、应该点击什么。**

新的用户心智必须从：

```text
我应该使用便捷连接？
还是手动连接？
Compute Profile 是什么？
Kernel 又是什么？
```

变成：

```text
我现在使用哪个版本？
↓
我要在本地还是远程运行？
↓
我要使用哪个 Python 环境？
↓
如果需要，选择该环境下的 Kernel。
```

Jupyter Server、Token、Compute Profile、Connector、Owned Server 等概念仍然存在，但默认下降到第二层或高级设置，不作为普通用户进入页面首先面对的概念。

---

# 3. v1.18.0 明确的非目标

本次不要顺手扩大为新的计算平台大重构。

除非当前代码确实阻塞需求，否则 v1.18.0 不做：

- SSH Runtime；
- Docker Runtime；
- WSL Runtime；
- Kubernetes；
- 云 GPU 商店；
- 环境导出/克隆完整系统；
- Conda `environment.yml` 完整编辑器；
- Poetry/PDM 全功能管理；
- Notebook 文件格式重构；
- Workspace Schema 大版本升级；
- Compute Provider API 大版本升级；
- 与本需求无关的 Git / Markdown / 编辑器重构。

本次核心是：

> **把已有 Compute Runtime 从“连接配置页”升级成“计算资源管理体验”。**

---

# 4. 当前 v1.17.0 能力基线

根据 v1.17.0 当前实现，已有能力包括：

## Desktop

- 探测系统 Python；
- 探测 Conda；
- 读取 Conda environments；
- 探测 uv；
- 探测 Jupyter；
- 探测 Jupyter Kernel；
- 探测本机 Jupyter Server；
- 从常见路径补充探测 GUI PATH 中不可见的 Conda；
- 手动选择 Conda / uv 可执行文件；
- 创建 uv 环境；
- 创建 Conda 环境；
- 创建 venv；
- 显示托管环境目标路径；
- 安装最小 Notebook 依赖；
- 注册 ipykernel；
- 启动 TensorNote Owned Jupyter Server；
- 停止 TensorNote Owned Jupyter Server；
- 删除 TensorNote 自己创建的托管环境；
- 建立临时 Compute Profile；
- 本地手动 Jupyter 连接；
- 远程 Jupyter / JupyterHub / BinderHub。

## Local Web

- 无原生本机环境探测；
- 无进程管理；
- 可连接用户自行启动的本机 Jupyter；
- 可远程连接。

## Online / Static Web

- 无本地运行能力；
- 只使用远程计算连接。

因此 v1.18.0 应尽量复用这些能力，而不是再实现第二套环境系统。

---

# 5. 核心术语与数据模型

这是本次设计最重要的基础。

## 5.1 Python Environment

Python Environment 指一个真实可执行 Python 运行环境，例如：

- Conda environment；
- uv 创建的环境；
- venv；
- 系统 Python；
- TensorNote Managed Environment；
- 用户自己创建的外部 Python 环境。

一个 Python Environment 至少应包含：

```text
id
name
manager
pythonVersion
pythonPath
location
managed
jupyterInstalled
ipykernelInstalled
```

当前类型可继续扩展，但不要为了 UI 新建一套重复环境结构。

---

## 5.2 Jupyter Kernel

Jupyter Kernel **不是 Python Environment 的同义词**。

推荐关系：

```text
Python Environment
    1
    │
    └──── 0..N Jupyter Kernel
```

即：

- 一个 Python 环境可能还没有 Kernel；
- 一个 Python 环境可能注册一个 Kernel；
- 一个 Python 环境理论上可以注册多个 Kernel；
- Jupyter 也允许非 Python Kernel。

UI 上可以把 Kernel 作为 Environment 的子级，以降低普通用户认知成本。

当前 `RuntimeKernel.environmentId` 应继续作为二者关联依据。

---

## 5.3 Jupyter Server

Jupyter Server 是提供 REST / WebSocket / Kernel 生命周期能力的服务进程。

本地 Desktop 情况下：

```text
Python Environment
    ↓
TensorNote 启动 Jupyter Server
    ↓
Jupyter Server 使用该环境的 Kernel
    ↓
TensorNote Compute Session
```

普通用户默认无需手动配置 Server URL 或 Token。

---

## 5.4 Compute Profile / Connection

Compute Profile 保留为内部或高级连接配置模型。

它适合表达：

- 手动本地 Jupyter；
- Remote Generic Jupyter；
- JupyterHub；
- BinderHub。

但是：

> **Desktop 自动启动的本地 Owned Server 对应 Profile 不应出现在“远程连接配置列表”里。**

Owned Profile 可以继续作为内部兼容实现，但不应成为用户第一层资源。

---

# 6. 三种运行形态的能力矩阵

v1.18.0 必须把以下矩阵作为正式产品合同。

| 功能 | Desktop | Local Web | Online Web |
|---|:---:|:---:|:---:|
| 本地运行入口 | ✅ | ✅ | ❌ |
| 远程运行入口 | ✅ | ✅ | ✅ |
| 本机 Python 环境探测 | ✅ | ❌ | ❌ |
| 本机 Kernel 探测 | ✅ | ❌ | ❌ |
| Conda/uv/venv 创建 | ✅ | ❌ | ❌ |
| TensorNote 托管环境管理 | ✅ | ❌ | ❌ |
| 启停 TensorNote Owned Jupyter | ✅ | ❌ | ❌ |
| 修改外部 Python 环境 | 有限、需确认 | ❌ | ❌ |
| 手动连接本机 Jupyter | ✅ | ✅ | ❌ |
| Remote Generic Jupyter | ✅ | ✅ | ✅ |
| JupyterHub | ✅ | ✅ | ✅ |
| BinderHub | ✅ | ✅ | ✅ |

---

# 7. 统一 ComputeCapabilities

当前能力判断分散在：

- Deployment Mode；
- HostCapabilities；
- `runtimeLocationsFor(...)`；
- `VITE_TENSORNOTE_HOST`；
- 组件是否加载。

v1.18.0 建议增加统一 Compute 能力描述。

参考：

```ts
export interface ComputeCapabilities {
  localRuntime: boolean
  remoteRuntime: boolean

  environmentDiscovery: boolean
  environmentManagement: boolean
  ownedJupyterServer: boolean

  manualLocalJupyter: boolean

  remoteJupyter: boolean
  jupyterHub: boolean
  binderHub: boolean
}
```

具体命名可根据现有项目风格调整。

重点不是接口名字，而是：

> **Compute Settings UI 只根据统一能力结果决定显示什么。**

不允许 UI 到处自己判断：

```ts
deploymentAdapter.mode === 'desktop'
```

再另外判断：

```ts
host.capabilities.environmentDiscovery
```

再另外判断：

```ts
LocalRuntimeAssistant !== null
```

---

## 7.1 Desktop 能力

```text
localRuntime = true
remoteRuntime = true

environmentDiscovery = true
environmentManagement = true
ownedJupyterServer = true

manualLocalJupyter = true

remoteJupyter = true
jupyterHub = true
binderHub = true
```

---

## 7.2 Local Web 能力

```text
localRuntime = true
remoteRuntime = true

environmentDiscovery = false
environmentManagement = false
ownedJupyterServer = false

manualLocalJupyter = true

remoteJupyter = true
jupyterHub = true
binderHub = true
```

---

## 7.3 Online Web 能力

```text
localRuntime = false
remoteRuntime = true

environmentDiscovery = false
environmentManagement = false
ownedJupyterServer = false

manualLocalJupyter = false

remoteJupyter = true
jupyterHub = true
binderHub = true
```

如果 Self-hosted Web 的能力与 Static Web 不完全相同，应根据当前真实能力定义，不要仅为了矩阵硬编码。

---

# 8. “计算与 Jupyter”页面总体信息架构

## 8.1 页面第一层

新页面只保留两个顶层决策：

```text
计算与 Jupyter

当前平台 / 当前计算状态

[ 本地运行 ] [ 远程运行 ]
```

在线版没有本地能力时：

- 不显示不可用的“本地运行”Tab；
- 不显示灰掉按钮；
- 直接进入远程运行；
- 顶部说明当前为 Online。

---

# 9. 页面顶部：Compute Overview

用户进入页面第一屏，必须立刻看见当前状态。

## 9.1 Desktop

建议结构：

```text
计算与 Jupyter                                      Desktop

Python 环境          Jupyter Kernel          当前计算环境
8                    5                       TensorNote Python 3.12
                                             ● 已连接

                                   [重新检测]

[ 本地运行 ]       [ 远程运行 ]
```

信息至少包含：

- 当前产品形态：Desktop；
- 检测出的 Python 环境数；
- 检测出的 Jupyter Kernel 数；
- 当前 Compute 状态；
- 当前使用环境 / 连接；
- 若本地探测仍在进行，显示轻量 Loading；
- 若有 warnings，显示简短提示入口；
- 重新检测按钮。

环境检测不得阻塞整个 Settings 页面打开。

---

## 9.2 Local Web

浏览器没有本机环境探测能力，因此严禁显示：

```text
Python 环境：0
```

应显示：

```text
Local Web

本机 Python 环境
不可直接检测

当前计算
Local Jupyter · python3
● 已连接
```

并说明：

> 浏览器无法扫描系统 Python 环境；本地运行通过连接已启动的 Jupyter Server 完成。

---

## 9.3 Online

显示：

```text
Online

当前计算环境
未连接 / Remote ...

远程计算
```

不要显示本地资源统计。

---

# 10. Desktop 本地运行：Environment-first

这是 v1.18.0 最重要的 UX 改造。

必须移除用户第一层看到的：

```text
01 便捷连接
02 手动连接
```

Desktop 本地页面改成：

```text
本地 Python 环境
```

用户围绕环境操作。

---

## 10.1 本地环境列表

建议：

```text
本地 Python 环境                   [重新检测] [＋添加环境或连接]

● TensorNote Python 3.12
  uv · Python 3.12.7
  ~/.../managed-environments/tensornote-py312
  Jupyter 就绪 · 1 个 Kernel
  TensorNote 管理                               [正在使用]

○ project-env
  Conda · Python 3.11.9
  ~/miniconda3/envs/project-env
  Jupyter 就绪 · 1 个 Kernel                   [使用]

○ .venv
  venv · Python 3.12.5
  ~/project/.venv
  缺少 Jupyter 支持                      [安装 Jupyter 支持]

○ Python 3.9
  系统 Python · Python 3.9.6
  /usr/bin/python3
  未配置 Jupyter                              [查看]
```

---

## 10.2 每行必须清晰区分

至少显示：

- 环境名；
- 管理器；
- Python 完整版本；
- 简化路径；
- Tooltip / 详情中完整路径；
- TensorNote Managed / External；
- Jupyter 状态；
- Kernel 数；
- Server 是否正在运行；
- 是否当前使用。

---

## 10.3 环境状态统一

建议内部归一化为 UI 状态，例如：

```text
ready
missing-jupyter
running
current
unavailable
broken
```

实际类型名可调整。

不要在组件中反复散落：

```ts
jupyterInstalled ? ...
servers.some(...) ? ...
```

建议集中写一个 selector / view model。

---

# 11. Kernel 作为环境子级

默认环境列表可以只显示：

```text
Jupyter 就绪 · 1 个 Kernel
```

用户展开环境详情后：

```text
Jupyter Kernel

● TensorNote Python 3.12
  python
  默认 Kernel
```

多个 Kernel：

```text
Jupyter Kernel

○ Python 3
● CUDA Python
○ project-kernel
```

Kernel 是 Environment 下的子资源。

普通用户不需要再在主设置页手工输入：

```text
python3
```

---

# 12. 当前环境的主要动作

## Ready 环境

主要按钮：

```text
[使用]
```

Desktop 背后执行：

```text
选择 Environment
↓
如 TensorNote Owned Server 尚未运行，则启动
↓
选择默认/指定 Kernel
↓
建立内部 Compute Profile
↓
切换 active compute
↓
状态变为当前环境
```

如果已有对应 Owned Server：

- 优先复用；
- 不重复启动第二个无意义 Server；
- 显示“正在运行”。

---

## 当前环境

主按钮变为状态：

```text
● 正在使用
```

次级操作在详情或高级区域：

- 查看 Server；
- 查看日志；
- 停止；
- 断开 Compute Session。

不要把 Stop / Log 一直占据环境列表主视觉。

---

# 13. “＋添加环境或连接”统一入口

这是替代“便捷连接 / 手动连接”分栏的核心。

点击：

```text
＋ 添加环境或连接
```

打开 Dialog。

第一层：

```text
添加本地计算环境

创建新的 Python 环境

[ uv · 推荐 ]
快速、轻量，可获取所选 Python

[ Conda ]
适合已有 Conda / 科学计算工作流

[ Python venv ]
基于电脑中已有 Python


使用已有 Jupyter

[ 连接已有 Jupyter Server ]
我已经自行创建环境并启动 Jupyter
```

注意：

> **手动 Jupyter 连接不是一种 Python Environment Manager。**

因此禁止设计成：

```text
环境类型：
uv / conda / venv / 手动连接
```

它们可以在同一个入口中，但概念必须分组。

---

# 14. 创建 Managed Environment

## 14.1 uv

表单：

```text
环境名称
TensorNote Python 3.12

环境管理器
uv

Python 版本
3.12

创建位置
<完整可预览路径>

将安装
TensorNote Notebook 基础支持
```

---

## 14.2 Conda

同样：

```text
环境名称
Python 版本
Conda 可执行文件
创建位置
基础依赖
Kernel 名称
```

若 Conda 自动探测失败：

```text
未检测到 Conda

[重新检测] [选择 Conda 可执行文件]
```

保留 v1.17.0 对 Finder/GUI PATH 的常见路径补探测能力。

---

## 14.3 venv

venv 不允许用户选择一个机器上不存在的 Python 版本。

表单：

```text
基础 Python
Python 3.12.7
/opt/homebrew/bin/python3.12

环境名称
...

Python 版本
3.12.7
由基础 Python 决定，只读

创建位置
...
```

---

# 15. 环境创建位置

创建前必须始终显示**完整目标路径**。

不允许只写：

```text
TensorNote 应用目录
```

应明确：

```text
/Users/.../.../managed-environments/my-env
```

但路径只是设备信息：

- 不写入 Workspace；
- 不同步；
- 不写进 Markdown；
- 不写进公共 Profile。

---

# 16. TensorNote Managed Environment 的正式产品约束

v1.18.0 将以下规则明确为产品合同：

```text
TensorNote Managed Environment 创建成功
=
Python 环境创建成功
+
TensorNote 最小运行依赖安装成功
+
ipykernel 可用
+
Kernel 注册成功
+
环境检测通过
```

即：

> **TensorNote 创建的环境默认一定带 Jupyter Kernel。**

如果任何必要步骤失败：

- 不得标记为 Ready；
- 按现有安全策略清理未完成 Managed Environment；
- UI 显示失败原因；
- 可重试。

---

# 17. Notebook 最小依赖与 ML 依赖分层

当前 Rust Managed Environment 实际最小包为：

```text
jupyter-server
ipykernel
numpy
matplotlib
pillow
```

并且已有测试明确避免把 `torch` / `transformers` 放进最小环境。

但仓库根目录 `requirements-jupyter.txt` 当前包含更重的 ML 包。

v1.18.0 应进行一次**依赖职责审计**。

目标：

## TensorNote Notebook Runtime

必要或基础依赖：

```text
jupyter-server
ipykernel
numpy
matplotlib
pillow
```

## ML / Project Dependencies

例如：

```text
torch
torchvision
transformers
```

应由：

- Project Experiment requirements；
- 明确的 ML requirements；
- 用户主动安装；

提供。

实施前先搜索 `requirements-jupyter.txt` 全仓库引用，再决定：

- 调整其内容；
- 或重命名；
- 或增加新的明确 requirements 文件。

**禁止直接删除/重命名而不检查引用。**

---

# 18. 外部 Python Environment

必须区分：

## TensorNote Managed

TensorNote 可以：

- 使用；
- 启动 Owned Jupyter；
- 删除整个环境；
- 修复/更新 TensorNote Notebook 支持。

## External Environment

TensorNote 可以：

- 探测；
- 查看；
- 使用；
- 在用户明确确认后安装 TensorNote Notebook 支持。

TensorNote 不可以：

- 删除整个外部环境；
- 静默修改用户环境；
- 自动回滚并假装恢复全部外部包状态。

---

# 19. 外部环境缺少 Jupyter 时的体验

当前“缺少 Jupyter → 无法启动”应升级。

例如：

```text
my-conda
Conda · Python 3.11

⚠ 缺少 TensorNote Notebook 支持

[安装 Jupyter 支持]
```

点击后显示计划：

```text
即将修改外部环境

路径
~/miniconda3/envs/my-conda

将安装
jupyter-server
ipykernel
numpy
matplotlib
pillow

将注册
TensorNote / 对应 Kernel

警告：
此环境不是 TensorNote 创建。
安装可能修改当前环境，TensorNote 无法保证自动回滚。
```

必须显式确认。

---

# 20. 可能需要新增的 Host 能力：Install Jupyter Support

如果当前 v1.17.0 后端没有专门给已有外部环境安装 TensorNote Notebook 支持的受控 Plan，则 v1.18.0 可以新增一个**最小、受控** Host API。

建议方向：

```ts
planLocalJupyterSupport(environmentId)
```

返回现有 `EnvironmentPlan` 或专门 Plan。

计划至少绑定：

- environmentId；
- Python path；
- managed / external；
- packages；
- kernel name；
- confirmation；
- expiration；
- steps。

执行仍复用受控 `applyLocalEnvironment(...)` 模式，避免 React 拼 Shell 命令。

命名可按当前 Host API 风格调整。

安全要求：

- 原生端重新验证 environmentId；
- 对外部环境给更明确确认；
- 参数数组执行；
- 不接受 Workspace 提供任意 Shell；
- 日志继续脱敏和限长。

---

# 21. 手动本地 Jupyter：不再单独作为第二大模块

Desktop 下手动连接入口进入：

```text
＋ 添加环境或连接
    ↓
连接已有 Jupyter Server
```

Dialog：

```text
Server URL
http://127.0.0.1:8888

Token
••••••••

Workspace 路径（需要时）
...

[测试连接]
```

---

# 22. Kernel 必须尽量自动发现

当前 Generic Jupyter Profile 允许用户直接手填 `kernelName`。

v1.18.0 改为：

```text
Server URL + Token
↓
测试服务器
↓
调用 Jupyter KernelSpec API
↓
显示可选 Kernel
↓
用户选择
```

示例：

```text
✓ Server 连接成功

发现 3 个 Kernel：

○ Python 3
● my-project
○ cuda-env

[连接并使用]
```

只有：

- KernelSpec 获取失败；
- 特殊服务不兼容；

时，才在“高级设置”允许手工输入 Kernel 名称。

---

# 23. Local Web 页面

Local Web 不应模仿 Desktop。

目标页面：

```text
计算与 Jupyter                                  Local Web

浏览器无法直接检测本机 Python 环境。
本地运行通过连接你自行启动的 Jupyter Server 完成。

[ 本地运行 ] [ 远程运行 ]

本地 Jupyter

Server URL
http://127.0.0.1:8888

Token
••••••••

[测试并连接]

> 如何启动本地 Jupyter？
```

展开帮助：

- 提供当前推荐命令；
- 提供复制按钮；
- 解释 allow_origin；
- 解释 Token；
- 不长期保存 Token。

不得显示：

```text
检测到 0 个 Python 环境
```

---

# 24. Online 页面

Online 不显示本地运行 Tab。

直接：

```text
计算与 Jupyter                                Online

远程计算环境

...
```

HTTPS 在线页面不要引导用户连接普通：

```text
http://127.0.0.1
```

避免 Mixed Content / CORS / WebSocket 误导。

---

# 25. 远程运行页面：Connection-first

当前“Profile 列表 + 巨型配置表单”改成“远程计算环境列表”。

例如：

```text
远程计算环境                         [＋添加远程连接]

● Lab GPU
  Generic Jupyter
  https://gpu.example.com
  Python 3.12
  ● 在线                                      [使用]

○ School JupyterHub
  JupyterHub
  https://jupyter.school.edu                 [连接]

○ Demo Binder
  BinderHub                                  [启动]
```

---

# 26. 添加远程连接

点击：

```text
＋ 添加远程连接
```

先选类型：

```text
Generic Jupyter
JupyterHub
BinderHub
```

再显示对应字段。

不要一开始同时展示全部 Connector 字段。

---

# 27. Remote Connection Details

详细配置放到 Dialog / Drawer / Detail 面板。

## Generic Jupyter

基础：

- 名称；
- Server URL；
- Token；
- Kernel；
- Workspace Path。

高级：

- Session Scope；
- 诊断；
- 手动 Kernel；
- 其他兼容选项。

## JupyterHub

基础：

- 名称；
- Hub URL；
- Token / 身份；
- Kernel。

高级：

- username 校验；
- serverName；
- stopOnDisconnect；
- WebSocket Token 兼容提示。

## BinderHub

基础：

- 名称；
- BinderHub URL；
- Repository / 当前 GitHub Workspace；
- revision。

高级：

- shutdownOnDisconnect；
- build diagnostics。

---

# 28. 当前连接状态

主页面所有本地/远程计算资源应使用统一状态语言：

```text
未连接
正在检测
正在连接
正在启动
正在构建
已连接
运行中
连接失败
不可用
```

避免直接把内部 phase 原样输出给普通用户：

```text
spawning
fetching
lifecycle
```

内部诊断可保留这些术语。

---

# 29. Workspace 执行权限的位置

当前：

```text
允许当前 Workspace 执行代码
```

仍然保留。

但视觉优先级低于：

1. 当前计算状态；
2. 本地/远程运行；
3. 当前环境。

建议：

- 保留在 Compute 页面顶部但做成较轻量权限行；
- 或紧跟 Compute Overview；
- 不要让它抢占整个页面第一视觉中心。

安全语义不变：

- 未授权 Workspace 不得执行代码；
- GitHub Revision trust 逻辑不变。

---

# 30. SettingsPage.tsx 结构重构

当前 `ComputeSettings()` 过大。

v1.18.0 建议将 Compute 设置拆出。

推荐结构，可按实际代码调整：

```text
src/components/settings/compute/
├─ ComputeSettings.tsx
├─ ComputeOverview.tsx
├─ RuntimeLocationSwitch.tsx
├─ WorkspaceExecutionSetting.tsx
│
├─ local/
│  ├─ LocalRuntimePanel.tsx
│  ├─ EnvironmentList.tsx
│  ├─ EnvironmentListItem.tsx
│  ├─ EnvironmentDetails.tsx
│  ├─ KernelList.tsx
│  ├─ AddLocalRuntimeDialog.tsx
│  ├─ CreateEnvironmentForm.tsx
│  ├─ ManualJupyterDialog.tsx
│  └─ OwnedServerDetails.tsx
│
└─ remote/
   ├─ RemoteRuntimePanel.tsx
   ├─ RemoteConnectionList.tsx
   ├─ RemoteConnectionItem.tsx
   ├─ RemoteConnectionDialog.tsx
   └─ RemoteConnectionDetails.tsx
```

不要为了追求“组件化”把每个十行 UI 都拆文件。

原则：

> 页面级职责分开，复杂业务状态分开，简单布局不机械拆分。

---

# 31. LocalRuntimeAssistant 的处理

当前 `LocalRuntimeAssistant.tsx` 已承载：

- discovery；
- environment selection；
- creation；
- plan；
- operation；
- Owned Server；
- logs；
- cleanup。

v1.18.0 不建议继续往里面堆。

建议逐步把其状态逻辑抽为 hooks / controller：

```text
useLocalRuntimeDiscovery
useManagedEnvironmentOperation
useOwnedJupyterServers
```

或与当前项目风格等价的结构。

然后将现有 `LocalRuntimeAssistant`：

- 逐步拆解；
- 最终删除；
- 或保留为内部容器但不再呈现“便捷连接”语义。

---

# 32. Store 设计

当前 `useComputeStore` 同时保存：

- persistent Profiles；
- activeProfile；
- session-only Tokens；
- owned runtime profile。

v1.18.0 需要保证：

## 本地环境选择

可新增设备侧偏好：

```text
lastLocalEnvironmentId
```

仅用于下次进入页面时恢复选择。

不要写入 Workspace。

---

## Owned Runtime Profile

可以继续作为 ComputeRuntime 兼容桥梁，但必须：

- 仍然 session-only / transient；
- 不混入远程连接列表；
- 不持久化无意义的 Owned Server URL/Token。

---

## Remote Connections

继续持久化。

如果更改数据结构：

- 提升 Zustand persist version；
- 写 migration；
- 保证 v1.17.0 用户已保存的 Profile 不丢失。

---

# 33. Profile 数据迁移

v1.18.0 必须考虑：

- v1.17.0 Local Profile；
- Remote Generic Profile；
- JupyterHub；
- BinderHub；
- legacy profile；
- activeProfileId。

迁移原则：

1. 原有远程连接继续存在。
2. 原有本地手动 Profile 继续存在。
3. UI 可以把它们重新分类，但不能静默删除。
4. Owned Runtime Profile 本来就不持久化，不需要迁移为远程连接。
5. 若历史 Profile 缺少 `runtimeLocation`，继续使用已有推断逻辑或 migration 填充。

必须新增/更新测试。

---

# 34. 自动探测的交互细节

Desktop 进入 Compute 页面：

```text
打开页面
↓
立即呈现静态框架
↓
异步 discover
↓
更新环境数、Kernel 数、环境列表
```

不要：

```text
打开设置
↓
整个页面空白等待扫描
```

要求：

- 使用 skeleton / lightweight loading；
- discovery 错误不导致整个 Settings 崩溃；
- warnings 单独显示；
- 保留上次有效列表可考虑，但不要显示过期状态为“最新检测”。

---

# 35. 重新检测行为

重新检测必须：

- 保留当前选择，若 environmentId 仍存在；
- 若当前环境消失，再选择第一个合理环境；
- 不主动停止运行中的 Owned Server；
- 不修改外部环境；
- 不自动安装依赖。

---

# 36. Environment Details

点击环境行或详情按钮后，可以显示：

```text
环境详情

名称
管理器
Python 版本
Python 路径
环境目录
Managed / External

Jupyter
jupyter-server
ipykernel
Kernels

TensorNote Server
状态
URL
启动时间
日志

操作
安装/修复 Jupyter
停止 Server
删除 Managed Environment
```

危险操作不要放在列表主界面。

---

# 37. 删除 Managed Environment

现有安全边界继续保持：

- 只能删除 TensorNote Managed Environment；
- 删除前显示完整路径；
- 正在被 Owned Server 使用时禁止直接删除；
- 原生端再次确认目标位于 Managed root；
- marker 校验；
- 外部环境没有“删除环境”按钮。

UI 可使用明确确认 Dialog。

---

# 38. 连接诊断

诊断功能保留，但从主流程下降一级。

普通用户主流程：

```text
选择资源 → 使用
```

失败时：

```text
连接失败
[查看诊断]
```

高级用户也可以主动：

```text
运行连接诊断
```

诊断报告继续：

- 脱敏；
- 可复制；
- Token 不进入报告。

---

# 39. 文案原则

避免：

```text
Convenient connection
Owned Profile
Runtime lease
Connector lifecycle
Prepare profile
```

普通用户文案优先：

```text
本地运行
远程运行
Python 环境
Jupyter Kernel
使用
连接
创建环境
安装 Jupyter 支持
连接诊断
```

“Profile”仅在高级设置或内部实现出现。

---

# 40. UI 风格

保持 TensorNote 现有视觉语言，不做另一套设计系统。

要求：

- 使用现有 design tokens；
- 保持当前淡绿/纸面风格；
- 不做大量厚重卡片；
- 主列表更接近 IDE Interpreter Manager；
- 层级通过标题、间距、状态、细分隔表达；
- 避免“每个功能一个大卡片”；
- 避免页面纵向无限增长；
- 高级内容使用折叠、详情或 Dialog；
- 错误与 warning 不长期占据大面积。

---

# 41. 响应式

Settings Dialog / 窄窗口：

- Overview 统计可变为 2 行；
- 环境路径自动省略；
- 主操作保持可见；
- 列表不产生无意义横向滚动；
- Dialog 表单改单列；
- Remote Details 可从双栏切单栏。

---

# 42. 无障碍

至少保证：

- Tab / segmented control 使用正确 aria；
- 环境选择可键盘操作；
- 状态不能仅靠颜色；
- Dialog focus trap 沿用现有 Modal 体系；
- button / radio / list 语义合理；
- loading / error 使用 `role=status` / `role=alert`；
- disabled 状态提供原因。

---

# 43. 后端改动边界

优先复用：

```text
discoverLocalRuntime
selectLocalRuntimeTool
planLocalEnvironment
applyLocalEnvironment
getLocalRuntimeOperation
cancelLocalRuntimeOperation
removeLocalEnvironment
startOwnedJupyter
listOwnedJupyter
getOwnedJupyterLogs
stopOwnedJupyter
```

只有在“外部环境安装 TensorNote Jupyter 支持”等当前能力确实不足时，才新增最小 API。

不要为了新 UI 重写 Rust `LocalRuntimeManager`。

---

# 44. 测试策略

本次不能只做视觉修改。

需要同时覆盖：

- 能力矩阵；
- Store migration；
- 环境列表状态；
- Kernel 关联；
- Managed / External 行为；
- 三端入口；
- Local Web；
- Online；
- Remote Connector；
- Owned Server；
- 新建环境；
- 外部环境 Jupyter 支持；
- Token 会话安全；
- 旧 Profile 兼容。

---

# 45. 前端单元测试

至少补充：

## ComputeCapabilities

验证：

```text
Desktop
Local Web
Static Web
Self-hosted
```

每种 deployment / host 组合的计算能力。

---

## runtimeSettings

如果保留：

```text
runtimeLocationsFor
supportsConvenientLocalRuntime
connectorKindsFor
profileRuntimeLocation
```

需要重新确认职责，避免和 ComputeCapabilities 重复。

重复能力函数应合并或明确单一职责。

---

## Store

测试：

- v1.17 persisted state → v1.18；
- Local manual profile 保留；
- remote profile 保留；
- Owned profile 不持久化；
- active profile fallback；
- Token 仍 session-only。

---

# 46. 组件行为测试

建议覆盖：

### Desktop

- 显示环境数；
- 显示 Kernel 数；
- 显示 Desktop；
- 显示本地/远程；
- 环境列表；
- Managed 标签；
- 缺少 Jupyter 状态；
- Add dialog；
- 不显示“01 便捷连接 / 02 手动连接”。

### Local Web

- 不显示环境数量为 0；
- 显示不可检测；
- 显示 Local Jupyter 手动连接；
- 不显示环境创建。

### Online

- 不显示本地运行；
- 直接远程连接。

---

# 47. Rust 单元测试

保留并扩展：

- 最小 Managed Environment 不包含 torch；
- Managed marker；
- 删除只允许 managed root；
- 环境探测；
- Conda / uv tool selection；
- venv base Python；
- Kernel 注册；
- Owned Server 生命周期；
- 新增的 Jupyter Support Plan（若实现）；
- External Environment 修改必须明确 external 标记；
- Plan expiration / confirmation。

---

# 48. 集成验证

至少完成以下人工流程。

## Desktop：已有环境

```text
打开 TensorNote
→ 设置
→ 计算与 Jupyter
→ 自动检测环境
→ 展开某环境
→ 查看 Kernel
→ 使用
→ 执行 Lab
→ 断开
```

---

## Desktop：新建 uv

```text
添加环境或连接
→ uv
→ 设置名称和 Python
→ 确认目标路径
→ 创建
→ Kernel 注册
→ 使用
→ 执行代码
```

---

## Desktop：新建 Conda

同上。

---

## Desktop：venv

验证：

- 基础 Python 必选；
- Python version 只读跟随；
- 不产生“选 3.12 实际创建 3.9”的状态。

---

## Desktop：外部环境缺 Jupyter

```text
检测到环境
→ 安装 Jupyter 支持
→ 显示外部环境警告
→ 确认
→ 安装
→ 注册 Kernel
→ 使用
```

---

## Desktop：手动 Jupyter

```text
添加环境或连接
→ 连接已有 Jupyter
→ URL
→ Token
→ 测试
→ 自动列 Kernel
→ 选择 Kernel
→ 使用
```

---

## Local Web

```text
打开 Local Web
→ 设置
→ 计算与 Jupyter
→ 不显示环境扫描
→ 本地运行
→ 填 Server URL / Token
→ 获取 Kernel
→ 连接
```

---

## Online

```text
打开在线版
→ 设置
→ 计算与 Jupyter
→ 没有本地运行
→ 添加 Remote Jupyter / Hub / Binder
```

---

# 49. 失败场景验证

必须检查：

- Conda 不存在；
- uv 不存在；
- 用户选择无效 Conda；
- Python 环境被删除；
- jupyter-server 不存在；
- ipykernel 不存在；
- Server 端口冲突；
- Owned Server 启动失败；
- Token 错误；
- CORS 错误；
- WebSocket 错误；
- KernelSpec 获取失败；
- Binder build 失败；
- JupyterHub 身份错误；
- Managed Environment 创建中取消；
- 外部环境依赖安装失败；
- 重新检测时当前环境消失。

---

# 50. 安全回归

v1.18.0 不得破坏：

- Token session-only；
- 不把 Token 持久化到 Workspace；
- 不把本机环境路径写进 Workspace；
- 不停止外部 Jupyter；
- 不删除外部 Python 环境；
- Owned Server 只绑定 loopback；
- 使用随机 Token；
- App 退出停止 Owned Server；
- 安装计划在原生端验证；
- 用户输入不拼 Shell；
- 日志脱敏；
- 路径越界防护；
- Workspace execution permission；
- GitHub Revision trust。

---

# 51. 建议实施阶段

以下 Step ID 应直接用于实施日志。

---

## A0 — 建立 v1.18 开发断点机制

任务：

- 新建 `docs/V1_18_0_IMPLEMENTATION_LOG.md`；
- 复制本计划到仓库（建议 `docs/V1_18_0_COMPUTE_JUPYTER_REDESIGN_PLAN.md`）；
- 记录当前 branch / HEAD；
- 记录 baseline 测试；
- 记录当前代码与本文档差异；
- 不修改业务。

完成标准：

- 新智能体只看仓库即可知道计划和状态。

---

## A1 — 统一 ComputeCapabilities

任务：

- 设计统一 compute capability resolver；
- 合并/减少重复 deployment 判断；
- 添加能力矩阵测试；
- 暂不改变 UI 视觉。

完成标准：

- Desktop / Local Web / Online 三类能力测试明确；
- UI 后续可以只依赖统一能力对象。

---

## A2 — 拆分 ComputeSettings 组件

任务：

- 将 `ComputeSettings` 从 `SettingsPage.tsx` 拆出；
- 建立 local / remote 子结构；
- 保持当前行为不变；
- 不同时做视觉大改。

完成标准：

- UI 行为与 v1.17 等价；
- tests/build 通过；
- SettingsPage 明显变轻。

---

## A3 — 新增 Compute Overview

任务：

- 平台 badge；
- 当前计算状态；
- Desktop 环境/Kernel 统计；
- Local Web 不可检测状态；
- Online remote-only；
- 异步 loading。

完成标准：

- 用户进入页面第一屏可判断当前平台和计算状态。

---

## B1 — Desktop Environment-first 列表

任务：

- 去掉“01 便捷连接”主标题；
- 将 LocalRuntimeAssistant 的环境选择升级为本地环境资源列表；
- 添加 manager / version / path / managed / Jupyter / kernel count / running / current；
- 统一 environment view model。

完成标准：

- Desktop 本地页主对象是 Python Environment。

---

## B2 — Kernel 子级展示

任务：

- 根据 `environmentId` 关联 Kernel；
- 环境详情显示 0..N Kernel；
- Managed 默认 Kernel 清晰；
- 当前 Kernel 状态。

完成标准：

- Python Environment 与 Kernel 不再平级混淆。

---

## B3 — “添加环境或连接”Dialog

任务：

- 单一入口；
- uv；
- Conda；
- venv；
- Existing Jupyter；
- 不把手动连接当 manager。

完成标准：

- Desktop 不再需要独立“便捷/手动”模块。

---

## B4 — Managed Environment 创建 UX

任务：

- 名称；
- manager；
- Python version；
- venv base interpreter；
- target path；
- packages；
- plan；
- progress；
- success；
- failure；
- cancel。

完成标准：

- 完全复用现有受控 plan；
- 创建成功即 Jupyter Ready。

---

## B5 — 外部环境 Jupyter Support

任务：

- 为 missing-jupyter 的 External Environment 提供“安装 Jupyter 支持”；
- 若缺少 Host API，增加受控 plan；
- 强警告；
- 不提供删除。

完成标准：

- 用户不需要离开 TensorNote 才能把已有环境变为可执行 Notebook 环境。

---

## B6 — Owned Server 高级管理

任务：

- Server 状态从主视觉下沉到环境详情；
- 复用运行中的 Server；
- logs；
- stop；
- error。

完成标准：

- 用户主流程仍是“选择环境 → 使用”。

---

## C1 — Local Web 专用体验

任务：

- 不加载本机环境管理；
- 不显示环境数 0；
- 手动 Jupyter 主流程；
- 启动命令帮助折叠；
- 自动 Kernel 枚举。

完成标准：

- Local Web 清楚表达浏览器边界。

---

## C2 — Remote Connection List

任务：

- 将 Profile-centric 双栏大表单改为连接列表；
- Add Remote Connection；
- Generic / JupyterHub / BinderHub；
- 状态；
- 当前使用。

完成标准：

- 主页面不再一次暴露大量高级字段。

---

## C3 — Remote Connection Details

任务：

- Dialog / Drawer；
- 按 connector 类型展示字段；
- 高级设置折叠；
- diagnostics；
- session scope；
- delete。

完成标准：

- 远程功能完整但默认视觉简洁。

---

## C4 — Kernel 自动发现

任务：

- Generic Jupyter 测试连接后获取 KernelSpec；
- JupyterHub 在可用阶段获取；
- Binder 在启动完成后获取；
- 默认选择合理 Kernel；
- advanced manual override。

完成标准：

- 普通用户不再需要猜 `python3` / kernelName。

---

## D1 — Store 与 Migration

任务：

- 审查 profiles；
- local manual / remote 分类；
- last local environment；
- active profile；
- Owned transient；
- migrate v1.17。

完成标准：

- 升级后用户旧连接仍存在。

---

## D2 — 依赖职责整理

任务：

- 搜索 `requirements-jupyter.txt` 引用；
- 明确 Notebook Runtime vs ML dependencies；
- 修改相关文件和文档；
- 不破坏 Experiment dependencies。

完成标准：

- 新建基础环境不会因为模糊 requirements 语义默认拉取大型 ML 框架。

---

## D3 — 样式与交互精修

任务：

- list density；
- whitespace；
- hierarchy；
- responsive；
- loading；
- empty；
- warning；
- error；
- hover/focus；
- animation 轻量化。

完成标准：

- 页面操作顺序自然；
- 不再像工程调试表单。

---

## E1 — 全量测试与回归

执行仓库定义的：

- unit test；
- frontend build；
- lint；
- typecheck；
- Rust tests；
- release validation；
- static/local/desktop build boundary tests。

不要猜命令，先看 `package.json` 和现有 CI。

完成标准：

- 无新失败；
- 记录已知平台限制。

---

## E2 — 中英文文档

至少更新：

- `docs/zh-CN/USER_GUIDE.md`
- `docs/en/USER_GUIDE.md`
- `docs/COMPUTE_PLATFORM.md`
- 环境管理相关开发文档
- README 中计算说明
- 必要 ADR / Host Feature Matrix

重点写新的用户流程：

```text
Desktop:
设置 → 计算与 Jupyter → 本地运行 → 选择/创建环境 → 使用

Local Web:
设置 → 计算与 Jupyter → 本地运行 → 连接已启动 Jupyter

Online:
设置 → 计算与 Jupyter → 远程计算
```

---

## E3 — v1.18.0 Release

任务：

- 新增：
  - `docs/releases/v1.18.0.md`
  - `docs/releases/v1.18.0.en.md`
- 更新版本号；
- README Release Notes 链接；
- 运行 release validation；
- 确认发行资产；
- 完成最终 changelog；
- 将实施日志状态改为 COMPLETED。

版本号修改应根据仓库现有 release 脚本和版本源执行，**不要凭经验手改一堆可能不是 source of truth 的文件**。

---

# 52. v1.18.0 Release Notes 建议主线

用户侧不要写大量内部架构术语。

建议核心文案：

```text
v1.18.0 重构“计算与 Jupyter”体验。

- Desktop 以 Python 环境为中心管理本地计算，不再要求用户区分“便捷连接”和“手动连接”。
- 进入页面即可看到当前版本、已发现的 Python 环境、Jupyter Kernel 和当前计算状态。
- 可直接使用系统中已存在的 Python/Conda/venv 环境，也可创建 uv、Conda 或 venv 环境。
- TensorNote 创建的环境默认完成 Jupyter 与 Kernel 配置。
- 已有环境缺少 Jupyter 支持时，可在明确确认后补齐。
- 手动 Jupyter 连接整合到统一“添加环境或连接”入口，并支持自动发现 Kernel。
- Local Web 保留本地 Jupyter 手动连接与远程计算；Online 仅提供远程计算。
- Remote Jupyter、JupyterHub、BinderHub 改用更清晰的连接列表与详情配置。
```

---

# 53. v1.18.0 最终验收清单

## 产品

- [ ] Desktop 有本地 + 远程。
- [ ] Local Web 有本地手动 + 远程。
- [ ] Online 只有远程。
- [ ] 不能使用的功能直接隐藏，而不是大量 disabled。

## Overview

- [ ] Desktop 显示平台。
- [ ] Desktop 显示 Python 环境数。
- [ ] Desktop 显示 Kernel 数。
- [ ] 显示当前 Compute 状态。
- [ ] Local Web 不误报“0 环境”。
- [ ] Online 不显示本地统计。

## Environment

- [ ] Python Environment 是本地主对象。
- [ ] Kernel 是 Environment 子资源。
- [ ] Manager / Python / Path / Managed / Jupyter 状态清晰。
- [ ] Managed / External 清晰区分。

## Add

- [ ] 单一“添加环境或连接”入口。
- [ ] uv。
- [ ] Conda。
- [ ] venv。
- [ ] Existing Jupyter。
- [ ] 手动连接没有被错误建模为 Environment Manager。

## Managed

- [ ] 创建前显示完整路径。
- [ ] 创建成功自带 Jupyter Kernel。
- [ ] 失败不标记 Ready。
- [ ] 可安全删除。
- [ ] 正在使用时禁止误删。

## External

- [ ] TensorNote 不删除外部环境。
- [ ] 缺 Jupyter 时可补齐。
- [ ] 修改前明确警告。

## Jupyter

- [ ] Owned Server 自动启动。
- [ ] 尽量复用已有 Owned Server。
- [ ] 手动连接可自动发现 Kernel。
- [ ] Server 高级信息不阻塞主流程。

## Remote

- [ ] Generic Jupyter。
- [ ] JupyterHub。
- [ ] BinderHub。
- [ ] Connection list。
- [ ] Details 分层。
- [ ] 高级设置折叠。

## Compatibility

- [ ] v1.17 Profile 不丢。
- [ ] Workspace Schema 不无故升级。
- [ ] Token 仍 session-only。
- [ ] Owned Profile 不持久化。
- [ ] Project Experiment 不回归。

## Quality

- [ ] tests。
- [ ] lint。
- [ ] typecheck。
- [ ] build。
- [ ] Rust tests。
- [ ] release validation。
- [ ] 中英文文档。

---

# 54. 智能体每个 Step 的 Definition of Done

一个 Step 只有满足以下全部条件才可以写 `DONE`：

```text
[ ] 目标代码完成
[ ] 与本 Step 相关的测试完成
[ ] 相关测试已实际运行
[ ] 没有忽略明显错误
[ ] 实施日志已更新
[ ] 修改文件已记录
[ ] 下一步已记录
[ ] git status 已记录
[ ] 若适合提交，已完成小提交并记录 SHA
```

如果没有满足：

```text
不得写 DONE
```

应写：

```text
IN_PROGRESS
```

---

# 55. 实施日志顶部必须维护的“当前状态摘要”

`docs/V1_18_0_IMPLEMENTATION_LOG.md` 顶部始终维护：

```markdown
## 当前状态

目标版本：v1.18.0
当前阶段：B3
最后完成 Step：B2
当前进行 Step：B3
当前 HEAD：<sha>

工作树：
- clean
或
- modified: ...

当前已知问题：
- ...

下一位智能体第一步：
- 阅读 B3 当前 diff
- 继续 AddLocalRuntimeDialog 的 Existing Jupyter 分支
```

每个智能体接手后先更新这一块。

---

# 56. 推荐实施日志条目模板

```markdown
## B2 — Kernel 子级展示

状态：DONE
完成时间：YYYY-MM-DD HH:mm
Commit：abc1234

### 本步目标

把 RuntimeKernel 按 environmentId 关联到 Python Environment。

### 实际修改

- EnvironmentListItem 增加 Kernel 数量。
- EnvironmentDetails 新增 KernelList。
- Managed Environment 默认 Kernel 标记。
- 没有 Kernel 时显示“尚未注册 Kernel”。

### 修改文件

- src/...
- src/...

### 测试

执行：

```bash
...
```

结果：

- PASS
- ...

### 设计决定

- Environment 允许 0..N Kernel。
- 不将 kernelName 继续作为 Environment 的唯一 Kernel 来源。

### 未完成 / 风险

- Remote Kernel 自动枚举将在 C4 完成。

### Git 状态

clean

### 下一步

B3：实现“添加环境或连接”统一 Dialog。
```

---

# 57. 切换智能体时禁止发生的事情

新智能体不得：

- 重写已经通过测试的整个 Compute 系统；
- 因为不理解已有改动而恢复到 v1.17 UI；
- 删除实施日志；
- 把 DONE Step 重新变成模糊 TODO；
- 未读 git diff 就覆盖未提交工作；
- 随意改变能力矩阵；
- 将 External Environment 变成 TensorNote Managed；
- 把 Kernel 与 Environment 合并成一个对象；
- 把 Local Web 伪装成 Desktop；
- 为追求“代码更漂亮”扩大无关重构。

如确实认为前一智能体设计错误：

1. 在日志中记录问题；
2. 给出代码证据；
3. 将对应 Step 改为 `BLOCKED` 或新增修正 Step；
4. 再进行修复。

---

# 58. 最终产品体验目标

v1.18.0 完成后，用户不应该再首先面对：

```text
Convenient Connection
Manual Connection
Profile
Connector
Kernel name
Owned Server
```

而应该体验为：

```text
打开“计算与 Jupyter”
↓
立即知道：
我是 Desktop / Local Web / Online
当前有哪些计算资源
现在连接到了哪里
↓
选择：
本地运行 / 远程运行
↓
Desktop 本地：
选择已有 Python 环境
或者
添加环境 / 连接
↓
TensorNote 帮我处理 Jupyter Server、Token、Kernel
↓
开始运行代码
```

最终目标不是隐藏技术本身，而是：

> **让普通用户只需要理解“在哪里运行”和“使用哪个 Python 环境”；只有在需要时再逐层进入 Jupyter、Kernel、Server、Profile 和诊断细节。**

---

# 59. v1.18.0 一句话开发原则

> **Environment-first, capability-driven, progressive disclosure, resumable implementation.**

即：

- 以 Python Environment 为中心；
- 以真实平台能力决定 UI；
- 用渐进式披露隐藏不必要的底层复杂度；
- 所有开发步骤都可记录、可验证、可中断、可由另一智能体无缝续作。
