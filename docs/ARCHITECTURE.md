# TensorNote 架构说明

本文记录从 `v0.1.0 — Workspace Foundation` 到 `v0.8.3 — Recovery` 的已落地稳定边界。长期路线图仍是产品决策的上位文档；后续版本必须在这些边界上增量演进。

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
- 无配置的 Workspace 默认 `executable: false`。
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
- 只有 `features.executable: true` 且当前 Revision 已受信任时，远程 Workspace 才能触发 Jupyter 执行。
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

## 版本更新规则

每个版本至少同步更新：

1. `package.json` 版本号与 Release notes。
2. Schema、Provider capability 或安全边界的文档。
3. 单元测试、浅/深主题浏览器验收和生产构建。
4. Git commit、push；正式版本再创建对应 `vX.Y.Z` Tag/Release。
