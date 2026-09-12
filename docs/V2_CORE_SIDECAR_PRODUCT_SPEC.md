# TensorNote 2.0 核心收缩、Sidecar 架构与双宿主产品重构规范

> 本文是 TensorNote 下一阶段重构的总产品规范、架构规范与 Codex 实施约束。
>
> 本文用于替代此前关于“核心收缩”“Sidecar 重构”“三端设计”的零散方案。
>
> Codex 开始实施前，必须先完整阅读当前仓库最新代码，以真实代码、依赖关系和当前分支为准，不依赖本文中的旧行号或历史实现假设。

仓库：

```text
https://github.com/AaronChou313/tensornote
```

当前已知基线约为：

```text
v1.18.x
```

---

# 1. 重构目标

TensorNote 当前已经逐渐从一个有明确特色的 Markdown 技术笔记工具，扩展为包含：

* Markdown 编辑器
* WikiLinks
* Backlinks
* Graph
* Structured Database
* Git Workspace
* Command Palette
* Extension Platform
* Jupyter
* Local Runtime Assistant
* Project Experiment
* Publish
* Agent Skill
* 多种 Provider
* 多种 Compute Connector
* 多种 Deployment Mode
* Desktop / Local Web / Static Web / Self-hosted Web

在内的综合知识工作台。

这些功能独立看都有价值，但整体已经出现明显问题：

1. 产品定位逐渐模糊；
2. 一级功能入口过多；
3. UI 和状态管理复杂；
4. 多端能力矩阵不断膨胀；
5. 需要维护大量并非核心价值的基础设施；
6. TensorNote 最早、最有辨识度的设计没有成为产品中心。

本次重构不是简单“删功能”。

而是：

> **重新确定 TensorNote 未来几年都应保持稳定的产品核心。**

---

# 2. TensorNote 2.0 核心定义

TensorNote 重新定义为：

> **一个面向技术学习、课程笔记和科研记录的 Markdown 笔记软件，通过 Sidecar 模型将主体知识叙事与数学推导、可执行代码等复杂扩展内容分离。**

核心体验：

```text
主体 Markdown 笔记
        │
        │ 点击扩展入口
        ▼
统一 Side Panel
        │
        ├── 数学推导
        │
        └── Jupyter 实验
```

产品核心不再是：

```text
Knowledge Workspace
```

而是：

```text
Narrative Note
+
Contextual Sidecar
```

---

# 3. TensorNote 要解决的核心问题

传统 Markdown 很适合：

* 连续文字
* 图片
* 公式
* 代码片段
* 技术文章

但不擅长组织：

* 很长的数学推导；
* 大段证明；
* 可执行实验；
* 多 Cell Jupyter 内容；
* 会打断主线阅读的复杂补充材料。

Jupyter Notebook 又存在另一个问题：

```text
正文
代码
输出
正文
代码
输出
```

全部纵向混合。

对于课程笔记和算法讲解来说，阅读节奏容易被打断。

TensorNote 应提供另一种模式：

```text
左/中：知识主线
右：按需展开复杂细节
```

例如：

```text
Self-Attention 的基本思想是……

[查看完整推导 →]

进一步我们可以通过代码验证……

[打开 Python 实验 →]
```

读者只想理解概念时：

不需要看复杂推导和代码。

需要深入时：

点击对应入口，在右侧展开。

---

# 4. TensorNote 2.0 三层核心架构

整个产品只保留三个核心层级：

```text
Markdown Note
      │
      ▼
Sidecar
      │
      ▼
Runtime
```

---

# 5. 第一层：Markdown Note

Markdown 是 TensorNote 的唯一内容事实来源。

必须坚持：

* 普通 `.md` 文件；
* 任意文本编辑器均可读取；
* 任意 Markdown 工具均可打开主要内容；
* 不建立私有富文本数据库；
* 不把正文转换成不可迁移结构；
* Sidecar 失效时原始内容仍然可人工恢复；
* 用户知识文件始终属于用户。

核心 Markdown 能力：

* 标题
* 列表
* 表格
* GFM
* 图片
* 链接
* 代码
* KaTeX
* Mermaid
* Frontmatter
* 基础 WikiLink
* 文件附件

---

# 6. 第二层：Sidecar

Sidecar 是 TensorNote 2.0 最重要的新一级概念。

定义：

> 与正文某个知识点相关，但不应该持续占据主阅读流的大块扩展内容。

第一阶段只允许两个正式类型：

```text
derivation
jupyter
```

---

# 7. Derivation Sidecar

用于：

* 数学推导
* 定理证明
* 公式展开
* 中间计算
* 辅助解释
* 复杂算法步骤

典型场景：

正文：

```text
Scaled Dot-Product Attention 使用 √dk 进行缩放。

[查看为什么需要缩放 →]
```

右侧：

```text
Var(qᵢkᵢ) = ...
Var(QKᵀ) = dk
...
```

Derivation 本身继续使用 Markdown。

支持：

* KaTeX
* Markdown
* 代码块
* 表格
* 图片
* Mermaid

---

# 8. Jupyter Sidecar

用于：

* Python 示例
* 算法验证
* 小型实验
* 数值计算
* 模型结构演示
* 数据处理示例
* 可交互课程实验

Jupyter Sidecar 支持：

```text
多个 Cell
Run Cell
Run All
Restart
Interrupt
Clear Output
保存代码回 Markdown
```

Jupyter Sidecar 是 Sidecar 的一种。

Jupyter 不再拥有独立的产品级 Drawer 概念。

---

# 9. 第三层：Runtime

Runtime 只服务 Jupyter Sidecar。

包括：

```text
Jupyter Client
Compute Runtime
Kernel
Python Environment
Local Jupyter Server
Remote Jupyter
```

Runtime 不是产品中心。

用户应该感觉：

> 点开实验，就能运行。

而不是：

> 我进入了一个复杂的 Python Runtime 管理平台。

---

# 10. 新产品结构

核心保留：

```text
Markdown
Files
Search
Editor
Reader
Sidecar
Jupyter
Runtime
Theme
Recovery
```

删除或降级：

```text
Graph
Database
Git Workspace
Command Palette
Extension Platform
Project Experiment
Split Pane
Plugin Status Bar
复杂知识工作台入口
```

---

# 11. 产品形态从“三端”调整为“双宿主”

当前 TensorNote 在产品层面实际上存在：

```text
Local Web
Static Web
Self-hosted Web
Desktop
```

历史上又常被用户理解成：

```text
在线版
本地 Web
本地桌面版
```

TensorNote 2.0 不再把它们视为三个或四个平级产品。

改成：

```text
TensorNote Core
      │
      ├── Desktop Host
      │
      └── Web Host
```

正式产品只有：

```text
TensorNote Desktop
TensorNote Web
```

---

# 12. TensorNote Desktop 定位

Desktop 是 TensorNote 的主产品。

定位：

> **面向日常技术学习、科研记录和课程笔记创作的本地 Markdown + Sidecar 笔记软件。**

承担：

```text
写
读
改
整理
运行
```

完整能力：

* 原生本地 Workspace
* Markdown 阅读
* Markdown 编辑
* 文件树
* 搜索
* Sidecar
* Derivation
* Jupyter
* 本地 Python
* Conda
* uv
* venv
* Jupyter Server
* Kernel
* Remote Jupyter
* 文件拖放
* 文件关联
* 原生目录
* Updater

以后：

> README、官网和普通用户文档默认介绍的 TensorNote 应优先指 Desktop。

---

# 13. TensorNote Web 定位

Web 不再试图成为 Desktop 的“浏览器完整版”。

重新定位为：

> **无需安装即可阅读、分享和轻量使用 TensorNote 笔记的 Web Companion。**

主要任务：

```text
阅读
分享
传播
预览
```

核心能力：

* Markdown Reader
* 文件树
* Sidecar
* Derivation
* Jupyter Sidecar 内容展示
* GitHub Workspace
* 在线公开笔记
* 基础搜索
* 响应式阅读

可选高级能力：

* 浏览器本地目录
* 浏览器支持时编辑本地 Markdown
* HTTPS Remote Jupyter

这些能力可以存在。

但不作为 Web 的核心产品承诺。

---

# 14. Web 与 Desktop 的产品区别

| 能力                 | Desktop      | Web     |
| ------------------ | ------------ | ------- |
| 产品定位               | 创作 + 阅读 + 运行 | 阅读 + 分享 |
| Markdown 阅读        | 核心           | 核心      |
| Markdown 编辑        | 核心           | 可选      |
| 文件树                | 核心           | 核心      |
| Sidecar            | 核心           | 核心      |
| Derivation         | 核心           | 核心      |
| Jupyter Sidecar 阅读 | 核心           | 核心      |
| 本地 Jupyter         | 核心           | 不提供     |
| 本地环境管理             | 核心辅助能力       | 不提供     |
| Conda/uv/venv      | 支持           | 不支持     |
| Remote Jupyter     | 支持           | 可选      |
| 本地文件               | 原生           | 浏览器能力决定 |
| GitHub Workspace   | 可选           | 重要      |
| 分享                 | 生成链接         | 核心      |
| 安装                 | 需要           | 不需要     |

不要追求：

```text
两端功能 100% 一致
```

核心要求是：

```text
内容格式一致
阅读体验一致
Sidecar 行为一致
```

---

# 15. 取消 Local Web 作为正式 Edition

当前 Local Web 主要承担：

* 浏览器目录读写
* localhost Jupyter
* Git Bridge

核心收缩后：

Git Bridge 将删除。

浏览器目录读写与 Static Web 高度重叠。

Local Web 剩余的主要独占优势只有：

```text
localhost Jupyter
```

为了这一项能力长期维护：

```text
Local Web Release 包
Node.js 用户启动器
local-web-server
package-local-web
专门文档
专门 Feature Matrix
专门测试
```

投入产出比过低。

因此：

> TensorNote 2.0 不再把 Local Web 作为正式用户产品发布和宣传。

---

# 16. Local Web 仍可作为开发方式

注意：

取消 Local Web Edition 不等于删除浏览器开发模式。

保留：

```bash
pnpm dev
```

用于：

* 前端开发
* UI 调试
* Web Host 测试
* Markdown 渲染测试
* Sidecar 调试

它属于：

```text
Development Runtime
```

而不是：

```text
User Edition
```

---

# 17. Self-hosted Web 定位变化

Self-hosted Web 不再视为单独产品形态。

它只是：

> TensorNote Web 的一种部署方式。

例如：

```text
TensorNote Web
├── GitHub Pages
├── Cloudflare Pages
├── Netlify
├── Vercel
├── Nginx
└── Self-hosted container
```

产品只有一个：

```text
TensorNote Web
```

部署方式可以很多。

---

# 18. PWA 定位

PWA 继续作为 Web Host 的增强方式。

它不是新的 Edition。

PWA 可以提供：

* App Shell 缓存
* 快捷启动
* 安装到桌面
* 一定程度离线阅读

但不能宣传为：

```text
TensorNote PWA Edition
```

---

# 19. DeploymentAdapter 重构

当前：

```ts
type DeploymentMode =
  | 'static'
  | 'local'
  | 'self-hosted'
  | 'desktop'
```

这种设计把：

```text
产品能力
部署方式
宿主环境
```

混合到一个概念中。

TensorNote 2.0 应逐渐拆分。

目标：

```text
Host
├── web
└── desktop
```

Web 的部署信息只是：

```ts
interface WebDeploymentConfig {
  router: 'hash' | 'browser'
  basePath: string
  pwa: boolean
}
```

不要再让：

```text
static
local
self-hosted
```

成为产品级能力判断。

---

# 20. HostAdapter

HostAdapter 可以保留。

因为 Desktop 与 Web 的能力确实真实不同。

推荐：

```text
HostAdapter
├── WebHostAdapter
└── DesktopHostAdapter
```

Host 决定：

* 原生文件系统能力
* 本地进程能力
* Python 环境能力
* Owned Jupyter 能力
* Updater
* Native drag/drop

而不是 DeploymentMode 决定。

---

# 21. Workspace Provider

Workspace Provider 是当前架构中值得保留的抽象。

继续支持：

```text
Native Local Workspace
Browser Local Workspace
GitHub Workspace
Bundled Demo Workspace
```

原因：

这是实际存在的内容来源差异。

不要因为产品收缩而粗暴删除 Provider 架构。

但 Provider 不应继续扩展成插件 API。

---

# 22. Compute Provider

Compute Provider 也可以保留。

原因：

Jupyter Runtime 存在真实差异：

```text
本地 Desktop-owned Jupyter
用户手动 Jupyter
Remote Jupyter
JupyterHub
BinderHub
```

底层抽象可以存在。

但 UI 不要把这些底层概念直接暴露给普通用户。

---

# 23. 正式功能保留清单

## Markdown

保留：

* Markdown Reader
* Markdown Editor
* GFM
* KaTeX
* Mermaid
* Images
* Code highlighting
* Frontmatter
* Relative links
* WikiLinks

---

## Workspace

保留：

* 打开目录
* 文件树
* 新建笔记
* 删除
* 重命名
* 移动
* 保存
* 外部修改冲突保护

---

## Search

保留：

* 全文搜索
* 标题搜索
* 文件名搜索

不需要 Command Palette。

---

## Recovery

保留：

* Draft Recovery
* Crash Boundary
* Dirty protection

---

## Jupyter

保留：

* ComputeRuntime
* JupyterComputeProvider
* JupyterClient
* CodeCell
* CellOutput
* Kernel lifecycle
* Execute
* Restart
* Interrupt

---

# 24. 删除 Command Palette

删除：

```text
src/components/workbench/CommandPalette*
src/commands/CommandRegistry.ts
src/commands/CommandContext.tsx
```

清理：

```text
CommandRegistryContext
registry.register(...)
Command Palette keyboard binding
Extension Command contribution
```

---

# 25. Editor Command 保留方式

当前：

```text
src/commands/editor.ts
```

中的：

* Bold
* Italic
* Heading
* Link
* List
* Table
* Math
* Code Fence

属于编辑器内部文本变换。

不要删除。

建议移动为：

```text
src/editor/markdownTransforms.ts
```

快捷键和 Toolbar 直接调用。

---

# 26. 删除 Extension Platform

删除：

```text
src/extensions/
src/components/extensions/
src/store/useExtensionStore.ts
examples/extensions/
docs/EXTENSIONS.md
```

清理：

```text
ExtensionRuntime
ExtensionContext
ExtensionManager
ExtensionStatusBar
ExtensionView
Markdown Processor extension
Editor contribution
Provider contribution
Extension permissions
Extension manifest
```

TensorNote 2.0 不建设插件生态。

---

# 27. 不允许 Sidecar 演化成插件平台

第一阶段只允许：

```text
derivation
jupyter
```

内部可以有：

```ts
const sidecarRenderers = {
  derivation: DerivationSidecar,
  jupyter: JupyterSidecar,
}
```

但：

> 这不是公共 Registry。

禁止主动新增：

```text
Plugin Sidecar
Third-party Sidecar
Runtime-loaded Sidecar
JS Sidecar
Extension Sidecar API
Marketplace
```

---

# 28. 删除 Structured Database

删除：

```text
/database
StructuredKnowledgePage
PropertyIndex
Table View
Card View
List View
Structured Query
```

Frontmatter 保留。

但 Frontmatter 不再构成 Notion 式数据库产品。

---

# 29. Graph 与知识系统精简

删除：

```text
/knowledge
KnowledgePage
Graph UI
Local Graph UI
Graph navigation
```

Backlinks：

不再作为一级 UI。

如果底层计算成本低，可以暂时保留。

WikiLink：

保留。

Heading Index：

保留。

不要直接删除整个 `KnowledgeIndex`。

应该拆分：

```text
LinkResolver
HeadingIndex
SearchIndex
```

只有确定不再使用的 Graph 逻辑才删除。

---

# 30. 删除 Git Workspace

删除：

```text
/git
GitWorkspacePage
Git Store
Git Bridge
Git Status
Diff
Stage
Unstage
Commit
```

建议删除：

```text
src/git/
src/pages/GitWorkspacePage.tsx
src/store/useGitStore.ts
scripts/git-bridge*
```

Desktop：

如果 Native Git 仅服务 Git Workspace，也删除：

```text
src-tauri/src/native_git.rs
相关 command
相关 permission
Host nativeGit capability
```

---

# 31. GitHub Workspace 不删除

注意区分：

```text
Git Workspace
```

和：

```text
GitHub Workspace Provider
```

GitHub Workspace Provider 对 Web 阅读公开笔记非常重要。

继续保留：

```text
GitHubWorkspaceProvider
```

---

# 32. 删除 Project Experiment

删除：

```text
src/experiments/
ExperimentPage
ExperimentCard
Project Experiment Manifest
Experiment Runtime
Experiment Preset
Artifact History
torchrun UI
requirements Experiment 流程
```

Desktop：

如果：

```text
experiment_runtime.rs
```

只服务该系统，也删除。

---

# 33. BinderHub 的处理

不要因为删除 Project Experiment 而自动删除 BinderHub。

如果 BinderHub：

仍能作为：

```text
Jupyter Sidecar 的远程 Runtime
```

则保留。

否则删除。

Codex 实施时先检查实际依赖。

---

# 34. Split Pane 删除

当前：

```text
Main Pane
Secondary Pane
Side Context
Lab Drawer
```

复杂度过高。

TensorNote 2.0：

```text
File Tree
+
Single Note Area
+
Single Side Panel
```

可以保留 Tabs。

删除：

```text
Secondary Pane
Pane Position
Split controls
Split scroll sync
```

---

# 35. Tabs

Tabs 可以保留。

原因：

用户确实可能同时打开：

```text
Self Attention
Multi-head Attention
Transformer
```

但一个时间只展示：

```text
一个主体笔记
+
一个 SidePanel
```

---

# 36. 统一 SidePanel

当前：

```text
WorkbenchRightSidebar
LabDrawer
Extension View
```

分别竞争右侧空间。

TensorNote 2.0 只允许一个：

```text
SidePanel
```

---

# 37. SidePanel 行为

SidePanel：

* 默认关闭；
* 点击 Sidecar Trigger 打开；
* 一个时间只显示一个 Sidecar；
* 点击另一个 Trigger 时替换；
* 支持拖动调整宽度；
* 保存宽度偏好；
* 切换笔记时关闭；
* 保持正文滚动位置；
* 关闭 SidePanel 不影响正文。

建议 Desktop：

```text
默认宽度 520–620px
```

允许：

```text
400–850px
```

范围内调整。

---

# 38. 右栏旧功能重新安置

当前 Right Sidebar 中：

```text
Properties
Outline
Backlinks
Graph
```

改为：

### Properties

移动到编辑模式顶部折叠 Frontmatter 区。

### Outline

移动到：

```text
TopBar → Outline
```

通过 Popover 展示。

或者：

```text
Sidebar Files / Outline
```

切换。

### Backlinks

从主 UI 移除。

### Graph

删除。

---

# 39. Sidecar 源码结构

建议新增：

```text
src/sidecar/
├── types.ts
├── parser.ts
├── store.ts
├── SidePanel.tsx
├── SidecarTrigger.tsx
├── DerivationSidecar.tsx
├── JupyterSidecar.tsx
└── legacyLabAdapter.ts
```

---

# 40. Sidecar 类型

建议：

```ts
interface SidecarBase {
  id: string
  title: string
  sourceStart: number
  sourceEnd: number
}

interface DerivationSidecar extends SidecarBase {
  type: 'derivation'
  markdown: string
}

interface JupyterCell {
  id: string
  title?: string
  language: 'python'
  code: string
  sourceStart: number
  sourceEnd: number
}

interface JupyterSidecar extends SidecarBase {
  type: 'jupyter'
  cells: JupyterCell[]
}

type Sidecar =
  | DerivationSidecar
  | JupyterSidecar
```

---

# 41. Sidecar Store

建议：

```text
activeNoteId
activeSidecarId
isOpen
width
```

方法：

```text
openSidecar()
closeSidecar()
setWidth()
```

不要创建复杂的：

```text
Sidecar Session Manager
Sidecar Provider
Sidecar Extension Runtime
```

---

# 42. Markdown Sidecar 语法

推荐统一使用 Directive。

例如：

```markdown
:::tensornote{type="derivation" id="attention-scale" title="为什么除以 √dk"}

## 推导

设：

$$
q_i,k_i \sim \mathcal N(0,1)
$$

那么……

```
