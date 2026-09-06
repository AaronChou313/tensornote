# TensorNote 维护者交接

更新：2026-09-06。仓库：`AaronChou313/tensornote`。本文件是项目继续开发和发行操作的首要入口；外部状态仍须实时查询 GitHub。

## 当前交付

**v1.6.1 已于 2026-09-06 13:04 UTC 公开为最新 GitHub 社区稳定版。** [下载 Release](https://github.com/AaronChou313/tensornote/releases/tag/v1.6.1) · [在线版](https://aaronchou313.github.io/tensornote/)。Tag 固定到 `0c6bba3d9dd6f65faa9debe4ff6f7fd3fbc56000`，共 22 个附件（20 项应用/Skill/Updater 资产及两份校验元数据）。[CI 34033833521](https://github.com/AaronChou313/tensornote/actions/runs/34033833521) 与 [Release 34033836481](https://github.com/AaronChou313/tensornote/actions/runs/34033836481) 全部通过；Pages 已部署。独立核对 20 项 SHA-256、7 个 Updater 签名与 11 个更新目标，通过；实际下载的 Apple Silicon 包版本、侧栏和帮助链接已检查。

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

真实截图和来源记录在 `docs/images/v1.6.0/`；目录保留既有链接，图片及 provenance 已更新到 1.6.1。只使用内置示例，不公开用户知识库。

## 当前验证与限制

- 本地 173 项 JavaScript 测试、Lint、TypeScript、Local build、3 项性能测试、生产审计、Static boundary 通过。
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
