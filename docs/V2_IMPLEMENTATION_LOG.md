# TensorNote 2.0 实施日志

## 当前状态

- 当前阶段：完成
- 最后完成：8 稳定门与发行候选
- 当前工作：推送与 GitHub Release
- 分支：`codex/v2-core-sidecar`
- 基线：v1.18.0 发布后主线 `fcdfcc2`

## 阶段状态

| 阶段 | 状态 | Commit |
| --- | --- | --- |
| 0 规范与基线 | DONE | `2b5688a` |
| 1 Host 契约 | DONE | `5d6c1aa` |
| 2 核心收缩 | DONE | `1c150e5` |
| 3 单笔记 Workbench | DONE | `ce979bc` |
| 4 Sidecar 契约 | DONE | `e29668e` |
| 5 统一 SidePanel | DONE | `ee1def3` |
| 6 编辑与迁移 | DONE | `6874ef0` |
| 7 双宿主收口 | DONE | `8df82dc` |
| 8 稳定与发行 | DONE | 待提交 |

## 2026-09-12 接手记录

- 工作树开始时 clean，HEAD 为 `fcdfcc2`。
- 已读取 v1.18.0 交接、用户提供的 2.0 总规范、现有 routes、AppShell、platform public boundary 与 feature references。
- 初步确认 Git Workspace 与 GitHub Workspace Provider 分离；KnowledgeIndex 同时服务 WikiLink/Heading/Search，不能整体删除；Binder 目前位于 Project Experiment 域，是否保留需在阶段 2 按 Jupyter Sidecar 实际依赖判断。
- 基线 `pnpm check` 通过：63 个测试文件、226 项测试，以及 Lint、TypeScript 和生产构建。

## 阶段 0 — 规范与基线

状态：DONE

- 将用户提供的总规范原样纳入仓库，作为 2.0 产品和架构决策来源。
- 建立 0～8 阶段计划与跨会话实施日志。
- 依据当前源码核对 App routes、AppShell、Host、Deployment、Workspace/Compute Provider，以及待删除系统的直接引用。
- 确认阶段 2 必须做依赖切割，不能按目录直接批量删除。

## 阶段 1 — Host / Web deployment 契约

状态：DONE

- 正式配置只表达 `web` 与 `desktop` Host；static、self-hosted、development 成为 Web deployment metadata。
- 路由、basePath 与 PWA 收入 `WebDeploymentConfig`，不再提供产品能力矩阵。
- Compute 默认 Profile 与能力完全由 Host 决定；Web 不再因本地开发地址获得 localhost Jupyter 产品能力。
- 浏览器目录能力继续属于 Workspace Provider，不由 deployment target 冒充原生 Host 能力。
- 4 个相关测试文件、11 项测试、Lint 与 TypeScript 通过。

## 阶段 2 — 核心收缩

状态：DONE

- 删除 Command Palette 与公共命令 Registry；编辑器变换迁至 `src/editor/markdownTransforms.ts`，Toolbar 与快捷键直接调用。
- 删除 Extension Platform、扩展管理/状态/视图、扩展 Store、示例及 v1 公共导出。
- 删除 Structured Database、Graph/Knowledge 一级页面、Git Workspace、Git Bridge 客户端与 Desktop Native Git。
- 删除 Project Experiment 前端、Manifest/索引/Runner 与专用 Rust runtime；保留独立的 GitHub Workspace Provider、WikiLink/Search 索引及 BinderHub Compute Connector。
- AppShell、Sidebar、Settings、Workspace session 与 Markdown renderer 完成解耦；旧 Lab 暂留给阶段 4 的兼容适配。
- `pnpm check` 通过：47 个测试文件、169 项测试、Lint、TypeScript 与生产构建；Rust fmt、Clippy 与 15 项测试通过。

## 阶段 3 — 单笔记 Workbench

状态：DONE

- Workbench 状态收缩为单一 `activeNoteId`，删除左右 Pane、双笔记和右侧视图状态。
- 笔记页只保留一个阅读/编辑表面；移除双栏预览、滚动对齐算法、Knowledge Panel 与旧 Workbench 右侧栏。
- 顶部标签仅承担打开笔记与历史切换，不再表示多 Pane 布局。
- 保留 Properties 编辑入口，并将旧 Lab 作为阶段 4～5 的 Sidecar 兼容输入。
- `pnpm check` 通过：46 个测试文件、159 项测试、Lint、TypeScript 与生产构建；Rust fmt、Clippy 与 15 项测试通过。

## 阶段 4 — Sidecar 内容契约

状态：DONE

- 新增仅含 `derivation` 与 `jupyter` 的 Sidecar 联合类型、源码范围和解析诊断。
- `:::tensornote{...}` 指令可从 Markdown 提取为 Sidecar，并在正文原位置生成稳定触发标记。
- 非法类型、无效/重复 id 与未闭合指令保留原始 Markdown，不静默丢失用户内容。
- 旧 `python exec` Lab 通过 `legacyLabToSidecar` 适配为 Jupyter Sidecar，继续兼容 Workspace Schema v1。
- 新增独立 Sidecar Store，只保存宽度偏好；切换笔记会关闭活动 Sidecar。
- 48 个测试文件、164 项测试、Lint 与 TypeScript 通过。

## 阶段 5 — 统一 SidePanel

状态：DONE

- 正文中的 Derivation 与 Jupyter 指令统一渲染为 Sidecar 入口卡片；旧 Lab 卡也打开同一个 SidePanel 状态。
- 单一右侧面板按活动 Sidecar 替换内容；推导使用安全 Markdown 渲染，Jupyter 复用现有 Kernel、执行权限、输出与保存链路。
- 面板宽度限制为 400～850px 并持久保存；切换笔记自动关闭，正文滚动容器不会被替换。
- Scratch Lab 继续作为临时 Jupyter 工作区，但与普通 Sidecar 互斥显示。
- `pnpm check` 通过：48 个测试文件、164 项测试、Lint、TypeScript 与生产构建。

## 阶段 6 — 编辑与迁移

状态：DONE

- 编辑器的实验插入弹窗升级为 Sidecar 插入器，可创建 Derivation Markdown 或多 Cell Jupyter 指令。
- TopBar 增加基于当前笔记 Heading Index 的 Outline Popover，点击标题在同一笔记内定位。
- Properties 保持编辑态的按需面板，不再占用 SidePanel。
- `tensornote-knowledge-workspace` Skill 增加 Sidecar 规范、模板和确定性 Validator 规则，移除 Project Experiment 创作模板与路由。
- Skill 的课程模板 `--strict` 校验零错误零警告；仓库 Workspace 校验零错误零警告（旧 Lab 仅有兼容信息）。
- `pnpm check` 通过：48 个测试文件、165 项测试、Lint、TypeScript 与生产构建。
- `quick_validate.py` 已调用，但当前两个可用 Python runtime 均缺少其 PyYAML 依赖；阶段 8 使用隔离临时环境补跑。

## 阶段 7 — 双宿主产品收口

状态：DONE

- README、中英文使用说明、架构、Host matrix、发行与平台契约全部改为 Web / Desktop 双宿主。
- 删除 Local Web 启动包、Server/Test、package script，以及 Release Workflow 的 Local Web Job 和资产上传。
- 删除 Git Bridge 与 Project Experiment 的当前产品文档、Schema 和 Skill 内容；保留 GitHub Workspace Provider 与 BinderHub Compute Connector。
- Desktop Host 移除已经没有 UI 调用者的 Project Experiment requirements 独立安装命令；普通环境创建与 Jupyter 支持保留。
- `pnpm check`、Static Web build/boundary、Rust fmt、Clippy 与 14 项 Rust 测试通过。

## 阶段 8 — 稳定门与发行候选

状态：DONE

- 应用、Tauri、Cargo、Agent Skill 与发布模板版本统一为 `2.0.0`；新增中英文 Release Notes 与迁移说明。
- `pnpm check` 通过：47 个测试文件、164 项测试、Lint、TypeScript 与生产构建。
- 性能测试 3 项通过；生产依赖审计无已知漏洞；Release 与 Publication Validator 通过。
- Static Web build 与无 Tauri IPC 边界通过；Rust fmt、Clippy 与 14 项测试通过。
- Skill `quick_validate.py` 在隔离临时 Python 环境通过；两个模板 strict 零错误零警告，仓库 Workspace 零错误零警告。
- 本机 Apple Silicon Desktop release build 成功：`TensorNote.app` 与 `TensorNote_2.0.0_aarch64.dmg`。
- GitHub 推送、Tag、跨平台 Workflow、附件校验与 Release 可见性在本提交之后记录。
