# TensorNote Workbench

v0.5.0 将 Workspace 的文件、笔记、知识上下文与计算入口放进一个可组合工作台。内容仍然是普通 Markdown；标签、窗格、历史和侧栏只是浏览器中的用户界面状态。

## 导航与布局

- 从 Files、搜索结果或 Workspace 页面打开笔记会创建或激活标签。标签可固定、关闭；关闭当前标签会回退到最后一个仍打开的标签。
- 顶部标签栏支持后退/前进，记录本次工作台会话中打开过的笔记；Recent files 由最近打开顺序维护。
- 使用标签栏的拆分按钮打开次 Pane。点击一个 Pane 即可激活它；每个 Pane 可以显示不同笔记。窄屏时保留激活 Pane，避免两个编辑器同时挤压内容。
- 左栏包含 Files、Overview、Knowledge 和 Search 入口。右栏提供 Properties、Outline、Backlinks、Graph 与 Python Lab 上下文，且不改变 ComputeRuntime 的 Session 边界。

## Command Palette

按 `Ctrl/Cmd + P` 打开命令面板，可搜索并执行已注册命令。每篇可见笔记都有 Open Note 命令，New Note 会打开已有的新建笔记对话框；还提供 Open graph、Toggle sidebar、Back/Forward 和可用的编辑命令。Run all labs 会选择活动 Pane 当前笔记的首个 Lab，LabDrawer 匹配并一次性消费 `pendingLabAction` 后调用既有 Run all。该操作继续遵循 Workspace trust、Compute Profile、Session Scope 和 ComputeRuntime 的既有连接边界；没有可用 Lab 时命令不可执行。

`Ctrl/Cmd + K` 在非编辑器区域打开全局搜索；当 CodeMirror 获得焦点时，它插入 Markdown 链接。`Ctrl/Cmd + S` 继续使用原有保存与冲突保护。

## Markdown Authoring

编辑模式顶部的 Authoring Toolbar 与键盘、Command Palette 调用相同的 `EditorCommand` transform。已提供 Paragraph/H1–H6、Bold、Italic、Strikethrough、Inline Code、Link、Image、Blockquote、Callout、Bullet/Numbered/Task List、Python Code Fence、Table、Horizontal Rule 和 Math Block。

- 有选区时，行内命令包裹或移除已有标记；标题和列表对选中行执行转换；Code Fence 保留选中的正文。
- 无选区时插入可继续编辑的 Markdown 片段。
- 每次执行只触发一次 CodeMirror transaction，因此可用一次 Undo 恢复。
- 只读 Workspace 不显示写入式 NoteEditor，因而不会注册可执行的编辑命令。

这是 Markdown source mode：不会创建私有富文本结构。后续 `v0.5.x` 将在相同注册表上加入 Slash Commands、最近命令和工具栏配置。
