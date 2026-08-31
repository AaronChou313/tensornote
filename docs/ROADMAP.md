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
