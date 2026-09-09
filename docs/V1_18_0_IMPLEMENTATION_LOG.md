# TensorNote v1.18.0 Implementation Log

> 本文件是 v1.18.0 实际实施进度的唯一可信记录。  
> 每完成一个原子步骤必须更新。  
> 切换智能体时，新智能体必须先读本文件，再查看 `git status`、最近提交和未提交 diff。

---

## 当前状态

- 目标版本：v1.18.0
- 当前阶段：完成
- 最后完成 Step：E3
- 当前进行 Step：无
- 发布源码：`fe3d70698539f742a64e92757cb63ad6f8af4432`
- 工作树：发布记录提交后应为 clean
- 当前已知问题：无阻塞项；社区桌面包仍没有 Apple Developer ID / Windows 受信代码签名。
- 下一位智能体第一步：从本日志、`docs/AGENT_HANDOFF.md` 与最新公开 Release 状态开始后续版本规划。

---

# Step 状态总览

| Step | 内容 | 状态 | Commit |
|---|---|---|---|
| A0 | 建立 v1.18 开发断点机制 | DONE | `297a1e2` |
| A1 | 统一 ComputeCapabilities | DONE | `7e2b460` |
| A2 | 拆分 ComputeSettings 组件 | DONE | `ddf5104` |
| A3 | 新增 Compute Overview | DONE | `c162c13` |
| B1 | Desktop Environment-first 列表 | DONE | `8f3062b` |
| B2 | Kernel 子级展示 | DONE | `6246b50` |
| B3 | 添加环境或连接 Dialog | DONE | `862a8f5` |
| B4 | Managed Environment 创建 UX | DONE | `2abaa2f` |
| B5 | External Jupyter Support | DONE | `4d40654` |
| B6 | Owned Server 高级管理 | DONE | `a18dcf5` |
| C1 | Local Web 专用体验 | DONE | `fc0de92` |
| C2 | Remote Connection List | DONE | `06ea301` |
| C3 | Remote Connection Details | DONE | `477a197` |
| C4 | Kernel 自动发现 | DONE | `2c7d716` |
| D1 | Store 与 Migration | DONE | `33374b0` |
| D2 | 依赖职责整理 | DONE | `26c4d8e` |
| D3 | 样式与交互精修 | DONE | `f58f008` |
| E1 | 全量测试与回归 | DONE | `a1ad295` |
| E2 | 中英文文档 | DONE | `8706b59` |
| E3 | v1.18.0 Release | DONE | `fe3d706`（发行源码） |

---

# 接手检查记录

每次新的智能体/会话在此追加：

## Handoff 2026-09-10 00:52

- 接手智能体：Codex
- 阅读计划：是
- 阅读本日志：是
- 当前 HEAD：`03ffad3c9945f82818be5a1587fc011b985dcf90`
- `git status`：仅有用户新增的计划与日志未跟踪，无其他未提交修改。
- 未提交 diff 摘要：v1.18.0 计划与空白实施日志。
- 最后 DONE Step：A0（本次完成）
- 当前 IN_PROGRESS Step：A1
- 已重跑测试：`pnpm check`，61 个测试文件 / 214 项测试、Lint、TypeScript 和 Local 生产构建全部通过。
- 接手判断：v1.17.0 已有本地/远程切换、环境列表、Conda/uv/venv 创建和 Owned Server，但能力判断仍分散；应按计划增量整理，不建第二套 Runtime。
- 下一步：A1 统一 ComputeCapabilities，暂不改视觉。

## Handoff YYYY-MM-DD HH:mm

- 接手智能体：
- 阅读计划：是/否
- 阅读本日志：是/否
- 当前 HEAD：
- `git status`：
- 未提交 diff 摘要：
- 最后 DONE Step：
- 当前 IN_PROGRESS Step：
- 已重跑测试：
- 接手判断：
- 下一步：

---

# Step 记录

## A0 — 建立 v1.18 开发断点机制

状态：DONE
完成时间：2026-09-10 00:52 CST
提交：`297a1e2`

### 目标

- 将 v1.18.0 计划加入仓库。
- 建立本实施日志。
- 记录 baseline。
- 记录当前 HEAD 和工作树。

### 实际修改

- 将用户提供的 v1.18.0 计划和实施日志加入仓库。
- 阅读现行交接、指定源码、测试与发行配置，确认基线为 v1.17.0。
- 记录 branch、HEAD、工作树和基线检查。

### 修改文件

- `docs/V1_18_0_COMPUTE_JUPYTER_REDESIGN_PLAN.md`
- `docs/V1_18_0_IMPLEMENTATION_LOG.md`

### 测试 / 验证

执行：`pnpm check`

结果：61 个测试文件、214 项测试、Lint、TypeScript 和 Local 生产构建全部通过。构建仅保留已知的上游 `eval` 和 chunk size 警告。

### 设计决定

- 以 v1.17.0 的 Host/Compute 能力为基础做增量重构。
- 实施日志是跨会话进度的唯一可信来源，每个原子 Step 完成后即时更新。
- 计划与实际差异：`SettingsPage.tsx` 当前约 308 行，已有本地/远程切换；`LocalRuntimeAssistant` 已有环境资源列表和创建计划，但仍使用“便捷连接/手动连接”第一层概念；`runtimeSettings.ts` 仅管理 location/connector，未统一 Host 能力。

### 未完成 / 风险

- A0 不修改业务代码。
- PRODUCT.md 中的版本描述落后于当前 v1.17.0，暂不在 A0 扩大范围，E2 文档阶段统一处理。

### Git 状态

modified：仅本计划与日志，提交后应为 clean。

### 下一步

A1：新增统一 ComputeCapabilities resolver 和 Desktop / Local Web / Online 能力矩阵测试，保持当前 UI 行为。

---

## A1 — 统一 ComputeCapabilities

状态：DONE
完成时间：2026-09-10 00:55 CST
提交：`7e2b460`

### 本步目标

为 Desktop、Local Web、Online Web 建立统一计算能力结果，作为后续 UI 的唯一能力输入，本步不改变视觉。

### 实际修改

- 新增 `ComputeCapabilities`，统一表达本地/远程运行、环境探测/管理、Owned Jupyter、本地手动连接及三种远程 Connector。
- 新增 `resolveComputeCapabilities(mode, host)`，同时校验 Deployment Mode 与 Host 真实能力，避免不一致组合暴露原生操作。
- 新增从统一能力导出本地/远程 Tab 的 helper。
- 保留 v1.17.0 helper，便于 A2 增量迁移。

### 修改文件

- `src/compute/runtimeSettings.ts`
- `src/compute/runtimeSettings.test.ts`
- `docs/V1_18_0_IMPLEMENTATION_LOG.md`

### 测试 / 验证

执行：

```bash
pnpm vitest run src/compute/runtimeSettings.test.ts
pnpm lint
pnpm exec tsc -b
```

结果：

- 1 个测试文件、9 项测试通过。
- Lint 通过。
- TypeScript 构建通过。

### 设计决定

- 本地运行是 Deployment 层能力；环境探测、环境管理和 Owned Server 还必须获得 Host 能力，不仅凭 `desktop` 字符决定。
- Self-hosted 按当前产品真实能力与 Static 一样保持 remote-only。

### 未完成 / 风险

- A2 开始才将 Settings UI 迁移到这个能力对象；当前视觉行为未改变。

### Git 状态

modified：A1 源码、测试与日志待提交。

### 下一步

A2：从 `SettingsPage.tsx` 拆出 Compute Settings 组件及 local/remote 子结构，保持当前行为。


---

## A2 — 拆分 ComputeSettings 组件

状态：DONE
完成时间：2026-09-10 01:00 CST
提交：`ddf5104`

### 本步目标

将 Compute Settings 从总设置页拆出，建立能力驱动的运行位置子组件，同时保持 v1.17.0 行为。

### 实际修改

- 将完整 Compute Settings 状态、授权、连接配置和诊断流程移至独立组件。
- 新增运行位置 Tab 子组件，只接收统一 `ComputeCapabilities`，不自行读取 Deployment 或 Host。
- Compute 主组件使用 `resolveComputeCapabilities` 决定三端可见入口和本地说明。
- `SettingsPage.tsx` 从 308 行降至 141 行，只负责设置导航与其他设置板块。

### 修改文件

- `src/pages/SettingsPage.tsx`
- `src/components/settings/ComputeSettings.tsx`
- `src/components/settings/ComputeRuntimeLocationTabs.tsx`
- `docs/V1_18_0_IMPLEMENTATION_LOG.md`

### 测试 / 验证

执行：

```bash
pnpm check
```

结果：

- 61 个测试文件、219 项测试通过。
- Lint、TypeScript 和 Local 生产构建通过。
- 仅保留既有上游 `eval` 与 chunk size 构建警告。

### 设计决定

- 本步只拆分职责和接入统一能力结果，不提前实现 A3/B/C 的视觉重构。
- 动态加载 Desktop Runtime Assistant 的边界保留在 Compute Settings 内，不回流总设置页。

### 未完成 / 风险

- 连接表单仍集中在 Compute Settings；C2/C3 再按 Connection List 与 Details 拆分。
- Local Runtime Assistant 在 B1–B6 内逐步替换第一层心智。

### Git 状态

modified：A2 组件拆分与日志待提交。

### 下一步

A3：新增 Compute Overview，提供平台、资源计数和当前计算状态，且环境探测不阻塞 Settings 打开。



---

## A3 — 新增 Compute Overview

状态：DONE
完成时间：2026-09-10 01:09 CST
提交：`c162c13`

### 本步目标

让用户进入“计算与 Jupyter”后立即看见产品形态、可见资源和当前计算状态，并确保探测异步执行。

### 实际修改

- 新增 Compute Overview，使用统一能力对象渲染 Desktop、Local Web、Online 三种准确状态。
- Desktop 异步探测 Python 环境与 Kernel，提供轻量 Loading、提示数量和重新检测。
- Local Web 明示浏览器不能扫描本机环境，不再显示误导性的“0 个环境”。
- Online 只显示远程计算，不出现本机统计。
- 当前 Profile 和 Kernel 连接状态在首屏集中展示。
- 增加 680px 以下单列响应式布局。

### 修改文件

- `src/components/settings/ComputeOverview.tsx`
- `src/components/settings/ComputeOverview.test.tsx`
- `src/components/settings/ComputeSettings.tsx`
- `src/styles.css`
- `docs/V1_18_0_IMPLEMENTATION_LOG.md`

### 测试 / 验证

执行：

```bash
pnpm vitest run src/components/settings/ComputeOverview.test.tsx src/compute/runtimeSettings.test.ts
pnpm lint
pnpm exec tsc -b
```

结果：

- 2 个测试文件、12 项测试通过。
- Lint 与 TypeScript 通过。
- Local Web 实际页面确认平台、不可直接检测、当前计算和未连接状态可见，未显示“Python 环境 0”。

### 设计决定

- Overview 使用连续分隔信息带，不使用同尺寸指标卡堆叠。
- 探测通过零延时异步任务启动，不阻塞 Settings 首次渲染。
- 当前阶段保留 Runtime Assistant 自己的探测；B1 提取共享状态时消除 Desktop 重复探测。

### 未完成 / 风险

- Desktop 实际环境计数和重新检测联动将在 B1 共享 discovery 后再次验证。
- 当前计算名称沿用 active/fallback Profile；D1 再校正迁移与 transient Owned Profile 语义。

### Git 状态

modified：A3 组件、测试、样式与日志待提交。

### 下一步

B1：提取 Environment view model，将 Desktop 本地主流程改为 Environment-first，并共享 Runtime discovery。



---

## B1 — Desktop Environment-first 列表

状态：DONE
完成时间：2026-09-10 01:15 CST
提交：`8f3062b`

### 本步目标

将 Desktop 本地运行的第一层对象改为 Python Environment，并集中归一化资源状态。

### 实际修改

- 新增 Environment view model，集中计算 manager、路径、Kernel、Owned Server、当前使用和可用状态。
- 明确 `current / running / ready / missing-jupyter / unavailable` 五种 UI 状态。
- 环境列表增加完整 Python 版本、Managed/External、Jupyter 状态、Kernel 数量与完整路径提示。
- Local Runtime 标题改为“本地 Python 环境”，移除“01 便捷连接”第一层标题。
- 当前 Owned Profile 通过 `runtimeServerId` 与环境关联，不再由组件零散推断。

### 修改文件

- `src/components/settings/localEnvironmentViewModel.ts`
- `src/components/settings/localEnvironmentViewModel.test.ts`
- `src/components/settings/LocalRuntimeAssistant.tsx`
- `src/components/settings/ComputeSettings.tsx`
- `docs/V1_18_0_IMPLEMENTATION_LOG.md`

### 测试 / 验证

执行：

```bash
pnpm vitest run src/components/settings/localEnvironmentViewModel.test.ts
pnpm lint
pnpm exec tsc -b
```

结果：2 项 view model 测试、Lint 和 TypeScript 全部通过。

### 设计决定

- 当前环境必须同时存在 Owned Server 和匹配的 active transient Profile，避免 `undefined === undefined` 误判。
- External Environment 只显示来源与状态；删除能力仍严格限制为 Managed。

### 未完成 / 风险

- B2 才展示 Kernel 子项；本步只在主行提供数量。
- B3 将把创建环境与 Existing Jupyter 收拢到统一入口，届时移除剩余“手动连接”分区标题。

### Git 状态

modified：B1 源码、测试与日志待提交。

### 下一步

B2：在环境详情中展示关联 Kernel，并表达默认/当前 Kernel。



---

## B2 — Kernel 子级展示

状态：DONE
完成时间：2026-09-10 01:19 CST
提交：`6246b50`

### 本步目标

把 RuntimeKernel 按 `environmentId` 作为 Python Environment 的 0..N 子资源展示。

### 实际修改

- 选中环境后展开 Kernel 详情，不增加主列表常驻视觉负担。
- 显示 Kernel display name、内部名称、语言以及默认/当前状态。
- 当前 transient Profile 的 `kernelName` 仅标记匹配 Owned Server 的环境。
- 无 Kernel 时给出明确空状态。

### 修改文件

- `src/components/settings/localEnvironmentViewModel.ts`
- `src/components/settings/localEnvironmentViewModel.test.ts`
- `src/components/settings/LocalRuntimeAssistant.tsx`
- `src/styles.css`
- `docs/V1_18_0_IMPLEMENTATION_LOG.md`

### 测试 / 验证

执行：

```bash
pnpm vitest run src/components/settings/localEnvironmentViewModel.test.ts
pnpm lint
pnpm exec tsc -b
```

结果：2 项 view model 测试、Lint 和 TypeScript 全部通过。

### 设计决定

- Kernel 保持独立资源，通过 `environmentId` 关联，不并入 Environment 数据模型。
- 默认 Kernel 使用环境声明；缺少声明时以首个已发现 Kernel 作为展示默认值。

### 未完成 / 风险

- B3/B6 后续会将“使用环境”和 Server 高级动作重新组织；本步不改变生命周期。
- C4 负责手动和远程连接的 Kernel 自动发现与选择。

### Git 状态

modified：B2 源码、测试、样式与日志待提交。

### 下一步

B3：实现单一“添加环境或连接”入口，分开环境管理器与 Existing Jupyter 概念。



---

## B3 — 添加环境或连接 Dialog

状态：DONE
完成时间：2026-09-10 01:24 CST
提交：`862a8f5`

### 本步目标

以单一入口承载新建 Python Environment 与连接 Existing Jupyter，同时保持两者概念分组。

### 实际修改

- 本地环境标题栏增加“添加环境或连接”按钮和受约束焦点 Dialog。
- Dialog 第一层分别展示“创建新的 Python 环境”和“使用已有 Jupyter”。
- uv、Conda、venv 保持 Manager 语义；Existing Jupyter 作为独立连接分组。
- Desktop 本地手动连接默认不再占据主页面，只有从统一入口选择后才展开。
- Local Web 保持直接显示手动 Jupyter 主流程；Remote 页面不受影响。
- 环境创建原有受控 plan 被移入 Dialog，没有新增第二套创建逻辑。

### 修改文件

- `src/components/settings/LocalRuntimeAssistant.tsx`
- `src/components/settings/ComputeSettings.tsx`
- `src/styles.css`
- `docs/V1_18_0_IMPLEMENTATION_LOG.md`

### 测试 / 验证

执行：

```bash
pnpm lint
pnpm exec tsc -b
pnpm vitest run src/components/settings/localEnvironmentViewModel.test.ts src/components/settings/ComputeOverview.test.tsx
```

结果：Lint、TypeScript 和 5 项相关测试通过。

### 设计决定

- 使用共享 `ModalSurface`，继承焦点返回、Esc 和背景隔离行为。
- Dialog 默认只显示选择方式；选择 Manager 后逐层进入表单，减少第一屏字段密度。
- 手动 Jupyter 不建模为 Environment Manager。

### 未完成 / 风险

- B4 将对移入 Dialog 的创建计划、最小依赖与失败状态做专项检查。
- C2/C3 会进一步把 Remote Profile 大表单改为 Connection List + Details。

### Git 状态

modified：B3 组件、样式与日志待提交。

### 下一步

B4：完善并验证 Managed Environment 创建 UX 与 Ready 合同。



---

## B4 — Managed Environment 创建 UX

状态：DONE
完成时间：2026-09-10 01:27 CST
提交：`2abaa2f`

### 本步目标

完整呈现 Managed Environment 的名称、Manager、Python、目标路径、基础包、Kernel、计划、进度和失败/取消合同。

### 实际修改

- 创建表单明确列出 TensorNote Notebook 最小依赖，并说明 ML 依赖由 Experiment 单独管理。
- 创建计划显示规范化目标路径、Manager 可执行路径和将注册的 Kernel。
- 保留原有确认短语、计划过期、受控 argv、进度日志和取消清理机制。
- UI 明示创建成功时已配置 Jupyter 与 Kernel。

### 修改文件

- `src/components/settings/LocalRuntimeAssistant.tsx`
- `src/styles.css`
- `docs/V1_18_0_IMPLEMENTATION_LOG.md`

### 测试 / 验证

执行：

```bash
pnpm lint
pnpm exec tsc -b
cargo test --manifest-path src-tauri/Cargo.toml keeps_minimal_environment_free_of_large_ml_frameworks
cargo test --manifest-path src-tauri/Cargo.toml marks_an_environment_usable_only_after_completion
```

结果：Lint、TypeScript 和两项 Managed Environment 原生合同测试全部通过。

### 设计决定

- 最小 Notebook Runtime 固定为 `jupyter-server / ipykernel / numpy / matplotlib / pillow`，不包含 torch 或 transformers。
- 只有全部创建、安装、Kernel 注册和检测完成后才由 operation 返回 completed environment id。

### 未完成 / 风险

- 本步没有真实创建新 Conda 环境，避免未经用户选择产生较大的设备副作用；正式候选需做受控实机验收。
- B5 对外部环境的修改使用独立 plan，绝不复用 Managed 删除语义。

### Git 状态

modified：B4 UI、样式与日志待提交。

### 下一步

B5：新增 External Environment 安装 Jupyter Support 的受控 Host plan 与明确确认。


## B5 — External Jupyter Support

状态：DONE
完成时间：2026-09-10 01:43 CST
提交：`4d40654`

### 本步目标

允许用户为缺少 Notebook 能力的外部 Conda/venv/Python 环境受控安装 Jupyter 支持，同时保持环境所有权边界。

### 实际修改

- Host 合同新增独立 `jupyter-support` 计划与 Tauri command/permission。
- 缺少 Jupyter 的外部环境显示“安装 Jupyter 支持”，计划明确目标环境、最小包、Kernel 与外部环境警告。
- 安装复用受控 argv、确认短语、进度与取消机制；完成后在环境 `sys-prefix` 注册 Kernel。
- 外部环境不会变成 Managed Environment，失败或取消不会删除环境，并明确提示部分包可能已安装。

### 修改文件

- `src/host/types.ts`
- `src/host/TauriHostAdapter.ts`
- `src-tauri/permissions/local-runtime.toml`
- `src-tauri/src/lib.rs`
- `src-tauri/src/local_runtime.rs`
- `src/components/settings/LocalRuntimeAssistant.tsx`
- `src/styles.css`
- `docs/V1_18_0_IMPLEMENTATION_LOG.md`

### 测试 / 验证

执行：`cargo test --manifest-path src-tauri/Cargo.toml`、`pnpm lint`、`pnpm exec tsc -b`。

结果：原生 19 项测试（含外部环境所有权合同）全部通过；Lint 与 TypeScript 通过。

### 设计决定

- 外部环境补齐能力使用独立 plan kind，不能复用创建环境或删除 Managed Environment 的语义。
- 最小包沿用统一 Notebook Runtime 合同；不安装 torch、transformers 等项目依赖。
- token、命令行参数和环境路径不写入 Workspace。

### 未完成 / 风险

- 没有在用户真实 Conda 环境执行安装；该操作只在用户查看计划并输入确认短语后发生。

### Git 状态

modified：B5 源码、测试与日志待提交。

### 下一步

B6：将 Owned Server 状态、复用、日志与停止动作归入环境详情。


## B6 — Owned Server 高级管理

状态：DONE
完成时间：2026-09-10 01:49 CST
提交：`a18dcf5`

### 本步目标

让 TensorNote 启动的 Jupyter Server 成为所属环境的详情，并可复用、查看日志和停止。

### 实际修改

- 原生启动接口会先检查同一环境中仍可达的 Owned Server，直接返回其内存 token，不重复启动进程。
- 环境详情内显示 Server URL、状态、日志刷新和停止操作。
- 已运行环境的主操作改为“连接此 Server”，会恢复或切换当前临时 Compute Profile。
- 删除独立的 Server 卡片列表，Server 生命周期与环境关系保持在同一信息层级。

### 修改文件

- `src-tauri/src/local_runtime.rs`
- `src/components/settings/LocalRuntimeAssistant.tsx`
- `src/styles.css`
- `docs/V1_18_0_IMPLEMENTATION_LOG.md`

### 测试 / 验证

执行：原生全量测试、Lint、TypeScript、环境 ViewModel 定向测试。

结果：原生 19 项、前端定向 2 项通过；Lint 与 TypeScript 通过。

### 设计决定

- 只复用当前应用会话内拥有 token 且 loopback 端口可达的 Server。
- token 仍只保存在原生内存和前端临时 profile，不持久化。

### 未完成 / 风险

- 应用完全退出后不会接管遗留的外部 Jupyter 进程；此时用户应作为 Existing Jupyter 重新连接。

### Git 状态

modified：B6 源码、样式与日志待提交。

### 下一步

C1：整理 Local Web 专用手动连接体验与动态 origin 命令。


## C1 — Local Web 专用体验

状态：DONE
完成时间：2026-09-10 01:56 CST
提交：`fc0de92`

### 本步目标

让 Local Web 只呈现浏览器实际可用的手动 Jupyter 连接流程。

### 实际修改

- 新增 Local Web 专用说明组件，明确浏览器不能检测 Python 或启动本机进程。
- 启动命令帮助默认折叠，减少设置页噪音。
- 命令的 `allow_origin` 由当前网页 origin 动态生成，不再写死 5173。
- 保留 URL、Token 和 Kernel 的手动连接主流程。

### 修改文件

- `src/components/settings/LocalWebRuntimeGuide.tsx`
- `src/components/settings/ComputeSettings.tsx`
- `src/styles.css`
- `docs/V1_18_0_IMPLEMENTATION_LOG.md`

### 测试 / 验证

执行：`pnpm lint`、`pnpm exec tsc -b`。结果：全部通过。

### 设计决定

- Local Web 不显示环境计数，也不加载 Desktop 原生模块。
- 自动 Kernel 枚举统一在 C4 完成。

### Git 状态

modified：C1 源码、样式与日志待提交。

### 下一步

C2：将 Remote Profile 主视图改为连接列表。


## C2 — Remote Connection List

状态：DONE
完成时间：2026-09-10 02:04 CST
提交：`06ea301`

### 本步目标

将远程计算主页从双栏配置表单改为可扫描的连接列表。

### 实际修改

- 新增 Remote Connection List，集中显示名称、Connector、地址、当前使用与 Kernel 状态。
- 主页面新增单一“添加远程连接”入口；创建后直接打开对应详情。
- 每个连接提供明确的选择与编辑动作。
- 远程大表单移出主页面，进入共享 ModalSurface。

### 修改文件

- `src/components/settings/RemoteConnectionList.tsx`
- `src/components/settings/ComputeSettings.tsx`
- `src/styles.css`
- `docs/V1_18_0_IMPLEMENTATION_LOG.md`

### 测试 / 验证

执行：Lint、TypeScript、Compute 能力矩阵 9 项测试。结果：全部通过。

### 设计决定

- 选择连接与编辑配置为两个独立动作，避免点击列表项立即暴露复杂表单。
- 当前连接状态使用既有 activeProfile 与 kernelStatus，不建立第二套状态。

### Git 状态

modified：C2 源码、样式与日志待提交。

### 下一步

C3：整理远程详情 Dialog 的基础字段、高级设置、诊断、生命周期和删除动作。


## C3 — Remote Connection Details

状态：DONE
完成时间：2026-09-10 02:11 CST
提交：`477a197`

### 本步目标

在 Dialog 中完整保留远程能力，同时让默认配置界面保持简洁。

### 实际修改

- 远程详情使用共享 ModalSurface，具备焦点返回、遮罩和关闭行为。
- 默认只显示名称、Connector、地址、Kernel 与凭证。
- Workspace 路径、Connector 专属字段、生命周期与 Session Scope 收入高级设置。
- 诊断、启动验证、复制脱敏报告、断开和删除仍在详情内可用。

### 修改文件

- `src/components/settings/ComputeSettings.tsx`
- `src/styles.css`
- `docs/V1_18_0_IMPLEMENTATION_LOG.md`

### 测试 / 验证

执行：`pnpm lint`、`pnpm exec tsc -b`。结果：全部通过。

### 设计决定

- 配置实时保存到设备 store，Dialog 不制造独立草稿状态。
- 凭证继续使用现有会话 token store，不进入持久化 Profile。

### Git 状态

modified：C3 源码、样式与日志待提交。

### 下一步

C4：连接验证后自动获取 KernelSpec，并保留高级手动覆盖。


## C4 — Kernel 自动发现

状态：DONE
完成时间：2026-09-10 02:19 CST
提交：`2c7d716`

### 本步目标

让 Generic Jupyter、JupyterHub 与 BinderHub 在连接可用后自动读取 KernelSpec。

### 实际修改

- 诊断无失败项后自动调用统一 `ComputeRuntime.listKernels`。
- JupyterHub/BinderHub 启动完成后复用 Connector 已解析的 lease 枚举 Kernel。
- 优先保留已有选择，其次选择 `python3`，最后选择首个 Kernel。
- 有枚举结果时显示下拉选项；高级设置保留手动覆盖名称。
- Kernel 枚举结果与 Profile id 绑定，切换连接不会显示旧列表。

### 修改文件

- `src/components/settings/ComputeSettings.tsx`
- `src/compute/ComputeRuntime.ts`
- `src/compute/ComputeRuntime.test.ts`
- `docs/V1_18_0_IMPLEMENTATION_LOG.md`

### 测试 / 验证

执行：Lint、TypeScript、ComputeRuntime 与 Jupyter Provider 定向测试。

结果：2 个文件、10 项测试通过；Lint 与 TypeScript 通过。

### 设计决定

- Kernel 列表是会话态探测结果，不写入持久化 store；最终选择仍保存于 Profile。
- Binder 枚举必须复用启动得到的 lease，避免再次创建远程环境。

### Git 状态

modified：C4 源码、测试与日志待提交。

### 下一步

D1：审查 Store、持久化边界和 v1.17 → v1.18 migration。


## D1 — Store 与 Migration

状态：DONE
完成时间：2026-09-10 02:27 CST
提交：`33374b0`

### 本步目标

稳定 v1.17 → v1.18 Compute 设置迁移，并明确持久化与会话态边界。

### 实际修改

- Compute store 升级到 version 3，补全 Connector 与 Local/Remote 分类。
- 旧单 Server 配置迁移为 Local Direct Profile。
- 迁移时剔除 Owned Server 临时 Profile，并修复指向临时 Profile 的 active id。
- 新增最后选择的本地环境设备偏好，Desktop 重新进入时恢复选择。
- 继续仅用 sessionStorage 保存 token；持久化 partialize 明确排除 Owned Profile。

### 修改文件

- `src/store/useComputeStore.ts`
- `src/store/useComputeStore.test.ts`
- `src/components/settings/LocalRuntimeAssistant.tsx`
- `docs/V1_18_0_IMPLEMENTATION_LOG.md`

### 测试 / 验证

执行：Lint、TypeScript、Compute Store migration 2 项测试。结果：全部通过。

### 设计决定

- 环境 id 是设备偏好，可以持久化；Owned Server id 与 token 是会话态，不能持久化。
- 旧 Profile 地址仅用于迁移推断运行位置，之后由显式 `runtimeLocation` 管理。

### Git 状态

modified：D1 源码、测试与日志待提交。

### 下一步

D2：整理 Notebook 基础依赖、项目 Experiment 依赖与开发依赖的文件职责。


## D2 — 依赖职责整理

状态：DONE
完成时间：2026-09-10 02:35 CST
提交：`26c4d8e`

### 本步目标

区分 TensorNote Notebook Runtime、Workspace Experiment 与仓库示例依赖。

### 实际修改

- `requirements-jupyter.txt` 只保留 jupyter-server、ipykernel、numpy、matplotlib、pillow。
- 新增 `requirements-ml-example.txt`，承载本仓库可选 torch、torchvision、transformers 示例。
- 开发与环境手册明确项目依赖应由各 Experiment requirements 声明。
- Skill runtime reference 同步说明先安装 Notebook 基础能力，再按 Experiment 声明安装。

### 修改文件

- `requirements-jupyter.txt`
- `requirements-ml-example.txt`
- `docs/DEVELOPMENT.md`
- `docs/ENVIRONMENT_SETUP.md`
- `skills/tensornote-knowledge-workspace/references/runtime-operations.md`
- `docs/V1_18_0_IMPLEMENTATION_LOG.md`

### 测试 / 验证

执行：Lint、TypeScript、git diff check、Skill quick_validate、严格模板验证、仓库 Workspace 验证。

结果：全部通过；仓库验证保留既有 47 项 lab metadata info，无错误和警告。

### 设计决定

- 应用最小环境不随示例课程膨胀。
- GPU 版 PyTorch 等平台相关依赖由 Workspace 作者提供分组 requirements，TensorNote 不固定选择。

### Git 状态

modified：D2 依赖、文档、Skill reference 与日志待提交。

### 下一步

D3：完成三端、响应式、暗色与交互视觉精修。


## D3 — 样式与交互精修

状态：DONE
完成时间：2026-09-10 02:43 CST
提交：`f58f008`

### 本步目标

完成 Compute 新界面的响应式、主题和键盘交互收尾。

### 实际修改

- Remote list 在窄屏改为纵向标题和两行状态布局。
- Remote Dialog 在移动宽度使用单列表单与更紧凑边距。
- Local Web 命令与 Server actions 在窄屏垂直排列。
- 新增列表、折叠区和 Server details 的 focus-visible。
- 在真实 Local Web 中检查本地/远程主流程，并切换深色主题检查变量继承。

### 修改文件

- `src/styles.css`
- `docs/V1_18_0_IMPLEMENTATION_LOG.md`

### 测试 / 验证

执行：Lint、TypeScript、git diff check；浏览器实际检查 Local Web 本地页、远程列表与深色主题。

结果：静态检查通过；三条实际页面路径均可访问，交互语义和信息层级符合计划。

### 设计决定

- 继续使用现有主题变量，不新增独立暗色颜色分支。
- 所有高级区使用原生 details 语义，键盘与辅助技术可直接操作。

### Git 状态

modified：D3 样式与日志待提交。

### 下一步

E1：执行完整测试、性能测试、原生测试、Local/Static 构建与发布审计。


## E1 — 全量测试与回归

状态：DONE
完成时间：2026-09-10 03:02 CST
提交：`a1ad295`

### 本步目标

对 v1.18.0 功能候选执行应用、原生、性能和 Static 边界验证。

### 测试 / 验证

- `pnpm check`：63 个文件、226 项测试，Lint、TypeScript、Local 生产构建通过。
- `pnpm test:performance`：3 项通过。
- `pnpm check:desktop`：Rust fmt、clippy `-D warnings`、19 项测试通过。
- `pnpm build:web`：Static 构建与无 Tauri IPC 边界验证通过。
- `pnpm validate:publication`：应用仓库根目录不是待发布知识库，按预期报告缺少 publication repository/revision；此验证不属于应用 Release 门。

### 设计决定

- 保留上游 JupyterLab/gray-matter eval 与既有大 chunk 警告，未发现新增失败。
- 应用发行使用 E3 的 release validator；Workspace publication validator 只用于独立知识库。

### Git 状态

modified：仅 E1 日志待提交。

### 下一步

E2：同步版本号、README、双语用户指南、Release Notes、交接与平台文档。


## E2 — 中英文文档

状态：DONE
完成时间：2026-09-10 03:17 CST
提交：`8706b59`

### 本步目标

将版本、README、用户指南、Compute 参考、Skill 模板、Release Notes 与维护交接同步到 v1.18.0。

### 实际修改

- 应用、Tauri 与 Rust 版本统一为 1.18.0。
- 中英文 README 和用户指南改为环境列表、添加 Dialog、远程连接列表与自动 Kernel 流程。
- Compute Platform 记录 External Jupyter Support、Owned Server 复用和 KernelSpec 自动发现。
- 新增双语 v1.18.0 Release Notes。
- Agent Skill 包与知识库发布 Workflow template 固定到 v1.18.0。
- 交接文档新增候选状态、验证证据与尚未发布说明。

### 修改文件

- `package.json`、`src-tauri/Cargo.toml`、`src-tauri/Cargo.lock`、`src-tauri/tauri.conf.json`
- `README.md`、`README.en.md`
- `docs/zh-CN/USER_GUIDE.md`、`docs/en/USER_GUIDE.md`、`docs/COMPUTE_PLATFORM.md`
- `docs/releases/v1.18.0.md`、`docs/releases/v1.18.0.en.md`、`docs/AGENT_HANDOFF.md`
- `skills/tensornote-knowledge-workspace/package.json`、`package-lock.json`、`assets/publish-tensornote.yml`

### 测试 / 验证

执行：Cargo check、Skill quick_validate、strict template validator、release validator、git diff check。

结果：全部通过；Release validator 报告 `PASS · v1.18.0 · updater + workflow + templates`。

### 设计决定

- 默认中文 README，英文独立文件；Release Notes 同样双语。
- 文档明确阅读不需要 Python，三端计算能力继续按 Host/Deployment 边界表达。

### Git 状态

modified：E2 版本、文档、模板与日志待提交。

### 下一步

E3：完成最终发行门、构建 GitHub 资产、推送 Tag、等待 CI、核对附件并公开 v1.18.0。


---

## E3 — v1.18.0 Release

状态：DONE
完成时间：2026-09-10 02:41 CST
提交：`fe3d706`（发行源码；本节由发布后记录提交补充）

### 本步目标

冻结、验证并公开可下载的 v1.18.0 GitHub 社区稳定版，同时部署在线 Web。

### 实际修改

- 修正 Release Contract 中三处旧版本期望，冻结源码为 `fe3d70698539f742a64e92757cb63ad6f8af4432`。
- 创建并推送不可变 annotated Tag `v1.18.0`。
- Tag Workflow 完成 Web、Local Web、容器、Windows、Linux、Intel macOS、Apple Silicon macOS 与 Pages 构建。
- 下载草稿的 22 个附件，逐项核对 SHA-256、Manifest、latest.json 与版本；正式 Apple Silicon 应用的 Info.plist 为 1.18.0。
- 将 Release 公开为 Latest，并确认 Pages 入口加载 v1.18.0。

### 测试 / 验证

- `pnpm check`：63 个文件、226 项测试，Lint、TypeScript 与 Local 生产构建通过。
- 3 项性能测试、19 项 Rust 测试、Clippy、Static 边界、生产依赖审计与 Release validator 通过。
- Skill quick validation、两套 strict 模板及仓库校验通过。
- [Release dry run 34387736823](https://github.com/AaronChou313/tensornote/actions/runs/34387736823) 与 [Tag Release 34388925373](https://github.com/AaronChou313/tensornote/actions/runs/34388925373) 全部成功。
- [公开 Release](https://github.com/AaronChou313/tensornote/releases/tag/v1.18.0) 含 22 个附件；SHA256SUMS 覆盖的 20 项全部通过。
- [在线版](https://aaronchou313.github.io/tensornote/) 已部署 v1.18.0。

### 设计决定

- GitHub Community 是当前稳定发行渠道；Updater 签名必须，平台开发者签名按现行策略可选。
- Tag 保持指向发行源码，发布后的日志提交不移动 Tag。

### 未完成 / 风险

- 没有 Apple Developer ID 公证或 Windows 商业证书，首次打开桌面包仍可能显示操作系统来源提示。
- 非本机安装体验由 CI 构建覆盖，不宣称完成所有物理设备验收。

### Git 状态

发布记录提交后应为 clean。

### 下一步

v1.18.0 计划全部完成；后续需求另立版本计划。


---

## 通用 Step 模板

复制以下内容创建每个 Step 的实际记录：

````markdown
## STEP_ID — Step 名称

状态：TODO / IN_PROGRESS / DONE / BLOCKED
完成时间：
Commit：

### 本步目标

...

### 实际修改

...

### 修改文件

- ...

### 测试 / 验证

执行：

```bash
...
```

结果：

- ...

### 设计决定

- ...

### 未完成 / 风险

- ...

### Git 状态

clean / modified

未提交文件（如有）：

- ...

### 下一步

...
````

---

# 中断时紧急记录

如果当前智能体预计无法完成当前 Step，必须先填写：

```markdown
## Emergency Handoff

当前 Step：
当前 HEAD：
git status：

已经完成：
- ...

正在修改：
- ...

尚未完成：
- ...

当前 diff 的目的：
- ...

最后一次通过的测试：
- ...

当前失败：
- ...

下一位智能体第一步：
- ...

不要做：
- ...
```

然后再结束当前会话。
