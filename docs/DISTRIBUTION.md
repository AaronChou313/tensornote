# TensorNote 分发与部署

TensorNote v0.8.4 起用 `DeploymentAdapter` 明确区分 Static Web、Local Web 与 Self-hosted Web。三种模式共享同一 React、Workspace、Document、Compute 与 Extension 代码，不复制业务逻辑。

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
- Service Worker 更新会清除旧的 `tensornote-shell-*` Cache。

## 5. Base Path 与环境变量

| 变量 | 值 | 说明 |
| --- | --- | --- |
| `VITE_TENSORNOTE_DEPLOYMENT` | `local` / `static` / `self-hosted` | 选择 Deployment Adapter；默认 `local` |
| `VITE_BASE_PATH` | `/` 或 `/repository/` | Vite 资源与 Service Worker Scope 前缀 |
| `VITE_TENSORNOTE_PWA` | `false` 或省略 | 是否注册 Service Worker |

这些变量在构建时固定。改变后必须重新执行 `pnpm build`。

## 6. 性能验证

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
