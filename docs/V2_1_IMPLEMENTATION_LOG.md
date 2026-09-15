# TensorNote v2.1.0 实施日志

目标：完善知识库进入、创建、远程读取与分享体验。正式 Tag、Release 与 Pages 部署不属于本任务。

- Phase 1：首页与产品标识 — COMPLETE
- Phase 2：本地知识库创建 — COMPLETE
- Phase 3：远程知识库 Provider — COMPLETE
- Phase 4：缓存、信任与最近打开 — COMPLETE
- Phase 5：分享体验 — COMPLETE
- Phase 6：文档、验证与版本冻结 — COMPLETE

## 实施结果

- 首页已收束为“最近打开 + 打开本地 + 新建本地 + 打开在线”，并共享 `ProductIdentity` 展示 Host 与使用说明。
- AI Learning Notes、Bundled Provider、内置 `notes/` 与无 Session 自动 fallback 已移除；仓库级验证数据迁入 `fixtures/workspace/`。
- Web 使用 File System Access API 在所选父目录下初始化知识库；Desktop 使用一次性父目录授权和不透明 ID，经 Rust IPC 安全创建。Manifest 只由 `createWorkspaceManifest()` 生成。
- GitHub、GitLab、Gitee 共用远程只读 Provider 基类、URL Parser、缓存、revision trust 和分享路由。旧 GitHub 路由继续兼容。
- 可变 Ref 元数据缓存 5 分钟，固定 commit 缓存 24 小时。GitHub 匿名额度耗尽时显示预计恢复时间。
- 分享弹窗默认生成跟随当前 Ref 的链接；固定 revision 位于“更多选项”。本地知识库显示清楚的托管指引。
- 应用、Tauri 和 Agent Skill 版本已同步为 `2.1.0`，中英文 README、使用说明和 Release Notes 已更新。

## 验证证据

- `pnpm check`：53 个测试文件、201 项测试、ESLint、TypeScript 和生产构建通过。
- `pnpm build:web`：Static Web 构建及 IPC 边界检查通过；未打包 Tauri 能力。
- `pnpm test:performance`：3 项性能测试通过。
- `pnpm check:desktop`：Rust fmt/clippy 及 15 项测试通过。
- `pnpm build:desktop:web` 与 `pnpm build:desktop` 通过；本机生成并实际启动 `TensorNote.app`，确认 `桌面版` 标识、新首页和使用说明链接存在。
- GitLab 与 Gitee 公开 API 使用带 Origin 的真实请求验证为 HTTP 200、允许跨域，并成功返回递归目录树；自动测试仍全部使用 Mock Fetch。
- Agent Skill `quick_validate.py` 通过；仓库 fixture 与两个 Skill 模板均通过严格 Workspace 校验。
- `pnpm audit --prod`：无已知漏洞；Release validation 对 `v2.1.0` 返回通过；`git diff --check` 通过。

## 本地候选产物

- `src-tauri/target/release/bundle/macos/TensorNote.app`
- `src-tauri/target/release/bundle/dmg/TensorNote_2.1.0_aarch64.dmg`

这些是本地验证产物，不构成正式 Release。本任务未创建 Tag、GitHub Release、Updater 发布或 Pages 部署。
