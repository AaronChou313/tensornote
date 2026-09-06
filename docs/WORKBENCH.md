# TensorNote Workbench

> 面向用户的最新安装与使用主线已拆分为 [中文说明（默认）](zh-CN/USER_GUIDE.md) / [English user guide](en/USER_GUIDE.md)。本文保留专题技术参考；当前 GitHub 社区发行策略以 [发布矩阵](RELEASE_MATRIX.md) 为准。

v0.5.0 将 Workspace 的文件、笔记、知识上下文与计算入口放进一个可组合工作台。内容仍然是普通 Markdown；标签、窗格、历史和侧栏只是浏览器中的用户界面状态。

## 导航与布局

- 从 Files、搜索结果或 Workspace 页面打开笔记会在当前活动 Pane 创建或激活标签。主、次 Pane 各自保存标签、固定状态与前进/后退历史；每个 Pane 是一个完整阅读编辑区，自己的操作栏紧贴在内容展示区上方，滚动也彼此独立。
- 使用标签栏的拆分按钮先创建一个空白次 Pane；再从侧栏选择第二篇笔记。拆分不会复制当前笔记，关闭一侧标签也不会影响另一侧。每个 Pane 自己带有关闭按钮：关闭主 Pane 会提升另一侧；关闭最后一个 Pane 后进入空工作台，显示“请选择一个笔记进行阅读或编辑”。
- 点击正文或标签组会激活对应 Pane；后续从 Files 打开的笔记进入该 Pane。右侧 Properties、Outline、Backlinks 和 Graph 也始终读取当前焦点 Pane 的笔记。窄屏只显示活动 Pane，避免两个编辑器挤压内容。
- Workspace 切换器位于左栏最上方，展开后可刷新或切换 Workspace；Overview 仍由主导航唯一提供。Workspace 来源类型和读写能力以标题下方标签呈现，Recent Files 可折叠。
- 左栏包含 Files、Overview、Knowledge、Database；Files、Recent Files 和 Extensions 均可折叠。设置只由右上角齿轮打开，并以自动保存的弹窗呈现。右栏继续提供当前焦点笔记的 Properties、Outline、Backlinks 与 Graph；Python Lab 保持为独立抽屉，打开时会先关闭右栏，避免两个上下文面板争用空间。

## Command Palette

按 `Ctrl/Cmd + P` 打开命令面板，可搜索并执行已注册命令。它是无背景虚化的顶部浮层，空查询显示推荐命令。每篇可见笔记都有 Open Note 命令，New Note 会打开已有的新建笔记对话框；还提供 Open graph、Toggle sidebar、Back/Forward 和可用的编辑命令。Run all labs 会选择活动 Pane 当前笔记的首个 Lab，LabDrawer 匹配并一次性消费 `pendingLabAction` 后调用既有 Run all。该操作继续遵循 Workspace trust、Compute Profile、Session Scope 和 ComputeRuntime 的既有连接边界；没有可用 Lab 时命令不可执行。

`Ctrl/Cmd + K` 在非编辑器区域打开全局搜索；当 CodeMirror 获得焦点时，它插入 Markdown 链接。`Ctrl/Cmd + S` 继续使用原有保存与冲突保护。

## Markdown Authoring

编辑模式顶部的 Authoring Toolbar 与键盘、Command Palette 调用相同的 `EditorCommand` transform。已提供 Paragraph/H1–H6、Bold、Italic、Strikethrough、Inline Code、Link、Image、Blockquote、Callout、Bullet/Numbered/Task List、Python Code Fence、Table、Horizontal Rule 和 Math Block。

桌面端把样式选择、粗体、斜体、删除线、链接、无序列表和代码块保留在单行；代码语言使用紧凑选择器，其余命令进入溢出菜单。窄屏进一步收起语言选择，避免工具按钮被裁切。

- 有选区时，行内命令包裹或移除已有标记；标题和列表对选中行执行转换；Code Fence 保留选中的正文。
- 无选区时插入可继续编辑的 Markdown 片段；Heading 会把当前空行或所在行转换为对应层级。
- 每次执行只触发一次 CodeMirror transaction，因此可用一次 Undo 恢复。
- 只读 Workspace 不显示写入式 NoteEditor，因而不会注册可执行的编辑命令。

这是 Markdown source mode：不会创建私有富文本结构。Frontmatter 继续由独立、可折叠的 Properties 区域编辑，不作为普通正文暴露。Slash Commands、可定制工具栏和更丰富的块级拖拽仍属于后续增强。

## Settings

设置弹窗集中管理外观、编辑器、计算与 Jupyter、扩展和版本信息。顶栏只保留一个带运行状态提示的齿轮入口；点击关闭按钮或弹窗外空白区域即可返回当前笔记，所有设置操作会自动保存。

- 外观：浅色 / 深色主题。
- 编辑器：默认阅读、编辑或双栏预览模式，行号与长行换行。
- 计算与 Jupyter：Profile、Server URL、Kernel、会话 Token、Session Scope、诊断与断开。
- 扩展：查看、启停并进入本地扩展管理。
- 关于：TensorNote 版本、Runtime、Workspace 与 Provider 信息。
