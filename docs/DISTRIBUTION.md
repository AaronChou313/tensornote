# TensorNote 分发与部署

> 面向用户的最新安装与使用主线已拆分为 [中文说明（默认）](zh-CN/USER_GUIDE.md) / [English user guide](en/USER_GUIDE.md)。本文保留专题技术参考；当前 GitHub 社区发行策略以 [发布矩阵](RELEASE_MATRIX.md) 为准。

TensorNote v0.8.4 起用 `DeploymentAdapter` 明确区分 Static Web、Local Web 与 Self-hosted Web；v1.1.0 再通过 `HostAdapter` 加入 Tauri Desktop。四种模式共享同一 React、Workspace、Document、Compute 与 Extension 代码，不复制业务逻辑。

## 1. Local Web

本地创作仍是能力最完整的模式：

```bash
pnpm install --frozen-lockfile
pnpm dev
```

打开 `http://localhost:5173`。Local Web 支持浏览器目录选择、Markdown 读写、Jupyter，以及按需启动的 localhost Git Bridge。Jupyter 和 Git Bridge 的完整启动顺序见[环境配置与使用手册](ENVIRONMENT_SETUP.md)。

## 2. Static Web

Static build 使用 Hash Router，因此 GitHub Pages 等平台无需为 `/notes/...` 配置 SPA Rewrite：

```bash
VITE_TENSORNOTE_DEPLOYMENT=static \
VITE_BASE_PATH=/tensornote/ \
pnpm build

pnpm preview
```

根域部署时把 `VITE_BASE_PATH` 设为 `/`。`dist/` 可上传到 GitHub Pages、Cloudflare Pages、Netlify、Vercel Static 或普通静态服务器。

仓库包含 `.github/workflows/deploy-pages.yml`，用于手动发布 TensorNote 官方 Reader。v1.4.0 另提供 `.github/workflows/publish-workspace.yml` 可复用 Workflow 与 Skill 内的单文件调用模板，让第三方公开知识库在推送 Markdown 后自动校验并部署自己的 Pages。首次使用需在 GitHub Repository Settings → Pages 中选择 GitHub Actions；完整步骤见[发布 TensorNote Workspace](PUBLISHING.md)。

Static Web 支持 Built-in/GitHub Workspace、Markdown 阅读、浏览器允许时的本地目录和远程 Jupyter。它不显示 localhost Git Bridge 入口；HTTPS 页面也不能连接 HTTP Jupyter，诊断界面会明确指出 Mixed Content。

## 3. Self-hosted Web

构建并启动 Nginx 容器：

```bash
docker compose up --build -d
```

打开 `http://localhost:8080`。停止：

```bash
docker compose down
```

`Dockerfile` 先生成 `VITE_TENSORNOTE_DEPLOYMENT=self-hosted` 的生产资源，再用非特权 8080 端口提供 Nginx SPA fallback、静态资源长期缓存和基本安全响应头。

当前 Self-hosted 是“自托管 Web Runtime”，支持现有浏览器 Workspace Provider；尚未实现读取服务器挂载目录的 TensorNote Server，因此 UI 不会声称具备 Server Workspace。未来 Server 只应作为新的 Workspace/Compute Adapter 接入。

## 4. PWA

生产构建默认注册 PWA。首次在线打开后，同源应用 Shell 与访问过的构建资源可以从 Cache Storage 恢复。安装入口由浏览器决定，可在 Chrome/Edge 地址栏或浏览器菜单中选择“安装 TensorNote”。

禁用 PWA：

```bash
VITE_TENSORNOTE_PWA=false pnpm build
```

PWA 离线能力只覆盖应用 Shell 和已经缓存的同源资源：

- 不会缓存 Jupyter Token 或 Extension Secret。
- 不会把任意 GitHub Repository、Jupyter 响应或用户 Workspace 文件批量复制进 Cache Storage。
- Local Directory 权限是否能在安装后的 PWA 中继续使用由浏览器决定。
- Service Worker 注册 URL 携带 `package.json` 的产品版本，并据此生成 `tensornote-shell-v<version>` Cache；升级会清除旧的 TensorNote Cache，避免代码版本与离线 Shell 漂移。

## 5. Base Path 与环境变量

| 变量 | 值 | 说明 |
| --- | --- | --- |
| `VITE_TENSORNOTE_DEPLOYMENT` | `local` / `static` / `self-hosted` / `desktop` | 选择 Deployment Adapter；默认 `local` |
| `VITE_BASE_PATH` | `/` 或 `/repository/` | Vite 资源与 Service Worker Scope 前缀 |
| `VITE_TENSORNOTE_PWA` | `false` 或省略 | 是否注册 Service Worker |
| `VITE_TENSORNOTE_PUBLIC_READER_URL` | HTTPS 根地址 | 分享面板生成固定 Web 链接时使用的 Reader；默认是 TensorNote 官方 Pages |
| `VITE_TENSORNOTE_PUBLISH_OWNER` | GitHub owner | Repository-owned Reader 自动打开的来源；必须与 repo/revision 同时提供 |
| `VITE_TENSORNOTE_PUBLISH_REPO` | GitHub repository | Repository-owned Reader 自动打开的来源 |
| `VITE_TENSORNOTE_PUBLISH_REVISION` | 完整 commit SHA | Repository-owned Reader 固定的内容版本 |
| `VITE_TENSORNOTE_PUBLISH_NOTE` | 笔记 ID，可选 | 覆盖 `publishing.defaultNote` 的首页 |

这些变量在构建时固定。改变后必须重新执行 `pnpm build`。

## 6. Desktop 与可信更新

Desktop 需要 Rust stable、Cargo 和当前平台的 Tauri 系统依赖。macOS 使用 Homebrew Rust 即可：

```bash
rustc --version
cargo --version
pnpm install --frozen-lockfile
pnpm dev:desktop
```

构建当前平台应用：

```bash
pnpm check:desktop
pnpm build:desktop
```

`pnpm build:desktop` 会先用 `.env.desktop` 构建共享前端，再调用 Tauri。普通开发构建不生成 Updater 资产；正式流水线额外合并 `src-tauri/tauri.release.conf.json`，使用工作区外的私钥生成签名 Updater bundle。Settings → About 只在 Desktop 暴露检查、下载、验证、安装和重启；Web 继续由部署渠道更新。

Desktop 仍要求用户自行安装系统 Git 才能使用 Native Git。运行 Python Lab 至少需要一个本机 Python；运行时助手可复用已有 Jupyter 环境，或在用户确认后通过检测到的 uv、Conda 或标准 venv 创建最小基础环境。打开目录后可在 Workspace 菜单选择“在文件管理器中显示”；也可把目录或 `.md` / `.markdown` 文件拖入窗口。

Desktop 的 IPC 权限面见 [Tauri 安全 ADR](adr/0002-tauri-security-surface.md)、[Native Workspace ADR](adr/0003-native-workspace-capability.md)、[Local Runtime ADR](adr/0004-local-runtime-assistant.md)与[发布 ADR](adr/0005-publish-read-anywhere.md)。CI 对 macOS、Windows 和 Linux 运行 Rust 门与 `tauri build --no-bundle`，避免平台专属代码静默漂移；Static build 另有脚本阻止 Native IPC 与 Deep Link 插件进入 GitHub Pages 产物。

正式 Tag 由 `.github/workflows/release.yml` 构建 Pages、Web archive 与多平台安装包。当前 github-community 渠道必须有 Updater Secret，平台开发者签名可选；未来 trusted-desktop 渠道才要求 Apple/Windows 凭据齐全。候选先保持 Draft。资产、签名检查、SHA-256 与回滚步骤见 [Release Matrix](RELEASE_MATRIX.md)。

## 7. 性能验证

运行专用门：

```bash
pnpm test:performance
```

覆盖：

- 1,000 笔记交互索引预算。
- 10,000 笔记后台加载预算。
- 超过 2MB 的单篇 Markdown。
- 1,000 个 Asset 的目录索引不读取二进制内容。

阈值用于捕获数量级退化，不是跨硬件性能承诺。正式提交仍必须运行 `pnpm test`、`pnpm lint` 和 `pnpm build`。
