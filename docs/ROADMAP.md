# TensorNote 近期产品路线图

本文记录已经进入项目执行队列的近期功能范围。完整长期架构愿景见原始《TensorNote 长期架构与版本路线图》；已发布能力及稳定边界见[架构说明](ARCHITECTURE.md)。

## 当前状态

- `v0.1.0 — Workspace Foundation`：已发布。
- `v0.2.0 — Authoring`：已发布，具备 CodeMirror 编辑、保存、文件操作、资源管理与 Frontmatter Properties。
- `v0.3.0 — Knowledge System`：已发布。
- `v0.4.0 — Compute Platform`：已发布。
- `v0.5.0 — Workbench`：已发布；见 [Workbench 使用说明](WORKBENCH.md) 与 [Release notes](releases/v0.5.0.md)。
- `v0.6.0 — Extension Platform`：已发布；见 [Extension Platform 指南](EXTENSIONS.md) 与 [Release notes](releases/v0.6.0.md)。
- `v0.7.0 — Structured Knowledge`：已完成；见 [Structured Knowledge 指南](STRUCTURED_KNOWLEDGE.md) 与 [Release notes](releases/v0.7.0.md)。
- `v0.8.0 — Git & Sync`：已完成；见 [Local Git 指南](GIT_AND_SYNC.md) 与 [Release notes](releases/v0.8.0.md)。
- `v0.8.1 — Workbench & Authoring Polish`：已完成源码阶段；修复导航、侧栏、Workspace 切换、编辑命令与 Frontmatter 编辑体验，不单独创建 Release 或 Tag。
- `v0.8.2 — Compatibility & Migration`：已完成源码阶段；建立 Workspace Schema、Settings 与 Extension API 的版本兼容和迁移边界，不单独创建 Release 或 Tag。
- `v0.8.3 — Recovery`：已完成源码阶段；提供非破坏式草稿恢复、文件冲突延续保护与应用崩溃恢复界面，不单独创建 Release 或 Tag。
- `v0.8.4 — Distribution & Performance`：已完成源码阶段；加入三种 Web 分发模式、PWA、自托管容器、缓存与大 Workspace 性能门，不单独创建 Release 或 Tag。
- `v0.9.0 — Distribution & Hardening`：已完成；汇总兼容、恢复、分发、安全、性能与测试硬化，作为正式 Release。
- `v0.9.1 — Editor Experience & Settings`：已完成源码阶段；重构独立 Pane/Tab、编辑工具栏、标题渲染、Lab 回跳、Workspace 入口和统一设置页，不单独创建 Release 或 Tag。
- `v0.9.2 — Workbench Interaction Refinement`：已完成源码阶段；完善 Pane 关闭、Lab 打开可靠性、侧栏信息架构和白色主体/淡绿交互视觉，不单独创建 Release 或 Tag。
- `v0.9.3 — Focused Pane Workspace`：已完成源码阶段；将 Pane 重构为独立展示区、设置改为弹窗、焦点感知上下文和可折叠侧栏区块，不单独创建 Release 或 Tag。
- `v0.9.4–v0.9.6 — Workbench Visual Polish`：已完成源码阶段；稳定 Lab 回跳、阅读布局、标签与 Pane 操作手感，不单独创建 Release 或 Tag。
- `v0.9.7 — Executable Lab Authoring`：已完成源码阶段；新增响应式编辑工具栏和多 Cell 实验插入流程，不单独创建 Release 或 Tag。
- `v0.9.8 — Workspace Execution Permission`：已完成源码阶段；新增按 Workspace 保存的本机执行授权，同时保留 GitHub Revision 与未来 Schema 安全边界，不单独创建 Release 或 Tag。
- `v1.0.0 — Stable Platform`：已完成并正式发布；六项核心契约、版本一致性、首批主流程、分发、安全、性能、开源协议与文档验收均已落地。

## 下一代 v1.x 路线（规划中）

v1.0.0 之后，TensorNote 将沿“双宿主、双来源、开放发布”方向演进：Web 继续承担无需安装的公开阅读与远程执行入口，Tauri Desktop 为本地创作增加原生文件、Python 环境检测和 Jupyter 生命周期能力；Workspace 与 Compute 继续各自支持本地/远程组合。完整愿景、架构、版本拆分、安全边界和验收门见 [TensorNote 下一代产品与架构规划](NEXT_GENERATION_PLAN.md)。

该路线不得破坏下方已经发布的 v1 契约。HostAdapter、Native Workspace、Runtime Assistant、Pages 发布和 Remote Compute Connector 都必须以可选、能力驱动的方式增量接入。

## v1.0.0 — Stable Platform（已发布）

v1.0.0 不以继续增加功能为目标。它表示 TensorNote 的内容格式、Provider 边界、扩展面和用户配置模型已经形成首个可长期兼容的稳定基线。完整执行清单见 [v1.0.0 发布计划](V1_RELEASE_PLAN.md)。

### 稳定契约

- Workspace Repository Schema v1：`tensornote.yaml`、未知字段忽略、旧 Schema 内存迁移、未来 Schema 降级阅读。
- WorkspaceProvider API v1：文件、目录、资产、能力检测和冲突保护继续与具体来源解耦。
- ComputeProvider API v1：连接、Kernel、Session、执行、诊断与生命周期通过统一接口提供。
- Extension API v1：命令、视图、Markdown、编辑器、设置、状态栏与 Provider 贡献保持权限约束。
- Executable Markdown Syntax v1：标准 Python Fence 加 `exec/lab/cell/title/difficulty` 元数据，脱离 TensorNote 仍可阅读。
- Settings / Secret Model v1：内容、持久偏好、临时状态和 Secret 分类明确；Token 与 Secret 不进入 Workspace。
- Agent Interface v1：仓库内置可安装 Skill、撰写/配置/运行参考、模板和确定性 Workspace 校验器，并绑定上述六项稳定契约。

### 核心体验

- 本地创作：打开本地 Workspace → 编辑/保存 Markdown → 运行 Jupyter → 可选本地 Git。
- Web 阅读：打开 Built-in 或 GitHub Workspace → 搜索、知识关系与结构化视图。
- Web 可执行阅读：连接 Jupyter → 显式开启执行 → GitHub 来源额外信任当前 Revision → 运行 Lab。
- Self-hosted：Docker/Nginx 使用同一 Web Runtime，不维护第二套业务逻辑。

### Release Gate

- `pnpm check`、`pnpm test:performance`、生产依赖高危漏洞审计和 Local/Static 生产构建全部通过。
- 浏览器覆盖 Home、Workspace、笔记、编辑器、分栏、设置、Lab、明暗主题与窄屏关键路径。
- README、环境配置、平台契约、架构、路线图、版本号、PWA 缓存和 Release Notes 保持一致。
- 上述验收全部完成后创建 `v1.0.0` Git Tag 与 GitHub Release，并以 Apache License 2.0 发布。

### 正式验收记录

- `pnpm check`：30 个测试文件、102 项测试，ESLint 与 Local 生产构建全部通过。
- `pnpm test:performance`：3 项性能预算全部通过；生产依赖高危漏洞审计无已知漏洞。
- Static `/tensornote/` Base Path 生产构建与 `git diff --check` 通过；GitHub Actions Linux 环境完成 Compose 配置和 Docker 镜像构建。
- 浏览器确认 Home、Workspace、独立分栏、Lab Drawer、Command Palette、Settings About、明暗主题与 v1.0.0 契约信息。
- 智能体接口通过 Skill 结构校验、模板严格校验与当前 35 篇内置知识库兼容性校验。

### v1.0.0 明确不包含

- Tauri 安装包、公共插件市场、多人协作、Server-mounted Workspace、远程 Git Push/Pull、冲突合并器和 AI Chat。
- 这些能力进入 v1.x 独立路线，不得阻塞首个稳定平台版本。

## v0.9.3 — Focused Pane Workspace（源码阶段已完成）

- 每个 Pane 都包含自身的历史、标签、固定和关闭操作栏，以及独立的滚动展示区；左右 Pane 不再共用页面滚动位置。
- 当前焦点 Pane 决定从文件树打开笔记、右侧上下文栏读取的 Frontmatter/目录/链接/图谱，以及顶栏的拆分目标。
- Lab 每次显式打开都递增请求 nonce 并重新挂载对应 Workspace、笔记和 Lab 的 Drawer；笔记 Lab 在包含同名实验时不再复用旧实例。
- 设置移出侧栏和路由主界面，改为点击齿轮显示的自动保存弹窗，可点击关闭按钮或空白遮罩退出；Compute 设置亦复用该弹窗。
- 命令面板改为无模糊背景的顶部浮层；Files、Extensions 与 Recent Files 使用统一可折叠标题样式；右侧栏移除与独立实验抽屉重复的 Python Lab 入口。
- 阶段成果提交并推送到 `main`，但不创建 GitHub Release 或 Tag。

## v0.9.2 — Workbench Interaction Refinement（源码阶段已完成）

- 每个 Pane 具备独立关闭按钮；关闭主 Pane 会提升仍打开的一侧，关闭最后一侧转到 `/notes` 空工作台并显示“请选择一个笔记进行阅读或编辑”。
- Split Left / Right 均先创建独立空 Pane，文件树按当前活动 Pane 打开笔记，不复制、也不共享 Tab 状态。
- 笔记 Lab 打开前收起右侧上下文栏；LabDrawer 的重建键包含 Workspace、笔记与 Lab ID，避免跨笔记同名实验显示旧内容。
- 顶栏移除重复搜索框，命令与 Scratch 使用图标入口；收起左栏后的恢复按钮位于顶栏最左侧。
- Workspace 菜单仅保留刷新与切换；来源类型及读写权限以顶部标签呈现，Recent Files 可折叠，移除底部来源卡片和断裂的分段边线。
- 浅色主题以白色为内容和页面主体，淡绿色仅承担状态、悬浮与组件强调；深色主题同步使用中性深色表面。
- 阶段成果提交并推送到 `main`，但不创建 GitHub Release 或 Tag。

## v0.9.1 — Editor Experience & Settings（源码阶段已完成）

- 主、次 Pane 各自拥有标签、历史、固定与关闭状态；拆分先创建空窗格，从侧栏选择第二篇笔记后独立工作。
- 双窗格阅读使用紧凑排版；关闭一侧标签不会联动关闭另一侧，窄屏只呈现当前活动 Pane。
- 只隐藏与文档属性标题相同的首个 Markdown H1，后续 H1 正常作为正文标题显示。
- 编辑器常用格式动作压缩为单行图标与样式选择器，语言和低频命令进入下拉或溢出菜单。
- Scratch 插入或笔记 Lab 卡片使用笔记路径与 Lab ID 联合定位，保存后可立即回到对应实验。
- Workspace 切换直接进入侧栏左上角；外观、编辑器、Jupyter、扩展和版本信息统一进入 `/settings`。
- 阶段成果提交并推送到 `main`，但不创建 GitHub Release 或 Tag。

## v0.9.0 — Distribution & Hardening（已完成）

- Workspace Schema、浏览器 Settings 与 Extension API 具备显式版本兼容和迁移策略。
- 未来 Workspace Schema 保持基础 Markdown 可读，并自动降级为只读、禁用执行。
- Markdown 草稿、外部文件冲突与 React 渲染崩溃均有非破坏式恢复路径。
- Static、Local、Self-hosted Web Runtime 共享同一核心；提供可选 PWA、Docker/Nginx 与手动 GitHub Pages Workflow。
- Provider 加载受限并发、文档指纹缓存、搜索字段预计算、超大目录分页和功能级延迟加载已完成。
- 自动回归覆盖 10,000 笔记、超过 2MB Markdown 和 1,000 Asset 列表；发布门包含依赖安全与浏览器回归。
- v0.9.0 不包含 Tauri 安装包、在线插件市场、Server-mounted Workspace、远程 Git Push/Pull 或冲突合并器。

## v0.8.4 — Distribution & Performance（源码阶段已完成）

- Static Web 使用 Hash Router、相对 PWA Manifest 与 Service Worker，可部署到 GitHub Pages、Cloudflare Pages、Netlify 或同类静态平台。
- Local Web 保留 Local Workspace、Jupyter 与可选 localhost Git Bridge；Static/Self-hosted 不展示不可用的 Git Bridge 入口。
- Self-hosted 提供 Docker、Compose 与 Nginx SPA fallback；仍复用同一 Web Runtime，不形成第二套业务逻辑。
- Workspace 文件读取限制并发，刷新按文件指纹复用解析结果；Jupyter Provider 延迟加载。
- Knowledge Index 缓存搜索字段，文件树每次最多渲染 200 个同级项目。
- 性能回归覆盖 1,000/10,000 笔记、超过 2MB Markdown 和 1,000 Asset 列表。
- 阶段成果提交并推送到 `main`，但不创建 GitHub Release 或 Tag。

## v0.8.3 — Recovery（源码阶段已完成）

- Dirty Markdown 草稿以 Workspace 和路径隔离，防抖写入 IndexedDB，失败时安全降级到 localStorage。
- 恢复快照不会自动写回文件；重新打开时由用户明确选择恢复或丢弃。
- 保存、磁盘重新载入与丢弃都会清除快照；30 天未使用的快照自动过期。
- 恢复草稿保留原文件基线，外部修改仍触发 `WorkspaceConflictError`。
- React 渲染崩溃进入恢复页，提供重新加载、返回主页和不含文档内容的诊断复制。
- 阶段成果提交并推送到 `main`，但不创建 GitHub Release 或 Tag。

## v0.8.2 — Compatibility & Migration（源码阶段已完成）

- 缺少版本的旧 Workspace Manifest 在内存中迁移为 Schema v1；不自动改写用户文件。
- 未来 Schema 保持 Markdown 可读，但关闭写入、Git 与执行，并在 Workspace Overview 明示兼容模式。
- App、Workspace、Extension 与 Git 设置加入版本号、旧键迁移、无效值清洗和安全默认值。
- Extension Manifest 支持 `apiVersion`；旧扩展默认使用 API v1，未来 API 不会被旧 Runtime 静默加载。
- 阶段成果提交并推送到 `main`，但不创建 GitHub Release 或 Tag。

## v0.8.1 — Workbench & Authoring Polish（源码阶段已完成）

- 统一侧栏开关，桌面收起后始终显示恢复入口，移动端保持单一目录抽屉控制。
- Workspace View 与笔记 Tab、Pane 和历史分离；Workspace 卡片提供概览、刷新和受 Dirty State 保护的切换入口。
- 切换时关闭 Provider、Compute 与 Git 会话，并清理 Workspace 范围的工作台和临时 UI 状态。
- 普通 CodeMirror 只编辑 Markdown Body；独立可折叠 Properties 面板读写 YAML Frontmatter 并保留未知字段。
- 格式工具使用统一图标，修复空行和多行 Heading 的内容与光标映射。
- 阶段成果提交并推送到 `main`，但不创建 GitHub Release 或 Tag；正式 Release 保留给完整 `v0.9.0`。

## v0.8.0 — Git & Sync（已完成）

- Local Workspace 通过显式启动的 localhost Git Bridge 连接系统 Git；Bridge 固定仓库根目录，不实现 Git 协议。
- `/git` 提供 Branch / Upstream / Ahead / Behind、Staged / Working tree Status、逐文件 Diff 与最近提交 History。
- 支持文件级 Stage / Unstage 与本地 Commit；未保存编辑器草稿不会进入 Git，并在页面中提示。
- 安全边界包含 Loopback 限制、Origin 白名单、无 Shell `execFile`、仓库相对路径校验与输出大小限制。
- Sync 保持可选；不包含 Clone、Push、Pull、Fetch、Branch 操作、OAuth、私有仓库认证、远程凭据或冲突解决器。

## v0.7.0 — Structured Knowledge（已完成）

- 从每篇 Markdown 的 YAML Frontmatter 建立运行时 `PropertyIndex`，保持 Markdown 为唯一数据源。
- 新增 `/database`，提供 Table、Card、List 三种共用查询结果的阅读视图。
- 支持 `=`、`!=`、大小写无关键和 `AND`；查询值覆盖字符串、数字、布尔值、`null` 与数组成员。
- 查询与视图写入 `q`、`view` URL 参数，便于同一 Workspace 中的书签和链接分享。
- 明确不建设 SQL/私有数据库、复杂布尔或范围查询、排序聚合、保存视图和数据库写回编辑。

## v0.6.0 — Extension Platform

- Extension API 支持 Command、View、Sidebar Item、Markdown Processor、Editor Extension、Settings、Status Bar Item、Workspace Provider 与 Compute Provider。
- Manifest 固定 `id/name/version/minTensorNoteVersion`，本地扩展另声明 `entry` 与权限。
- Runtime 明确管理 `load/activate/deactivate/dispose`，停用时自动清理贡献。
- 权限模型包含 `workspace:read`、`workspace:write`、`network`、`compute`、`secret`；高风险能力在本地加载时单独提示。
- 首期只支持 Official / Local Plugins，不建设公共在线插件市场。
- 官方 Focus Mode 作为首个 API 使用者，验证命令、视图、侧栏、设置和状态栏路径。

## v0.5.0 — Workbench

已把单页 Reader/Editor 提升为适合长期使用的 Knowledge IDE，包含：

- 多标签页、固定标签、左右分栏与 Pane。
- 最近文件、前进/后退历史。
- 可组合的左右 Sidebar，以及 Lab、Properties、Outline、Backlinks 等右侧视图。
- 统一 `CommandRegistry` 和 `Ctrl/Cmd + P` Command Palette。
- Editor Productivity：格式工具栏、编辑命令与快捷键。

### Markdown 格式工具栏

编辑器顶部增加简约、圆润、可折叠的工具栏。桌面端展示常用操作，窄屏把低频操作收进 `More` 菜单。

首批命令范围：

| 类别 | 命令 |
| --- | --- |
| 文本结构 | Paragraph、Heading 1–6 |
| 行内格式 | Bold、Italic、Strikethrough、Inline Code |
| 引用与链接 | Link、Image、Blockquote、Callout |
| 列表 | Bullet List、Numbered List、Task List |
| 块内容 | Code Fence + Language、Table、Horizontal Rule、Math Block |

工具栏按钮不能拥有独立的字符串拼接逻辑。每个动作注册为统一 Editor Command，由工具栏、快捷键和 Command Palette 共同调用：

```ts
interface EditorCommand {
  id: string
  label: string
  icon: string
  keybinding?: string
  isAvailable(context: EditorCommandContext): boolean
  execute(context: EditorCommandContext): void
}
```

首批快捷键：

- `Ctrl/Cmd + B`：加粗。
- `Ctrl/Cmd + I`：斜体。
- `Ctrl/Cmd + K`：插入链接。
- `Ctrl/Cmd + P`：打开 Command Palette。
- `Ctrl/Cmd + S`：保存。

### 编辑行为

- 有选区时包裹、切换或转换选中内容；再次执行尽可能移除格式。
- 无选区时插入完整 Markdown 语法，并把光标放在下一步输入位置。
- 标题、引用和列表支持当前行及多行选区，保留合理缩进。
- Code Fence 默认使用 `python` 语言；存在选区时把选中文字放入 Fence。语言选择器将作为 v0.5.x 的可配置编辑增强继续迭代。
- 每次命令形成一个 Undo 单元，执行后恢复编辑器焦点和合理选区。
- 只读 Workspace 中所有写入命令禁用，并说明原因。
- 产物始终是标准或可降级阅读的 Markdown，不保存私有富文本结构。

### UI 与可访问性

- 延续淡绿色、简约、现代、圆润、柔和的 TensorNote 设计语言。
- 明亮和暗色主题均保持图标、激活态、Tooltip 与编辑内容的对比度。
- 按钮提供 Tooltip、快捷键提示、ARIA Label 和可见的键盘焦点。
- 工具栏支持键盘导航，不抢占编辑器正常输入。

### 验收标准

- 选中文字点击 Bold 后得到 `**selected text**`，再次执行可移除。
- Heading 只改变当前行或选中行前缀，不破坏正文。
- Code Fence 语言可选，选中内容被完整保留。
- 所有格式动作都支持 Undo / Redo。
- Toolbar、快捷键和 Command Palette 调用相同命令实现。
- Reading、Editing、Split Mode 切换后草稿和 Dirty State 保持稳定。
- 通过明暗主题、桌面/窄屏、只读/可写 Workspace 的界面回归检查。

实现与验证记录在 `docs/releases/v0.5.0.md`；v0.5.0 后续小版本将继续补齐 Slash Commands、最近使用命令与可配置工具栏。

## 后续编辑增强

- `v0.5.x`：Slash Commands、最近使用命令、可配置工具栏。
- `v0.6.x`：插件注册 Editor Command、补全源和自定义工具按钮。
- `v0.7+`：选区浮动工具条、模板、智能粘贴、WikiLink / Tag 补全。
- Future：可选 Live Preview，但始终保留可直接编辑和导出的 Markdown Source Mode。

这些增强都复用 `CommandRegistry` 和后续 Editor Extension API，避免形成互不一致的第二套编辑系统。
