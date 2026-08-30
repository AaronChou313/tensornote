# TensorNote 近期产品路线图

本文记录已经进入项目执行队列的近期功能范围。完整长期架构愿景见原始《TensorNote 长期架构与版本路线图》；已发布能力及稳定边界见[架构说明](ARCHITECTURE.md)。

## 当前状态

- `v0.1.0 — Workspace Foundation`：已发布。
- `v0.2.0 — Authoring`：已发布，具备 CodeMirror 编辑、保存、文件操作、资源管理与 Frontmatter Properties。
- `v0.3.0 — Knowledge System`：已发布。
- `v0.4.0 — Compute Platform`：已发布。
- `v0.5.0 — Workbench`：下一开发阶段。

## v0.5.0 — Workbench

目标是把单页 Reader/Editor 提升为适合长期使用的 Knowledge IDE，包含：

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
- Code Fence 可选择语言；存在选区时把选中文字放入 Fence。
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

## 后续编辑增强

- `v0.5.x`：Slash Commands、最近使用命令、可配置工具栏。
- `v0.6.x`：插件注册 Editor Command、补全源和自定义工具按钮。
- `v0.7+`：选区浮动工具条、模板、智能粘贴、WikiLink / Tag 补全。
- Future：可选 Live Preview，但始终保留可直接编辑和导出的 Markdown Source Mode。

这些增强都复用 `CommandRegistry` 和后续 Editor Extension API，避免形成互不一致的第二套编辑系统。
