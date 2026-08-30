# TensorNote 恢复与故障处理

TensorNote 的恢复机制只保护尚未保存的用户状态，不替代 Markdown 文件，也不会把恢复数据库当作知识来源。

## 草稿恢复

在可写 Workspace 中编辑 Markdown 后，TensorNote 会在停止输入约 750ms 后保存恢复快照。快照按 Workspace 标识和文件路径隔离，优先进入浏览器 IndexedDB；浏览器不支持或暂时无法使用 IndexedDB 时退回 localStorage。

快照包含完整待保存 Markdown、原文件的修改时间与大小、写入时间和恢复格式版本。它不包含 Jupyter Token、Extension Secret 或 Git 凭据，30 天后自动过期。

重新打开同一笔记时，如果快照与磁盘内容不同，编辑器顶部会显示“发现未保存草稿”：

- **恢复**：载入快照并进入 Editing，仍需手动保存。原文件基线会一同恢复；磁盘后来发生变化时，保存会继续触发冲突提示。
- **丢弃**：删除恢复快照，继续使用 Workspace 中的文件。
- 不作选择：文件和快照都不会改变。

正常保存、点击外部修改提示中的 Reload 或主动丢弃都会清除快照。关闭标签、切换 Workspace 或浏览器异常退出时，最近 Dirty 内容会尽力写入恢复存储。

## 外部修改冲突

TensorNote 保存前比较编辑开始时的文件修改时间和大小。其他编辑器修改同一文件后，TensorNote 不会静默覆盖；请选择：

- **Reload**：放弃当前编辑内容，从磁盘重新读取，同时清除恢复快照。
- **Keep mine**：继续保留编辑器内容，并将当前磁盘版本设为下一次保存基线。只有再次点击 Save 才会覆盖。

## 应用崩溃恢复

React 渲染失败时，顶层 Recovery Boundary 会停止损坏的界面树，并提供：

- 重新加载当前页面。
- 返回 TensorNote 启动页。
- 复制最小诊断信息。

诊断只包含错误消息、JavaScript Stack、React Component Stack、当前路由、时间和 User Agent；不包含 Markdown 内容、Workspace 文件、Token 或 Extension Secret。最近诊断仅保存在当前浏览器会话。

如果同一路由持续崩溃，请先返回启动页并打开其他 Workspace，再复制诊断用于报告问题。Markdown 文件始终可以用其他文本编辑器直接打开。
