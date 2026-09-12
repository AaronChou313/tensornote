# TensorNote 2.0 Workbench

Workbench 同时只有一个活动笔记。左栏按文件系统显示目录和 Markdown；Tabs 记录已打开笔记并切换，Search 检索 Workspace。主区在阅读和源码编辑之间切换，不提供多 Pane 或同步滚动预览。

TopBar Outline 从当前笔记 Heading Index 生成 Popover，并在同页定位。Properties 只在编辑态按需打开。

正文中的 Derivation 或 Jupyter Trigger 打开统一 SidePanel。同一时间只显示一个 Sidecar；面板可调整宽度，切换笔记关闭，正文 DOM 与滚动位置保持不变。Scratch 是临时 Jupyter 工作区，与普通 Sidecar 互斥。
