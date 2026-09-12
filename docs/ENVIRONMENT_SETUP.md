# TensorNote 2.0 环境配置

## 普通使用

Web 在线版直接打开。Desktop 从 GitHub Release 安装后直接选择本地 Workspace。阅读和编辑均不需要 Node.js、Vite、Python 或 Jupyter。

## Desktop 本地 Jupyter

设置 → 计算与 Jupyter → 本地运行。

- 便捷连接：选择检测到的 Conda/uv/venv 环境，或创建 Python 3.11 环境。确认界面会显示完整落盘路径。TensorNote 可为明确选择的环境补齐 Jupyter 支持并启动/停止 loopback Server。
- 手动连接：自行启动 Jupyter，再填写 URL、当前 Token 和 Kernel。不要使用通配 CORS 或把 Token 写入 Workspace。

常见手动准备：

```sh
conda create -n tensornote python=3.11 pip -y
conda activate tensornote
python -m pip install -r requirements-jupyter.txt
jupyter server --ip=127.0.0.1 --port=8888 --no-browser
```

## Web 远程 Jupyter

设置 → 计算与 Jupyter → 远程运行。使用兼容的 HTTPS Direct Jupyter、JupyterHub 或 BinderHub。在线 HTTPS 页面不能连接普通 HTTP localhost Server；服务需允许当前 Origin 和 WebSocket。先运行诊断，再执行 Sidecar。

## 开发环境

需要 Node.js 22、pnpm 11；Desktop 另需 Rust 和系统构建依赖。

```sh
pnpm install --frozen-lockfile
pnpm dev                 # Web 开发服务器
pnpm dev:desktop         # Desktop 开发
pnpm check
pnpm check:desktop
```

TensorNote 2.0 不提供 Local Web 发行包或 Git Bridge。Workspace 同步使用 Git CLI 或独立 Git 客户端。
