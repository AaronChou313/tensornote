# TensorNote 架构说明

本文记录从 `v0.1.0 — Workspace Foundation` 到 `v1.0.0 — Stable Platform` 的已落地架构边界。长期路线图仍是产品决策的上位文档；后续版本必须在这些边界上增量演进。

## 产品定义

TensorNote 是一个本地优先、Markdown 优先、可执行但不强制执行的知识 Workspace。Markdown 与资源文件是可移植的事实来源；Jupyter 只是按需连接的执行后端。

## Workspace 加载链路

```text
URL / Home action
        │
        ▼
WorkspaceProvider ── capabilities / descriptor
        │
        ▼
loadWorkspace ── tensornote.yaml / safe defaults
        │
        ├── Markdown parse + Lab extraction
        ├── filesystem navigation index
        ├── KnowledgeIndex
        └── PropertyIndex
        │
        ▼
WorkspaceSession ── UI / search / reader / lab
```

UI 读取 `WorkspaceSession.capabilities` 和通用 descriptor，不直接依赖本地目录或 GitHub API 的实现细节。

## v0.1 Providers

| Provider | 读取 | 写入 | Binary | Git | 说明 |
| --- | --- | --- | --- | --- | --- |
| Bundled | 是 | 否 | 是 | 否 | 内置 AI Learning Notes 示例 |
| Local | 是 | 是 | 是 | 可选 | File System Access API；v0.8 可连接显式启动的 Local Git Bridge |
| GitHub | 是 | 否 | 是 | 只读元数据 | 公开 Repository，内容固定到解析出的 commit SHA，不连接 Local Git |

`WorkspaceProvider` 统一暴露读取方法。写入 Provider 通过 `writeText`、`writeBinary`、`createDirectory`、`removeEntry`、`copyEntry`、`moveEntry` 和 `watch` 扩展；UI 只读取 capability，不绕过 Provider。

## v0.2 Authoring Pipeline

```text
Local file + source stat
        │
        ▼
Markdown draft ── CodeMirror history / dirty state
        │                         │
        ├── live parse ───────────┴── Preview
        ├── Frontmatter UI ────────── raw Markdown
        ├── Asset insert ──────────── assets/
        └── Save(expected stat)
                    │
          conflict ─┴─ write + re-index
```

- 保存携带打开时的 `modifiedAt` 与 `size`，外部变化时抛出 `WorkspaceConflictError`，避免静默覆盖。
- Local Provider 使用轮询检测外部文件变化；用户可以重新载入，或明确选择保留当前内容并覆盖。
- 新建、复制和属性编辑都会生成或保留普通 YAML Frontmatter；不建立内容数据库。
- Lab Drawer 使用 executable Fence 的 `lab` 与 `cell` 标识，把编辑后的 Python 精确写回原 Markdown。
- 资源粘贴、拖放与上传统一写入 manifest 的 `assets.root`，正文只插入相对 Markdown 链接。

## v0.3 KnowledgeIndex

```text
Markdown + Frontmatter
        │
        ├── headings / aliases / tags / properties
        ├── WikiLink / Markdown link / embedded note
        ▼
KnowledgeIndex
        ├── linksBySource
        ├── backlinksByTarget
        ├── headingsByDocument
        ├── tagsByDocument
        ├── propertiesByDocument
        ├── Search v2
        └── Local Graph
```

- `KnowledgeIndex` 属于 `WorkspaceSession`，每次打开、刷新或保存后从 Markdown 重建，不持久化为数据库。
- WikiLink 可以通过文档 `id`、标题、Alias、文件名或路径解析；Heading Fragment 映射到稳定的 Markdown slug。
- 标准相对 `.md` 链接与 WikiLink 共同进入出向链接/反向链接索引；外部 URL 不进入知识关系。
- Embedded Note 在渲染阶段展开目标 Markdown，并阻止循环嵌入；源文件不被改写。
- Search v2 对 Title、Alias、Tag、Heading、Path、Property 和 Body 分字段加权，同时仍索引代码正文。
- Local Graph 只显示当前笔记、显式一跳链接和少量共享 Tag 节点，避免过早构建不可读的全局大图。

## `tensornote.yaml` v1

```yaml
schemaVersion: 1
workspace:
  name: My Workspace
  description: Optional description
content:
  root: notes
assets:
  root: assets
navigation:
  mode: filesystem
features:
  executable: false
environment:
  files:
    - requirements.txt
```

- 未提供配置时仍可打开普通 Markdown 文件夹。
- 无配置的 Workspace 默认 `executable: false`；用户可在 Compute 设置中保存仅限当前浏览器、当前 Workspace 的显式执行授权。
- 未知顶层字段被忽略；扩展元数据放在 `extensions`。
- 文档 `id` 必须在 Workspace 内唯一。
- `environment.files` 是环境入口提示；缺失或存在都会展示，但 TensorNote 不自动安装。

## v0.4 Compute Layer

```text
Lab UI / Scratch Lab
        │
        ▼
ComputeRuntime ── profile + context + scope key
        │
        ▼
ComputeProvider ── connect / session / kernels / diagnose
        │
        ▼
JupyterComputeProvider ── JupyterClient
```

- UI 依赖 `ComputeRuntime` 与通用类型，不再直接持有全局 `JupyterClient`。
- `ComputeProfile` 保存 Provider 类型、Server URL、Kernel Name 与 Scope；Token 单独进入 `sessionStorage`。
- `Per note` 的 scope key 包含 Workspace 和 Note；`Per workspace` 与 `Manual` 在笔记导航间复用 Session。
- Profile、连接配置、Workspace 或 Per-note 上下文不兼容时，Runtime 先关闭旧 Session，再按需创建新 Session。
- `JupyterComputeProvider` 负责 REST、Kernel 与 WebSocket 适配；未来 Provider 需要实现同一连接、执行、控制和诊断契约。
- Scratch Lab 只维护内存 Cell；`Insert into note` 通过 Lab Parser 生成 executable Fence，且写入仍经过 Provider 的冲突保护。
- Environment detection 合并 manifest 声明与根目录常用文件，仅输出存在状态，不触发包管理器。
- Diagnostics 使用临时 Provider；WebSocket 检查创建并立即关闭探测 Kernel，不复用活动 Session。

## 信任与凭据边界

- GitHub Workspace 默认只读、未受信任，信任键固定到 `owner/repo@commitSHA`；Repository 更新后必须重新信任。
- 执行策略合并 manifest 默认值与当前浏览器的 Workspace 级显式授权；未来版本 manifest 始终禁用执行。
- GitHub Workspace 即使已手动开启执行，仍需信任固定到当前 `owner/repo@commitSHA` 的 Revision。
- Jupyter Token 只写入 `sessionStorage`，关闭浏览器会话后清除；长期配置只保存 Server URL 与 Kernel Name。
- Workspace 配置不得包含 Token、密码或云端密钥。
- 诊断错误在显示前对当前 Token 脱敏；环境声明不会被当作安装授权。

## v0.4 当前明确不做

v0.4 不提供自动安装 Python 环境、后台常驻 Kernel、全局巨型图、数据库视图、插件市场、AI 辅助或多人协同。Workbench、Extensibility 与 Structured Knowledge 将继续按路线图演进。

## v0.5 Workbench

```text
AppShell
  ├── Sidebar (Files / Search)
  ├── TopBar + WorkbenchTabs
  ├── Pane main [+ secondary]
  │     └── NoteEditor / Markdown preview
  ├── Workbench right sidebar
  │     └── Properties / Outline / Backlinks / Graph / Lab
  └── CommandPalette
```

- `src/workbench/useWorkbenchStore.ts` 保存可替换的用户工作台状态：标签、固定状态、窗格、激活窗格、最近文件、导航历史和侧栏视图。它不保存 Markdown 内容。
- `src/commands/CommandRegistry.ts` 是 UI 操作的单一注册入口。TopBar、Command Palette 与编辑器将各自的动作注册为 Command；将来扩展只需注册新的 command/view，不需要在 `App.tsx` 增加分支。
- `src/commands/editor.ts` 提供纯 Markdown transform。工具栏、快捷键和 Command Palette 均调用同一 transform；CodeMirror 使用单次 dispatch，因此每个格式动作是一个 Undo 单元。
- Workbench 只协调路由、WorkspaceSession 与现有 ComputeRuntime。Provider 的读写能力、保存冲突和 Jupyter 生命周期仍由已有的 Workspace / Compute 层拥有。

## v0.6 Extension Runtime

```text
Manifest + user grants
        │
        ▼
ExtensionRuntime ── load / activate / deactivate / dispose
        │
        ├── CommandRegistry
        ├── View / Sidebar / Status Bar
        ├── Markdown Processor / CodeMirror Extension
        ├── Settings
        └── Workspace / Compute Provider contributions
```

- `src/extensions/ExtensionRuntime.ts` 拥有扩展记录和贡献生命周期；每个注册项都归属扩展，停用时统一撤销。
- Command 直接进入核心 `CommandRegistry`；渲染器和编辑器只消费活动贡献，不感知插件来源。
- Manifest 先通过格式、版本、权限和 id 验证；贡献 id 必须使用扩展 id 命名空间。
- 权限调用同时要求 Manifest 声明和用户授权。`workspace:write`、`network`、`compute` 与 `secret` 在 UI 中标为高风险。
- 本地脚本在权限确认后才通过 Blob URL 导入，但仍是浏览器同源可信代码；能力门控不构成 JavaScript 沙箱。
- v0.6 只支持官方和手动选择的本地插件，不包含发现、下载、签名、自动更新或公共市场。

## v0.7 Structured Knowledge

```text
Markdown Frontmatter
        │
        ▼
PropertyIndex (WorkspaceSession, runtime only)
        ├── rows: Note + raw properties
        ├── fields: key / type / document count / display values
        └── query(expression)
                │
                ▼
/database?q=...&view=table|card|list
```

- `src/content/propertyIndex.ts` 从 `Note.properties` 建立行和字段索引；它不解析或写入独立数据库，不保存用户内容副本。
- `WorkspaceSession` 在打开、刷新与保存的现有重建链路中持有 `PropertyIndex`；外部编辑后的结果以重新读取 Markdown Workspace 为准。
- 查询仅支持 `=`、`!=` 和以空白分隔的 `AND`。属性键比较不区分大小写；值按字符串、数字、布尔值、`null` 精确比较，数组按任一成员匹配。
- `/database` 是纯读取 UI。Table 展示比较列，Card 展示摘要和非空属性，List 用于紧凑扫描；`q` 与 `view` 存在 URL 中，便于书签和分享。
- 查询执行在浏览器运行时索引中，不执行 SQL、YAML、Markdown 或用户脚本。当前不提供 `OR`、范围、排序、聚合、保存视图或写回编辑。
- 完整用户语法与限制见 [Structured Knowledge 使用指南](STRUCTURED_KNOWLEDGE.md)。

## v0.8 Local Git Layer

```text
Local Workspace capability
        │
        ▼
/git + LocalGitClient
        │ HTTP / JSON, loopback only
        ▼
Git Bridge (fixed repository root)
        │ execFile('git', args), no shell
        ├── status --porcelain=v2
        ├── diff / diff --cached
        ├── log
        ├── add / restore --staged
        └── commit
```

- 浏览器的 File System Access API 不暴露绝对路径，也不能执行系统 Git；因此 Git 不进入 `LocalWorkspaceProvider` 的文件 I/O 实现，而由独立、可选的 localhost Bridge 适配。
- `WorkspaceCapabilities.git` 表示来源具有 Git 语义。只有 `type === local` 的 Workspace 注册 `/git` 入口；GitHub Provider 的 Git 能力仍是固定 Revision 的只读元数据。
- `scripts/git-bridge.mjs` 启动时要求一个仓库根目录，绑定 `127.0.0.1`，并通过 Origin 白名单限制浏览器调用。浏览器客户端进一步拒绝非 Loopback URL。
- Bridge 只暴露结构化 Status、Diff、History、Stage、Unstage 和 Commit API。所有 Git 调用使用 `execFile` 参数数组，不经过 Shell；路径必须是仓库内相对路径。Diff 禁止 external diff/textconv，Bridge Commit 禁用 Repository Hook 与自动 GPG 签名。
- Stage 与 Commit 是明确用户操作。Commit 只提交 Git Index 中已有内容；页面不会自动 Stage 全仓库，也不会执行 Push。
- Git Store 只持有 Bridge URL、当前状态、History 与选中 Diff，不保存 Markdown 内容、凭据或 Git 对象。
- v0.8 不实现 Git 协议、Clone、Push、Pull、Fetch、Branch 写操作、远程认证、冲突编辑器、Merge、Rebase 或 Reset。
- 完整配置与安全说明见 [Local Git 使用说明](GIT_AND_SYNC.md)。

## v0.8.1 Workbench & Authoring Reliability

- `/workspace`、`/knowledge`、`/database` 与 `/git` 是 Workspace View，不进入笔记 Tab 或笔记前进/后退历史；笔记路由重新激活对应 Pane。
- `resetWorkspace()` 清理 Tab、Pane、View、最近笔记、历史和侧栏布局；切换 Workspace 时同时关闭 Compute、Git 与 Provider，并清理 Dirty、Lab 和临时对话框状态。
- 切换前统一检查所有编辑器 Dirty Path 和 Lab Dirty State；用户取消确认时不关闭当前 Workspace。
- 普通 CodeMirror 只接收 Markdown Body。`getDocumentBody` / `replaceDocumentBody` 在显示正文与保存完整文件之间保持原始 YAML Frontmatter，包括未知字段。
- 格式工具栏、快捷键与 Command Palette 继续调用同一 Editor Transform；标题转换使用逐行偏移映射保持空行、多行选区和光标位置稳定。
- v0.8.1 是 v0.9.0 前的源码阶段里程碑，不创建独立 Git Tag 或 GitHub Release。

## v0.8.2 Compatibility & Migration

- `schemaVersion: 1` 是当前 Workspace Schema。缺少版本的旧 Manifest 在内存中迁移到 v1，不自动改写用户文件。
- 高于当前版本的 Manifest 仍按已知字段建立基础 Markdown 索引，但 Session 降级为只读并禁用 Git 与执行；兼容状态和警告属于 `WorkspaceSession`。
- App、Workspace、Extension 与 Git 的 Zustand 持久数据声明独立存储版本；迁移函数只保留类型正确、受支持的字段，并兼容早期键名。
- Extension API 当前主版本为 v1。Manifest 可声明 `apiVersion`；省略时兼容早期扩展并按 v1 处理，高于 Runtime 支持版本时明确拒绝。
- v0.8.2 是 v0.9.0 前的源码阶段里程碑，不创建独立 Git Tag 或 GitHub Release。

## v0.8.3 Recovery

- `DraftRecoveryRepository` 以 `Workspace descriptor id + document path` 作为隔离键，默认写入 IndexedDB；不可用时降级到 localStorage。快照有版本与 30 天有效期。
- 草稿只在 Dirty 状态下防抖保存。重新打开笔记时只提示恢复或丢弃，不自动替换文件；正常保存、从磁盘重新载入或丢弃后立即清理。
- 快照携带编辑开始时的 `modifiedAt/size` 基线。恢复后保存继续使用 `WorkspaceConflictError`，不会绕过外部修改保护。
- `RecoveryBoundary` 捕获 React 渲染错误，提供重新加载、返回启动页和复制诊断；诊断只包含错误、路由、时间、组件栈和 User Agent，不包含 Markdown 内容或 Secret。
- v0.8.3 是 v0.9.0 前的源码阶段里程碑，不创建独立 Git Tag 或 GitHub Release。

## v0.8.4 Distribution & Performance

- `DeploymentAdapter` 选择 Static、Local 或 Self-hosted 能力与 Router；Static 使用 Hash Router，避免托管平台必须支持任意 SPA Rewrite。
- PWA Service Worker 只缓存同源 GET 和应用 Shell，更新时清除旧 TensorNote Cache；GitHub/HTTP/Jupyter 数据继续遵守各自网络和安全边界。
- Local Web 可使用 Local Workspace 与 localhost Git Bridge；Static 和 Self-hosted 前端不声称具备未实现的 Server-mounted Workspace。
- Self-hosted 产物使用同一 Vite build、Nginx SPA fallback 和 Docker 镜像；Desktop/Tauri 仍只是未来可选 Runtime Adapter，不复制业务逻辑。
- Workspace 目录递归和文档加载有并发上限；刷新按 Provider 对象、路径、Revision、mtime 与 size 复用解析文档。
- Knowledge Search 预计算规范化字段，链接/标签索引避免数组反复复制；Jupyter Provider 延迟加载；超大文件树每批渲染 200 项。
- 性能门覆盖 1,000 与 10,000 笔记、超过 2MB Markdown 和 1,000 Asset 列表。阈值用于发现数量级回归，不承诺跨设备绝对耗时。
- v0.8.4 是 v0.9.0 前的源码阶段里程碑，不创建独立 Git Tag 或 GitHub Release。

## v0.9.0 Distribution & Hardening

- v0.8.1–v0.8.4 的兼容、恢复、分发与性能边界在 v0.9.0 成为统一发布面。
- AppShell、Workspace Views、NotePage、Built-in Workspace、NoteEditor、Jupyter Provider 与 Mermaid/Graph 相关依赖按路由或功能延迟加载；Home 首屏不再同步装载完整知识库和计算栈。
- 正式支持 Local Web、Static Web 与 Self-hosted Web Runtime；PWA 是可关闭的增强，Tauri 和 Server-mounted Workspace 不属于 v0.9.0 承诺。
- Release Gate 为全量 Vitest、ESLint、TypeScript/Vite Local Build、Static Base Path Build、PWA 产物、Dependency Audit、性能预算、浏览器明暗/桌面/窄屏/路由回归与 `git diff --check`。

## v0.9.1 Editor Experience & Settings

- Workbench 状态按 `main` / `secondary` Pane 分区保存标签、历史和活动笔记；URL 只描述当前活动笔记，不能再被当作两个 Pane 的唯一状态源。
- `split` 创建空白次 Pane，文件树把笔记显式打开到活动 Pane。关闭标签只变更所属 Pane，关闭次 Pane 才销毁其 UI 状态。
- Markdown 文档属性标题与正文 H1 分开：只标记并隐藏与属性标题相同的首个源码 H1，其他 H1 保留在正文渲染树中。
- Lab 激活键由 `noteId + labId` 组成，避免不同笔记的同名 Lab 互相命中；Scratch 写回后使用保存结果立即绑定 LabDrawer。
- `/settings` 是应用设置的唯一主入口；App Store 持久化编辑器默认模式、行号和换行，Compute Store 继续独立管理 Profile 与 Session。
- v0.9.1 是 v0.9.0 后的源码阶段里程碑，不创建独立 Git Tag 或 GitHub Release。

## v0.9.2 Workbench Interaction Refinement

- `closePane(main)` 在次 Pane 存在时原子提升次 Pane 的标签、活动笔记和历史；否则清空所有 Pane 状态并保持 `/notes` 作为不含文档的工作台路由。
- `closePane(secondary)` 只销毁次 Pane，主 Pane 的标签和历史不受影响。Pane 关闭不再依赖全局“关闭次窗格”操作。
- Lab 打开会关闭 Workbench 右侧上下文栏；LabDrawer React key 包含 Workspace、`noteId` 与 `labId`，使相同 Lab ID 在不同笔记中仍获得独立实例。
- 侧栏的 Workspace 标题是来源类型和读写能力的唯一信息面；Workspace popover 不再重复 Overview 路由。顶栏全局搜索入口移除，保留侧栏搜索与 `Cmd/Ctrl + K` 快捷键。
- v0.9.2 是 v0.9.0 后的源码阶段里程碑，不创建独立 Git Tag 或 GitHub Release。

## v0.9.3 Focused Pane Workspace

- `WorkbenchPaneTabs` 与相同 Pane 的内容被组合到一个 `workbench-pane`；每个 Pane 的内容容器独立管理滚动、overscroll 和焦点，页面级容器不再承载双 Pane 的阅读滚动。
- `activePane` 是笔记相关上下文的唯一焦点来源：文件树、编辑命令、右侧属性/目录/反链/图谱和顶栏拆分操作都围绕其当前笔记工作。
- App UI Store 增加短生命周期的 `settingsOpen/settingsSection` 与 `labOpenNonce`。前者驱动自动保存的 Settings Dialog，后者保证重复点击 Lab 也会重建 Drawer，不让隐藏或陈旧实例吞掉请求。
- Python Lab 不再作为 Workbench 右栏标签；右栏只服务当前焦点笔记的 Properties、Outline、Backlinks 和 Graph。
- v0.9.3 是 v0.9.0 后的源码阶段里程碑，不创建独立 Git Tag 或 GitHub Release。

## v1.0.0 Stable Platform

- `src/platform/index.ts` 是面向集成和扩展作者的稳定公开入口；它统一导出产品版本及六项 v1 契约，不要求调用者依赖内部目录布局。
- Workspace Repository Schema v1 固定 `tensornote.yaml` 的已知字段、安全默认值、旧配置内存迁移和未来配置只读降级规则。
- WorkspaceProvider API v1 与 ComputeProvider API v1 固定文件/资产/能力、执行/诊断/生命周期边界；UI 继续依赖 capability 与 Runtime，不识别具体实现。
- Extension API v1 固定 Manifest、权限和贡献点；Executable Markdown Syntax v1 固定可移植 Python Fence 语法。
- Settings / Secret Model v1 区分 Workspace 内容、持久浏览器偏好、恢复状态与会话 Secret；Token 和 Secret 不进入 Markdown、Manifest 或 Git。
- Agent Interface 将同一 v1 契约包装为仓库级 `AGENTS.md`、可安装 Skill、按需 reference、输出模板和无网络依赖的 Workspace 校验器；它不创建第二套内容格式或运行时 API。
- v1.x 允许添加可选字段、可选方法与新贡献点，但不得改变既有字段含义或放宽安全默认值。必须破坏兼容的变化只进入新的主版本。
- 详细的契约、兼容策略和数据归属见 [Platform Contracts](PLATFORM_CONTRACTS.md)。

## v1.1.0 Dual Host Foundation

- `src/host/` 是 Web 与 Desktop 的宿主能力边界；`HostAdapter` 描述运行容器，不替代 WorkspaceProvider 或 ComputeProvider。
- `WebHostAdapter` 不声明任何原生能力；`TauriHostAdapter` 按已验收阶段声明 Desktop Shell、Native Workspace/Git、环境发现和 Owned Process 管理，自动更新仍保持关闭。
- `src/main.tsx` 在 React 挂载前安装 HostAdapter。组件读取 capability，不允许散落检测 `window.__TAURI__`、User Agent 或操作系统分支。
- `src-tauri/` 只承载 Tauri 2 壳、窗口配置和受审 IPC。首阶段唯一命令 `platform_info` 无参数、只返回 OS/Arch/Family；没有 Shell、文件系统或进程插件。
- Web/Static 构建不导入 Desktop 命令实现；Desktop 通过动态边界加载 Tauri API，并继续复用同一 Workspace、Knowledge、Workbench、Editor 与 Compute 核心。
- 详细决策和安全面分别见 [ADR 0001](adr/0001-dual-host-and-host-adapter.md) 与 [ADR 0002](adr/0002-tauri-security-surface.md)。

## v1.2.0 Native Local Workspace

- `NativeLocalWorkspaceProvider` 继续实现 WorkspaceProvider API v1；文档解析、索引、编辑、恢复和冲突 UI 与 Browser Local Provider 共用。
- 原生目录授权只能由 Rust 系统选择器、桌面拖放或已关联 Markdown 打开请求产生。WebView 只获得不透明 Workspace ID、显示名和可选相对笔记路径，不能提交任意绝对路径。
- Rust 注册表保存于应用配置目录；所有文件命令先以 Workspace ID 解析根目录，再校验相对路径、Canonical containment 与 Symlink escape。
- 写入采用同目录原子替换，并复用 `expectedModifiedAt` / `expectedSize` 乐观冲突契约。首版监听通过受限 `stat` 轮询实现，可在不改 Provider API 的前提下升级为事件监听。
- Native Git 只提供 Repository root 校验、Status、History、Diff、Stage/Unstage 与 Commit。参数由 Rust 固定构造并在 `--` 后传入已校验路径；不开放 Shell、任意 Git 参数、凭据、Push 或 Pull。
- Desktop 专属模块由构建期 Host 开关裁剪；`build:web` 会扫描 Static 产物并拒绝任何 Tauri IPC、Native Workspace 或 Native Git 符号。
- 安全决策见 [ADR 0003](adr/0003-native-workspace-capability.md)。

## v1.3.0 Local Runtime Assistant

```text
Settings / HostAdapter
        │ typed requests + opaque IDs
        ▼
LocalRuntimeManager (Rust)
  ├── read-only discovery ── Python / Conda / uv / Jupyter / Kernel / Server
  ├── reviewed plan ──────── managed environment + local Kernel
  └── owned process ──────── loopback Jupyter + bounded redacted logs
        │
        ▼
session-only Compute Profile ── existing ComputeRuntime / JupyterComputeProvider
```

- WebView 只能选择 Rust 已发现并登记的 Tool/Environment Opaque ID，不能提交可执行文件路径、目标路径或任意参数；没有通用 Shell、终端或命令执行 IPC。
- 环境创建分为 plan 与 apply。Plan 固定管理器、Python 版本、应用数据目录内的目标标签、最小包、Kernel 名称、过期时间与精确确认短语；错误确认不会执行命令。
- Managed Environment 只有在环境创建、最小依赖安装、Kernel 注册与 Python 复检全部成功后才写 ready marker。取消或失败会杀掉当前子进程并删除不完整目录。
- Jupyter Server 由 Rust 选择 Loopback 端口和随机 Token，等待端口可用才返回；停止 API 只接受仍在内存所有权表中的 Server ID，应用退出时停止全部 Owned Server。
- 自动生成的 Compute Profile 继续使用 ComputeProvider API v1；Token 只进入 `sessionStorage`，Owned Profile 不持久化，Server 停止时同步移除。外部或远程 Jupyter 仍使用既有手动 Profile。
- Desktop 模块使用构建期开关动态加载；Static 产物扫描新增 `local_runtime_*` 禁止项。完整安全决策见 [ADR 0004](adr/0004-local-runtime-assistant.md)。

## v1.4.0 Publish & Read Anywhere

```text
Public Workspace Repository
  ├── Markdown / Assets / tensornote.yaml / License
  └── thin caller Workflow
             │ workflow_call
             ▼
TensorNote reusable Workflow
  ├── strict Workspace + publication validation
  ├── Static Runtime build @ caller commit SHA
  └── GitHub Pages artifact
             │
             ▼
GitHubWorkspaceProvider ── read-only session ── Share / Fork / Download / Desktop
```

- `publishing` 是 Schema v1 的可选展示投影，不改变内容、Provider capability、执行授权或 Secret 模型。
- Static Reader 的 `publishedWorkspace` 由构建变量提供，只负责启动时选择既有 GitHubWorkspaceProvider；内容仍从作者 Repository 的固定 commit 读取。
- 分享目标由纯函数从 `owner/repo/revision/noteId` 生成，只有完整 40/64 位 Git commit 才能成为可复现 URL。
- DesktopDeepLinkBridge 通过构建期开关加载官方 Deep Link 插件，只接受固定 GitHub commit；应用运行中由 single-instance 转发，切换前复用未保存内容保护。
- 发布检查器组合 Agent Skill 的严格 Workspace validator 与 License、Environment、Presentation、Revision 和凭据文件门，不安装依赖、不执行 Lab。
- 完整决策见 [ADR 0005](adr/0005-publish-read-anywhere.md)，操作流程见[发布指南](PUBLISHING.md)。

## 版本更新规则

每个版本至少同步更新：

1. `package.json` 版本号与 Release notes。
2. Schema、Provider capability 或安全边界的文档。
3. 单元测试、浅/深主题浏览器验收和生产构建。
4. Git commit、push；正式版本再创建对应 `vX.Y.Z` Tag/Release。
