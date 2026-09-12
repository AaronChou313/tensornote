# TensorNote v2.1.x 阅读、索引与 Sidecar 写作体验完善

仓库：

`https://github.com/AaronChou313/tensornote`

当前基线：

`v2.1.0`

本任务暂时**不要处理 Desktop 自动更新**。

当前没有 Apple Developer ID / Windows Code Signing 凭证，因此不要继续扩大 Updater 相关工作，也不要修改现有 Release 签名体系。

本次重点解决：

1. 阅读页面错误预留右侧空白；
2. 不同笔记之间没有独立滚动状态；
3. 同名 Markdown 文件导致知识库无法打开；
4. 完善 Sidecar 写作规范、Skill 和 Markdown 编辑体验。

---

# 一、实施前先阅读真实代码

开始前请先完整检查：

```text
src/pages/NotePage.tsx
src/components/NoteEditor.tsx
src/components/AppShell.tsx
src/components/Sidebar.tsx

src/workbench/useWorkbenchStore.ts
src/workbench/headingNavigation.ts

src/content/document.ts
src/content/noteTree.ts
src/content/knowledgeIndex.ts

src/workspace/loadWorkspace.ts
src/workspace/types.ts

src/sidecar/
src/components/LabInsertDialog.tsx
src/components/LabDrawer.tsx
src/components/SidecarCard.tsx
src/components/MarkdownRenderer.tsx

src/styles.css
src/styles/

skills/tensornote-knowledge-workspace/SKILL.md
skills/tensornote-knowledge-workspace/references/sidecars.md
skills/tensornote-knowledge-workspace/references/knowledge-authoring.md
skills/tensornote-knowledge-workspace/scripts/validate-workspace.mjs
skills/tensornote-knowledge-workspace/assets/
```

以当前真实代码为准。

不要机械照本文文件名修改。

---

# 二、修复阅读模式右侧空白

## 当前问题

当前 CSS 中仍存在：

```css
.mode-read .authoring-stage {
  grid-template-columns: minmax(0, 1fr) 286px;
}
```

这一列过去用于旧 Knowledge Panel。

但是 v2.0 核心收缩以后：

```text
Knowledge Panel
Graph
Backlinks
Properties Sidebar
```

已经不再占据这里。

因此当前效果变成：

```text
正文 | 286px 空白
```

特别是在：

```text
窗口总宽度 > 1120px
+
左侧文件栏仍然打开
```

时非常明显。

这正是当前截图中的问题。

---

# 三、删除旧 Knowledge Panel 布局遗留

阅读模式应改成：

```css
.mode-read .authoring-stage {
  grid-template-columns: minmax(0, 1fr);
}
```

同时检查并清理已经没有组件使用的：

```text
knowledge-panel
note-reading-layout 中旧双栏逻辑
workbench split pane
旧 Graph / Backlinks
extension status bar
旧 v0.x Workbench CSS
```

不要只覆盖一条 CSS 后继续保留大量冲突样式。

先确认真实引用，再删除死 CSS。

---

# 四、Sidecar 不应永久占位

Sidecar 当前本身是：

```text
fixed right drawer
```

因此正文页面关闭 Sidecar 时：

> 不应为 Sidecar 预留任何宽度。

目标：

```text
Sidecar closed

Files |                Note
      |<---------------------------->
```

而不是：

```text
Files |         Note        | Empty
```

---

# 五、正文宽度重新调整

修复空列后，不要把普通文字无限拉成整屏长行。

当前 `.note-prose` 最大宽度约为：

```text
760px
```

对于大量：

* 图片；
* 表格；
* 数学公式；
* 课程截图；

的 TensorNote 技术笔记略显偏窄。

建议整体阅读容器调整到：

```text
max-width: 860px ～ 920px
```

例如：

```css
.note-prose {
  width: min(calc(100% - 48px), 900px);
  max-width: none;
  margin-inline: auto;
}
```

窄窗口：

```text
左右只保留约 16～24px padding
```

宽窗口：

仍保持合理阅读宽度。

不要做：

```css
width: 100%;
```

让普通段落横跨 1500px。

---

# 六、宽媒体允许更好利用空间

TensorNote 经常包含：

```text
课程 PPT 截图
图表
宽公式
表格
Mermaid
```

可以根据当前 CSS 结构适当允许这些元素充分利用正文宽度。

重点是：

> 文本仍然舒适，图表不必被 760px 强行压缩。

不要做复杂的 Medium-style breakout 布局，本轮保持简单。

---

# 七、实现“每篇笔记独立滚动位置”

当前所有笔记共享：

```text
.workbench-pane__content
```

这个滚动容器。

因此：

```text
笔记 A scrollTop = 3000
↓
打开笔记 B
↓
容器仍然 scrollTop = 3000
```

这是错误行为。

---

# 八、目标交互

要求：

```text
打开 A
↓
滚到 3200px

打开 B
↓
第一次打开，从顶部开始

B 滚到 900px

切回 A
↓
恢复到 3200px

切回 B
↓
恢复到 900px
```

每篇笔记有自己的阅读位置。

---

# 九、Scroll State 设计

在 Workbench Store 中增加 session-level 状态，例如：

```ts
noteScrollPositions: Record<string, number>
```

建议 key：

```text
note.id
```

或者：

```text
workspaceId + note.id
```

由于切换 Workspace 时 Workbench Store 已 reset，也可以仅用 note ID。

API：

```ts
saveNoteScroll(noteId, scrollTop)
getNoteScroll(noteId)
```

---

# 十、不要持久化到磁盘

第一阶段 Scroll State：

> 只需要当前应用 Session 内保存。

不要写入：

```text
Markdown
tensornote.yaml
IndexedDB
Workspace
```

也暂时不要求重启 TensorNote 后恢复阅读位置。

以后如果需要再做。

---

# 十一、使用真正的滚动容器

不要继续操作：

```ts
window.scrollTo()
```

因为当前真正滚动的是：

```text
.workbench-pane__content
```

给该节点增加明确：

```ts
ref
```

并针对这个元素读取：

```ts
scrollTop
```

---

# 十二、切换笔记流程

切换前：

```text
保存当前 noteId 的 scrollTop
```

切换完成：

```text
如果新 note 有缓存
    restore
否则
    scrollTop = 0
```

优先使用：

```text
useLayoutEffect
```

避免页面先在错误位置闪一下再跳回去。

---

# 十三、滚动记录不要高频触发全局 React Render

滚动事件不要：

```text
每一个 scroll event
→ 大量 setState
→ 整个应用 re-render
```

可以使用：

```text
requestAnimationFrame
```

节流。

或者只在：

```text
note switching
tab switching
navigation
```

时保存当前值。

选择最稳定简单的方案。

---

# 十四、Heading 导航优先级

必须处理以下情况：

```text
打开笔记
↓
普通切换
```

恢复 Scroll Position。

但是：

```text
打开 /notes/x#某个标题
```

或者用户点击：

```text
Outline → Heading
```

时：

> Heading Navigation 必须优先于历史 Scroll Position。

即：

```text
explicit heading target
    >
saved scroll position
```

不要恢复 scroll 后再把 Heading 跳转覆盖掉，产生抖动。

---

# 十五、关闭 Tab 不要求删除 Scroll State

在当前 Workspace Session 中：

```text
关闭 A Tab
↓
稍后重新打开 A
```

可以继续恢复之前位置。

只有：

```text
switch workspace
resetWorkspace
```

时清空。

---

# 十六、修复同名 Markdown 文件导致 Workspace 打开失败

当前 `document.ts`：

没有 Frontmatter `id` 时使用：

```ts
path.split('/').pop()
```

作为 fallback ID。

例如：

```text
README.md
sources/README.md
```

都会变成：

```text
README
```

最终 `loadWorkspace()`：

```text
documentById
```

检测重复 ID 后直接抛错。

这个行为必须修改。

---

# 十七、文件名不应该承担全局身份

明确规则：

> 不同文件夹中允许存在任意数量的同名文件。

例如：

```text
README.md
chapter1/README.md
chapter2/README.md
references/README.md
```

全部合法。

同理：

```text
index.md
overview.md
notes.md
```

都允许重复。

这与普通文件系统行为一致。

---

# 十八、Note Identity 新规则

区分：

## 用户显式提供 Frontmatter ID

例如：

```yaml
---
id: linear-regression
---
```

则：

```text
Note.id = linear-regression
```

显式 ID 继续要求：

> Workspace 内全局唯一。

因为它用于：

```text
WikiLink
prerequisite
stable reference
```

---

## 没有显式 Frontmatter ID

不要使用 basename。

使用：

> 完整规范化相对路径生成稳定内部 ID。

例如：

```text
README.md
→ path:README.md

sources/README.md
→ path:sources/README.md
```

实现形式可以根据现有 Router 选择。

不一定直接把 `/` 放入 route。

可以：

```text
encodeURIComponent(path)
```

或者生成无冲突的 deterministic internal ID。

要求：

```text
不同真实路径绝不会因为 basename 相同而冲突。
```

---

# 十九、不要强制普通 Markdown 写 Frontmatter

TensorNote 应继续能够直接打开普通 Markdown 文件夹。

因此：

```text
没有 Frontmatter
没有 id
```

不能视为错误。

普通 Markdown：

> 通过路径身份正常工作。

只有显式 `id` 重复才应该报真正的 ID 冲突。

---

# 二十、需要保留“显式 ID”信息

当前：

```ts
normalizeFrontmatter()
```

会无条件填充 fallback `frontmatter.id`。

这样后续无法区分：

```text
用户写了 id
```

和：

```text
应用自动生成 fallback
```

建议在 Document Model 中明确区分。

例如：

```ts
note.id
note.explicitId?: string
```

或者：

```ts
note.identitySource: 'frontmatter' | 'path'
```

具体设计按当前架构选择。

但后续必须可以知道：

> 这个 ID 到底是不是用户声明的。

---

# 二十一、Knowledge Index 同步适配

当前 KnowledgeIndex 支持：

```text
ID
Title
Alias
Filename
Path
```

进行解析。

这一点保留。

同名文件时：

```text
[[README]]
```

可能变得 ambiguous。

这是允许的。

应提示或保持 unresolved/ambiguous。

用户可改用：

```text
[[sources/README]]
```

或者显式：

```yaml
id: source-readme
```

然后：

```text
[[source-readme]]
```

不要因为存在 ambiguous link 就拒绝加载整个 Workspace。

---

# 二十二、目录树以真实文件路径为基础

要求 Sidebar `Files`：

> 文件系统怎么组织，TensorNote 就怎么组织。

例如磁盘：

```text
知识库/
├── README.md
├── 01_课程/
│   ├── README.md
│   ├── 01_线性模型.md
│   └── 02_Bayes.md
└── sources/
    ├── README.md
    └── notes.md
```

Sidebar 必须保持：

```text
README.md

01_课程
├── README.md
├── 01_线性模型.md
└── 02_Bayes.md

sources
├── README.md
└── notes.md
```

不能因为：

```text
title
frontmatter section
id
```

改变其文件系统层级。

---

# 二十三、文件节点名称

为了更接近 VS Code 的心理模型：

推荐 Sidebar Files 节点主要显示：

```text
真实文件名
```

而不是用 Frontmatter title 替换真实文件名。

例如文件：

```text
01_linear_regression.md
```

Sidebar 可以显示：

```text
01_linear_regression
```

或：

```text
01_linear_regression.md
```

二者选一种保持一致。

Frontmatter title：

```text
线性回归
```

可以用于：

```text
Tab 标题
阅读标题
搜索
Tooltip
```

不要用于重建目录层级。

---

# 二十四、本轮不需要把 TensorNote 做成完整文件管理器

“像 VS Code”主要指：

```text
真实层级
路径身份
同名文件合法
```

本轮不要求：

* 任意二进制文件编辑；
* 图片编辑；
* JSON 编辑；
* PDF 编辑；
* 完整 Explorer 功能。

Markdown 仍是主要可打开文档。

不要扩大范围。

---

# 二十五、Overview 规则固定

Overview 只允许读取：

```text
Workspace 根目录
```

中的：

```text
OVERVIEW.md
```

优先，否则：

```text
README.md
```

建议优先级：

```text
OVERVIEW.md
README.md
```

大小写不敏感。

---

# 二十六、子目录 README 永远不是 Workspace Overview

例如：

```text
sources/README.md
notes/README.md
chapter1/README.md
```

只能作为普通 Note。

不能成为整个知识库 Overview。

---

# 二十七、根 README 仍可以同时作为普通文件

如果：

```text
content.root = ""
```

根 `README.md` 可以：

* 作为 Overview 内容来源；
* 同时存在于 Files tree；

这没有问题。

不要为了 Overview 特殊处理而从真实 Files hierarchy 中删除文件。

---

# 二十八、完善 Sidecar 产品契约

目前 TensorNote Sidecar 第一阶段继续只支持：

```text
derivation
jupyter
```

不要新增第三种类型。

但是必须把两者的意义讲清楚。

---

# 二十九、Derivation Sidecar 的实际定位

UI 中不要只让用户理解为：

> 数学公式。

它实际上应该被解释为：

> **扩展说明 / 推导 Sidecar**

适合：

* 数学推导；
* 定理证明；
* 补充解释；
* 详细步骤；
* 不适合放进主阅读流的大段内容；
* 表格；
* 图片；
* 普通代码示例；
* Mermaid；
* Callout；
* 引用；
* 附加说明。

内部类型继续：

```text
derivation
```

不用破坏兼容性。

用户 UI 可以叫：

```text
推导 / 补充内容
```

---

# 三十、Derivation 支持内容

Derivation Sidecar 使用正常 Markdown Renderer。

明确支持：

```text
普通 Markdown
Heading
Bold / Italic
List
Task List
Table
Link
Image
Inline code
Code Fence
KaTeX
Mermaid
Blockquote
TensorNote Callout
```

Callout 类型：

```text
intuition
important
pitfall
bridge
question
remember
```

Derivation 不执行普通代码块。

---

# 三十一、Derivation 不允许的内容

明确不支持：

```text
Sidecar 嵌套 Sidecar
在 Derivation 中再打开 Jupyter Sidecar
任意 HTML Script
任意 JS 执行
插件组件
```

如果以后扩展，再修改 Schema。

---

# 三十二、Jupyter Sidecar 的定位

Jupyter Sidecar：

> 只负责可执行 Python 实验。

适合：

* 算法验证；
* 数值计算；
* 模型示例；
* 数据处理；
* 小型实验。

---

# 三十三、Jupyter Sidecar 格式

标准格式：

````markdown
:::tensornote{type="jupyter" id="linear-regression-demo" title="线性回归实验"}

```python title="准备数据"
import numpy as np
```

```python title="拟合模型"
...
```

````
