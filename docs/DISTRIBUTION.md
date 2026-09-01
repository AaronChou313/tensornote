# TensorNote 分发与部署

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

仓库包含 `.github/workflows/deploy-pages.yml`，只允许手动 `workflow_dispatch`，不会因普通 Push 自动发布。首次使用需在 GitHub Repository Settings → Pages 中选择 GitHub Actions，然后手动运行 `Deploy static TensorNote`。

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

这些变量在构建时固定。改变后必须重新执行 `pnpm build`。

## 6. Desktop 源码阶段

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

`pnpm build:desktop` 会先用 `.env.desktop` 构建共享前端，再调用 Tauri。v1.2.0 Desktop 支持 Built-in/GitHub，以及系统选择器授权的原生本地 Workspace：读写、原子保存、外部修改检测、最近目录恢复、拖放、Markdown 文件关联、Reveal 和受限 Native Git 均不依赖浏览器 File System Access API 或 localhost Bridge。环境检测和 Jupyter 生命周期属于 v1.3.0。当前产物未签名、公证，也不作为正式安装包发布。

Desktop 仍要求用户自行安装系统 Git 才能使用 Native Git。打开目录后可在 Workspace 菜单选择“在文件管理器中显示”；也可把目录或 `.md` / `.markdown` 文件拖入窗口。直接打开单篇 Markdown 时，TensorNote 优先寻找最近的 `tensornote.yaml` 或 Git 根目录，否则以该文件所在目录作为 Workspace。

Desktop 的 IPC 权限面见 [Tauri 安全 ADR](adr/0002-tauri-security-surface.md)与 [Native Workspace ADR](adr/0003-native-workspace-capability.md)。CI 对 macOS、Windows 和 Linux 运行 Rust 门与 `tauri build --no-bundle`，避免平台专属代码静默漂移；Static build 另有脚本阻止 Native IPC 进入 GitHub Pages 产物。

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
