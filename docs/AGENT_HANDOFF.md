# TensorNote 维护者交接

更新：2026-09-08。仓库：`AaronChou313/tensornote`。本文件是项目继续开发和发行操作的首要入口；外部状态仍须实时查询 GitHub。

## 当前交付

### v1.14.0 候选：固定 Revision Binder 引导（2026-09-09）

GitHub Project Experiment 使用已解析的 owner/repo/完整 commit SHA 生成 Binder 链接；Notebook 可作为直接入口。UI 明示构建等待、临时资源与非持久输出，配置不足时保持阅读并提供 Desktop/克隆指引，URL 不携带 Token 或授权。

### v1.13.0 候选：Local Web / Remote Jupyter 实验子集（2026-09-09）

Web 实验运行器在 Kernel 内验证 Workspace 路径映射和输入文件，再以无 Shell 的 Python 包装器运行 `python` / `python-module`；Notebook 通过 `nbclient` 生成执行副本。`torchrun` 明确降级到兼容预设或 Desktop，Git Bridge 保持 Git-only。

### v1.12.0 候选：Notebook、torchrun 与训练体验（2026-09-09）

Desktop Notebook Runner 保留源 Notebook，并在应用数据目录生成可定位的执行副本。`torchrun` 使用结构化拓扑与固定 argv；本机资源检测覆盖 CPU、内存、磁盘、NVIDIA GPU/CUDA。资源不足需要明确继续，长任务显示运行时长、最近日志、步骤进度与唤醒提示。Manifest v1 可选 `downloads` 只读元数据说明来源、大小、缓存、许可和校验和。

### v1.11.0 候选：Desktop Python 多脚本 Job Runner（2026-09-09）

新增原生 Experiment Runtime：运行计划绑定 Manifest 与脚本 SHA-256，使用固定环境 Python 与 argv 数组串行执行 `python` / `python-module`，提供逐步骤状态、受限日志、失败阻断、取消、全量重跑、失败续跑、历史清理和 interrupted 恢复。产物可在文件管理器中定位。

### v1.10.0 候选：Desktop Project Experiment 环境准备（2026-09-09）

实验页接入桌面运行时发现、继承依赖解析、安装计划、确认、进度日志、取消和 Managed Environment 清理。原生端重新解析 Workspace 授权路径，计划绑定 Manifest 与依赖文件 SHA-256；内容变化或计划过期会拒绝应用。隔离环境位于应用数据目录，不写入知识库。

### v1.9.0 候选：Project Experiment 只读产品界面（2026-09-09）

笔记引用可渲染为 Experiment Card，侧栏与命令面板提供实验入口，独立实验页展示 Environment、Steps、Files、Run、Artifacts。页面根据平台能力、执行开关、Revision trust、只读与诊断状态提供准确说明；本阶段不安装依赖、不启动进程。

### v1.8.2 候选：Project Experiment 只读解析与索引（2026-09-08）

新增 Experiment Fence、Manifest v1 校验、路径/环境继承/步骤 DAG 诊断、Workspace 实验索引，以及 Skill validator 与可复制模板。该阶段没有环境变更或代码执行副作用。

### v1.7.0 候选：Project Experiment 契约基线（2026-09-08）

新增 Project Experiment Manifest v1 规范、JSON Schema、合法/非法 fixtures、威胁模型和 Happy-LLM 第 5～6 章迁移表。该阶段只冻结声明与安全边界，不解析、安装或执行项目实验；Workspace Schema v1、Compute Provider v1 和 Inline Lab 保持不变。

### v1.6.4 已发布：最近打开、GitHub 刷新、Files 与 Focus Mode（2026-09-08）

Home 的“最近打开”增加单条移除与全部清空；操作只删除本机快捷入口。GitHub Provider 的仓库、分支提交与文件树请求绕过浏览器 HTTP 缓存，未固定 Revision 的链接重新打开时解析最新提交。内置 Focus Mode 已移除，旧持久化设置通过 Extension Store v2 迁移清理；Extension API、本地扩展管理器和示例保留。

Files 导航严格使用 `content.root` 内的物理目录层级与目录名，不再由 Frontmatter `section` 或目录内 `overview.md` 覆盖目录标签；每一级先列文件夹，再以同一自然排序规则分别按真实目录名和文件名排列。显示标题仍来自笔记标题。该修订修复 Happy-LLM 多个 `chapterN` 被重复显示为“理论基础”的问题。以上修改组成 v1.6.4。

### v1.6.3 已发布：README 内嵌 HTML（2026-09-08）

用户反馈 Happy-LLM GitHub Workspace 的 Overview 将 HTML 显示为源码。共享 MarkdownRenderer 已增加 HTML 解析与白名单净化，支持居中横幅、徽章和图片尺寸；HTML 相对图片继续通过 Workspace Provider 读取。脚本、事件属性、危险 URL、表单和自定义 CSS 被移除，代码围栏中的 HTML 保持源码。Web 与 Desktop 共用该修复。184 项测试、lint、类型检查、生产构建、Static 边界检查、3 项性能测试及生产依赖审计通过；实际 GitHub README 在本地 Web 中已验证横幅和徽章，macOS App 已重新构建。

### 已发布版本

**v1.6.4 已于 2026-09-08 14:59:41 UTC 公开为最新 GitHub 社区稳定版。** [下载 Release](https://github.com/AaronChou313/tensornote/releases/tag/v1.6.4) · [在线版](https://aaronchou313.github.io/tensornote/)。Tag 固定到 `b6f49df6e95884388dabc6d5cae3b31071122c69`，22 个附件齐全；[正式 Release 34240628441](https://github.com/AaronChou313/tensornote/actions/runs/34240628441) 的发行检查、Web、本地 Web、Linux、Windows、Intel/Apple Silicon macOS、容器、Pages 与最终归档全部通过。

v1.6.3 已于 2026-09-08 08:15:40 UTC 发布，Tag 固定到 `39147f9cd250c4a62bec8569ea80a51a592cc64e`；其附件保持不变。

v1.6.2 已于 2026-09-08 02:43:46 UTC 发布，Tag 固定到 `cc11a3fa35878a6d72bab2308af5cb9ea4b63b01`；其附件保持不变。

Pages 已部署 v1.6.4。环境的精确 Tag 名单包含 `v1.6.4`；既有规则保留。以后发行新 Tag 时仍须先检查这个精确名单。

v1.6.1 保留为历史稳定版；其 Tag `0c6bba3d9dd6f65faa9debe4ff6f7fd3fbc56000` 与附件未改动。

用户已明确授权 GitHub 直接分发，当前不申请应用商店或付费平台证书。Tag 内 `release-policy.json` 固定 `github-community`：平台开发者签名可选，Updater 密码学签名必须。不要重新使用历史文档中的“没有 Apple/Windows 证书就禁止所有发行”规则。

- `v1.6.0` Tag 是被替代的候选。实际 CI macOS 包未打开外部帮助链接，因此已取消正式流水线，Draft 标为 superseded，**不得公开或移动该 Tag**。
- `v1.6.1` 启用已有 Opener 插件，仅授权默认应用打开 HTTP(S) 链接；真实桌面帮助链接已打开 Chrome。没有增加通用 Shell 或文件路径权限。
- 先前 v1.1～v1.5 为连续源码阶段，不补造历史 Release。
- 未批准 v2 范围。兼容的后续功能优先采用 v1.x；不能保持公共契约时才开始 v2 RFC。

## 用户从下载到使用

默认入口为 [中文 README](../README.md) 和 [中文使用说明](zh-CN/USER_GUIDE.md)，英文分别是 [README.en](../README.en.md) 与 [English guide](en/USER_GUIDE.md)。

| 版本 | 用户路径 | 按需配置 |
| --- | --- | --- |
| 在线 Web | 打开 Pages → 示例或公开 GitHub 知识库；Chrome/Edge 也可授权本地目录 | HTTPS Jupyter / JupyterHub / BinderHub；服务端允许 Origin 与 WebSocket；不连接本地 Git Bridge |
| 本地 Web | 下载 local-web 包 → Node.js 22+ → `node start.mjs` → Chrome/Edge 打开本地目录 | 本机 Jupyter 独立启动；Git Bridge 在应用包目录启动，并指向知识库 Git 根目录 |
| Desktop | 下载匹配架构的安装包 → 打开或新建本地 Workspace → 编辑保存 | 系统 Git 无需 Bridge；环境助手检测/创建基础环境、启动并连接自有 Jupyter |

阅读和写作无需 Python。三版共享 Markdown、附件和 Schema v1。Git 目前支持 Status/Diff/Stage/Unstage/History/Commit，**没有 Push/Pull/Clone/分支切换**；远程同步由外部 Git 客户端负责。不要把未来 Git Sync 能力写进当前承诺。

当前真实截图和来源记录在 `docs/images/v1.6.2/`；旧版截图保留用于追溯。只使用内置示例，不公开用户知识库。

## 当前验证与限制

- 本地 180 项 JavaScript 测试、Lint、TypeScript、Local build、3 项性能测试、生产审计、Static boundary 通过。
- Rust fmt/clippy 与 14 项测试、Apple Silicon `.app` 构建通过。
- Skill 结构、两套 strict 模板、内置 Workspace strict、独立 Skill 分发校验通过。
- 真实 Web/Desktop 侧栏、宽窄屏、文件写入与 Owned Jupyter 主流程记录见 [候选验证](STABLE_CANDIDATE_VERIFICATION.md)。AX 中存在元素不代表像素可见，视觉问题必须检查实际截图。
- Local Web 包已在源码目录之外解压启动，无需前端依赖；Git Bridge 的 macOS 路径别名回归有自动和实际验证。
- macOS 本机实测不等于干净 Windows/Linux/Intel macOS 安装矩阵；公共 Binder 完整执行、独立知识库发布和真正的跨版本自动升级仍需补证据。
- 未配置 Apple Developer ID 公证或 Windows 受信发布者签名，系统首次打开提示已在用户手册中说明；不得声称社区包已公证。
- 只检查 GitHub Secret 名称，未读取值。Updater 私钥可恢复备份仍须维护者验证，不能把签名通过当作备份已经验证。

## 开发边界

1. `src/platform/index.ts` 与 [PLATFORM_CONTRACTS](PLATFORM_CONTRACTS.md) 是 v1 公共边界。保留 Schema v1、Provider capabilities、执行权限、GitHub Revision trust 和未来 Schema 只读降级。
2. Web/Desktop 共用 React 核心；原生调用通过 `src/host/` 受限能力和 `src-tauri/`，不能把具体 Provider 接到 UI 旁路。
3. Markdown、附件和 `tensornote.yaml` 是可移植事实来源。Settings/Secret 与知识内容分离，禁止将凭据写入 Markdown、Fixture、日志、截图或 Git。
4. 知识库任务先完整阅读 `skills/tensornote-knowledge-workspace/SKILL.md`，遵守 reference routing，使用模板和验证器。应用仓库也是内置示例；外部用户目录必须单独确认范围。
5. 保留无关用户修改。不得用通用 Shell、可控绝对路径或任意 Git/Python 参数绕过已有允许列表。

## 发行操作

先阅读 [RELEASE_MATRIX](RELEASE_MATRIX.md)，核实 `git status -sb`、main、版本、最新 CI/Release 和 Secret 名称；不要输出 Secret 值。

应用变更运行 `pnpm check`；发行候选增加 `pnpm test:performance`、`pnpm audit --prod --audit-level high`、`pnpm build:web` 和 `pnpm validate:release -- --tag vX.Y.Z`。Desktop 变更还需 `pnpm check:desktop` 与实际桌面构建。Skill 变更还需 quick validation、两套 strict 模板、仓库校验和变更脚本执行。所有变更运行 `git diff --check`。

授权发布后：冻结干净提交 → CI 与 dry run → 创建不可变 annotated Tag → 等待 Tag Workflow → 下载 Draft 全部资产 → 核对版本/commit/SHA256SUMS/Updater 签名/latest.json → 实际安装和线上走查 → 公开 Draft → 更新当前文档。失败保留证据并递增 Patch，不覆盖旧 Tag。付费可信渠道须显式变更发行策略并补平台签名门。

## 下一步

当前优先完成用户可用的社区发行与缺陷反馈闭环。后续候选包括干净平台安装、公开 Binder、第二个公开 Desktop 版本的升级测试、独立知识库发布、Git Remote Sync 和编辑体验增强；这些不是已经实现或已排期的功能。保持 [开发计划](ACTIVE_DEVELOPMENT_PLAN.md) 与 [路线图](ROADMAP.md) 的历史提案和实际交付状态分开。

原始接管审计与旧发行门保存在 [历史交接快照](AGENT_HANDOFF_PRE_1_6_1.md)，仅用于追溯，不作为当前操作指令。

## 2026-09-08：使用反馈修订（已随 v1.6.2 发行）

分支 `codex/v1-6-1-user-experience` 修复宽屏阅读大纲粘滞定位、无 Frontmatter 中文目录被“未分类”覆盖、空附件目录文件图标误导，以及双栏独立滚动和按标题锚点同步。Overview 支持根目录 `OVERVIEW.md` 优先、`README.md` 回退；分享窗口增加默认分支阅读链接，固定 Revision 分享及执行信任边界保持不变。中英文使用手册已注明 v1.6.2 的功能范围；此外修复 README 的片内目录链接覆盖 HashRouter 路由，并新增回归测试。

本机使用独立 bundle id 的 TensorNote QA 和 `/tmp/tensornote-ux-vault` 测试，避免重启用户正在编辑且未保存的 TensorNote 窗口。验证 README 相对图片和库内链接、中文目录、长文浮动上下文栏、双栏双向同步和关闭同步；同步覆盖章节间插值，并非每个段落像素精确匹配。用户课程目录只读检查，未改写用户笔记。

验证：`pnpm check` 最终 180 项测试通过；性能测试 3 项通过；生产依赖审计无已知漏洞；Static Web 构建及无 Tauri IPC 边界检查通过；`pnpm check:desktop` 含 14 项 Rust 测试通过；macOS arm64 应用构建成功。公开仓库直达 URL 及分享窗口在本地 Web 实测通过，仍显示 Revision 信任要求。代码已推送 main、打 v1.6.2 Tag 并公开 Release；既有 v1.6.1 发行资产未改动。正式 Apple Silicon 下载包已解压启动并核对版本和阅读布局。用户实际课程目录在候选桌面与已部署在线版均只读验证，中文章节及图片文件夹显示正确。
