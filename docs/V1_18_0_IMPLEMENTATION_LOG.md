# TensorNote v1.18.0 Implementation Log

> 本文件是 v1.18.0 实际实施进度的唯一可信记录。  
> 每完成一个原子步骤必须更新。  
> 切换智能体时，新智能体必须先读本文件，再查看 `git status`、最近提交和未提交 diff。

---

## 当前状态

- 目标版本：v1.18.0
- 当前阶段：A2
- 最后完成 Step：A1
- 当前进行 Step：A2
- 当前 HEAD：`297a1e2`（A1 提交前）
- 工作树：A1 能力 resolver、矩阵测试与本日志待提交
- 当前已知问题：`ComputeSettings` 仍内联在 `SettingsPage.tsx`，A2 需在保持行为的前提下拆分。
- 下一位智能体第一步：
  1. 阅读 `SettingsPage.tsx` 内现有 `ComputeSettings`
  2. 拆出 compute settings 与 local/remote 子结构
  3. 保持 v1.17.0 UI 表现与数据流不变

---

# Step 状态总览

| Step | 内容 | 状态 | Commit |
|---|---|---|---|
| A0 | 建立 v1.18 开发断点机制 | DONE | `297a1e2` |
| A1 | 统一 ComputeCapabilities | DONE | 待提交 |
| A2 | 拆分 ComputeSettings 组件 | TODO | |
| A3 | 新增 Compute Overview | TODO | |
| B1 | Desktop Environment-first 列表 | TODO | |
| B2 | Kernel 子级展示 | TODO | |
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
提交：待提交

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
