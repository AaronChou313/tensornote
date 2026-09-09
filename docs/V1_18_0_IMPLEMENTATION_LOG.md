# TensorNote v1.18.0 Implementation Log

> 本文件是 v1.18.0 实际实施进度的唯一可信记录。  
> 每完成一个原子步骤必须更新。  
> 切换智能体时，新智能体必须先读本文件，再查看 `git status`、最近提交和未提交 diff。

---

## 当前状态

- 目标版本：v1.18.0
- 当前阶段：C2
- 最后完成 Step：C1
- 当前进行 Step：C2
- 当前 HEAD：`a18dcf5`（C1 提交前）
- 工作树：C1 Local Web 指引组件、样式与日志待提交
- 当前已知问题：远程连接仍使用 Profile 双栏大表单，主页面信息密度过高。
- 下一位智能体第一步：
  1. 将 Owned Server 状态、日志与停止操作归入所属环境详情
  2. 支持复用已启动的 Server 与现有临时 Profile
  3. 保持 token 仅在内存中流转

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
| C1 | Local Web 专用体验 | DONE | 待提交 |
| C2 | Remote Connection List | TODO | |
| C3 | Remote Connection Details | TODO | |
| C4 | Kernel 自动发现 | TODO | |
| D1 | Store 与 Migration | TODO | |
| D2 | 依赖职责整理 | TODO | |
| D3 | 样式与交互精修 | TODO | |
| E1 | 全量测试与回归 | TODO | |
| E2 | 中英文文档 | TODO | |
| E3 | v1.18.0 Release | TODO | |

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
提交：待提交

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
