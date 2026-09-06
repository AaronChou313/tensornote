# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

面向以 Markdown 记录、阅读和运行技术知识的用户。用户在本地文件夹或远程仓库中维护笔记，并需要在阅读、编辑、知识关联与 Python 实验之间快速切换。

## Product Purpose

TensorNote 是一个本地优先、Markdown-first、由 Jupyter 驱动的可执行知识工作区。它让文档保持可移植的纯文本，同时把文件、知识关系、编辑与计算集中在同一工作台中。

## Positioning

它以 Workspace Provider 读取和保存真实 Markdown 文件，并将可执行 Python Lab 与 Markdown 文档放在同一个知识工作流中；内容不转换为私有富文本格式。

## Operating Context

用户可打开内置、本地或 GitHub Workspace，浏览 Markdown 文件树，编辑并保存文档，使用 WikiLinks、Backlinks、Tags 与局部图谱理解关系，并在可信 Workspace 中通过 Jupyter 运行 Lab 或 Scratch。

## Capabilities and Constraints

- 当前源码为 v1.6.0 候选，Web 与 Tauri Desktop 共用核心；原生文件、Git、Runtime Assistant 与 Updater 仅由 Desktop Host 提供。公开稳定版仍以 GitHub Release 为准。
- Local、Static 与 Self-hosted Web 的浏览器权限、Git Bridge 与远程执行边界见 docs/HOST_FEATURE_MATRIX.md。

- Workspace、Document、Compute 与 Workbench 是稳定的核心边界。
- 内容、用户工作台状态与计算配置保持分离；Markdown 是内容的 source of truth。
- Workspace Provider 负责文件和资产 I/O；UI 不绑定某个具体 Provider。
- GitHub Workspace 的代码执行需要信任当前 revision。
- Workbench v0.5.0 提供标签页、分栏、Sidebar、命令面板和 Markdown 编辑快捷工具。
- Extension Platform v0.6.0 允许官方与用户信任的本地扩展注册工作台、Markdown、编辑器与 Provider 贡献；当前不提供公共在线市场。
- Structured Knowledge v0.7.0 从 Markdown Frontmatter 建立运行时 `PropertyIndex`，在 `/database` 提供 Table、Card、List、可分享 URL 和基础属性查询；不引入 SQL 或专有内容数据库。
- 当前属性查询支持 `=`、`!=`、`AND`、大小写无关键、字符串/数字/布尔/空值及数组成员匹配；不提供范围、排序、聚合、写回编辑或复杂逻辑查询。
- Git & Sync v0.8.0 为 Local Workspace 提供 Status、Diff、History、Stage、Unstage、Commit 与 Branch Info；通过用户显式启动、固定仓库根目录的 localhost Bridge 调用系统 Git。
- Git 同步保持可选；当前不提供 Push、Pull、Fetch、远程认证、Branch 操作或冲突解决器。
- Workbench & Authoring Polish v0.8.1 统一桌面与移动侧栏入口，提供受未保存状态保护的 Workspace 切换，并将普通正文编辑与可折叠 Frontmatter Properties 分离；阶段版本只提交源码，不单独发布 Release。
- Compatibility & Migration v0.8.2 为 Workspace Schema、浏览器设置和 Extension API 建立显式版本边界；未来 Schema 以只读兼容模式打开，避免锁住基础 Markdown 阅读。
- Recovery v0.8.3 将未保存草稿作为可丢弃的用户恢复状态保存在 Workspace 之外；恢复操作永不静默覆盖 Markdown，应用崩溃诊断也不采集文档内容。
- Distribution & Performance v0.8.4 以同一 Web Runtime 支持 Static、Local 和 Self-hosted 模式，可选安装为 PWA；Workspace 加载使用受限并发与文档指纹缓存，并有 10,000 笔记性能门。
- Distribution & Hardening v0.9.0 将 Schema/Settings/Extension 兼容、草稿/崩溃恢复、三种 Web 分发模式、PWA、安全检查与大 Workspace 性能门合并为一个可发布的稳定候选。
- Stable Platform v1.0.0 冻结 Workspace Schema、WorkspaceProvider、ComputeProvider、Extension API、Executable Markdown 与 Settings/Secret 六项 v1 契约；后续 1.x 功能必须保持向后兼容或提供显式迁移。
- Agent Interface v1 随仓库提供可安装 Skill、分层知识撰写/配置/运行规范、输出模板与确定性 Workspace 校验器，使智能体使用同一平台契约而不是发明第二套格式。

## Brand Commitments

TensorNote 保持简约、现代、圆润、柔和的淡绿色身份；明暗主题和可访问键盘交互同等重要。

## Evidence on Hand

- 可运行的 Web 应用与产品实现：`src/`
- Markdown 示例知识库：`notes/`
- 产品路线和版本记录：`docs/ROADMAP.md`、`docs/releases/`
- 品牌图像：`assets/images/TensorNote_logo*.png`

未声明客户、价格、性能基准或商业部署事实。

## Product Principles

1. Markdown 可直接编辑、导出并长期保存。
2. Workspace 是产品层的一等概念，而不是内置笔记目录的别名。
3. 所有可见操作应能通过统一命令系统调用。
4. 计算能力必须受 Provider、Profile 与信任边界约束。
5. 只为明确的扩展轴抽象，不为假想功能堆叠复杂度。

## Accessibility & Inclusion

界面应保留语义标签、Tooltip、键盘焦点与足够的明暗主题对比度。该要求来自现有产品约束；尚未记录特定合规标准或辅助技术用户研究。
