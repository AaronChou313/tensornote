# TensorNote v1.18.0 Implementation Log

> 本文件是 v1.18.0 实际实施进度的唯一可信记录。  
> 每完成一个原子步骤必须更新。  
> 切换智能体时，新智能体必须先读本文件，再查看 `git status`、最近提交和未提交 diff。

---

## 当前状态

- 目标版本：v1.18.0
- 当前阶段：B3
- 最后完成 Step：B2
- 当前进行 Step：B3
- 当前 HEAD：`8f3062b`（B2 提交前）
- 工作树：B2 Kernel 子级、样式、测试与日志待提交
- 当前已知问题：创建环境与 Existing Jupyter 仍分散；B3 将建立统一入口。
- 下一位智能体第一步：
  1. 新增“添加环境或连接”统一 Dialog
  2. 分组 uv / Conda / venv 与 Existing Jupyter
  3. 移除 Desktop 独立“手动连接”主模块

---

# Step 状态总览

| Step | 内容 | 状态 | Commit |
|---|---|---|---|
| A0 | 建立 v1.18 开发断点机制 | DONE | `297a1e2` |
| A1 | 统一 ComputeCapabilities | DONE | `7e2b460` |
| A2 | 拆分 ComputeSettings 组件 | DONE | `ddf5104` |
| A3 | 新增 Compute Overview | DONE | `c162c13` |
| B1 | Desktop Environment-first 列表 | DONE | `8f3062b` |
| B2 | Kernel 子级展示 | DONE | 待提交 |
| B3 | 添加环境或连接 Dialog | TODO | |
| B4 | Managed Environment 创建 UX | TODO | |
| B5 | External Jupyter Support | TODO | |
| B6 | Owned Server 高级管理 | TODO | |
| C1 | Local Web 专用体验 | TODO | |
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
提交：待提交

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
