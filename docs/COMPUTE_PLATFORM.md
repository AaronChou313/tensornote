# TensorNote Compute Platform 使用说明

本文对应 `v0.4.0 — Compute Platform`。TensorNote 仍使用 Jupyter Server 执行 Python，但界面不再把一次 Jupyter 连接当作全局单例，而是通过 Compute Provider、Profile 和 Session Scope 管理不同计算环境。

Python 环境、Conda、`venv`、`uv`、Jupyter 安装与每日启动命令见[环境配置与使用手册](ENVIRONMENT_SETUP.md)。

## 1. 概念

```text
Lab / Scratch Lab
        │
        ▼
ComputeRuntime ── Profile + Session Scope
        │
        ▼
ComputeProvider（v0.4 为 Jupyter）
        │
        ▼
Jupyter Server ── Kernel
```

- **Compute Provider**：统一连接、执行、中断、重启、关闭和诊断接口。v0.4 内置 Jupyter Provider，后续可增加其他实现。
- **Compute Profile**：一个可复用的计算环境配置，包含名称、Server URL、Kernel Name 和 Session Scope。
- **Compute Session**：实际运行代码的 Kernel 会话。TensorNote 按需创建，不会因为打开页面就自动启动。
- **Token**：只保存在当前浏览器 `sessionStorage`，不会写进 Markdown、Workspace 配置或 Git。

## 2. 打开 Compute 设置

下列入口都打开同一设置面板：

1. 顶部工具栏中的 Kernel 状态与 Profile 名称。
2. Lab Drawer 右上角的齿轮按钮。
3. 执行错误后的 `打开 Compute 设置`。

左侧是 Profile 列表，右侧依次包含 Connection、Session Scope、Connection Diagnostics 与 Workspace Environment。

## 3. 创建和配置 Profile

点击 `Add profile` 后可以从模板开始：

| 模板 | 典型用途 | 默认 Scope |
| --- | --- | --- |
| Local Python | 本机 CPU 与日常学习 | Per note |
| Laptop GPU | 笔记本 GPU | Per workspace |
| Lab RTX4090 | 局域网工作站 | Per workspace |
| Remote Server | HTTPS 远程 Jupyter | Manual |
| Jetson | 边缘设备与部署验证 | Manual |

模板地址只是示例。创建后必须按真实环境修改：

- **Profile name**：界面显示名，不影响 Jupyter。
- **Server URL**：例如 `http://127.0.0.1:8888`；不要附带 `?token=...`。
- **Kernel Name**：Jupyter 内部名称，可通过 `jupyter kernelspec list` 查看，例如 `tensornote`。
- **Token**：从 `jupyter server list` 获取。每次浏览器会话可能需要重新填写。

修改连接地址、Kernel、Scope 或切换 Profile 时，现有不兼容 Session 会先被关闭。删除 Profile 不会删除 Python 环境、Jupyter Kernel Spec 或远程文件。

## 4. Session Scope

| Scope | 切换笔记 | 切换 Workspace / 关闭应用 | 适合场景 |
| --- | --- | --- | --- |
| Per note | 关闭当前 Kernel | 关闭 | 笔记间严格隔离，默认且最安全 |
| Per workspace | 继续复用 | 关闭 | 多篇笔记共享变量或已加载模型 |
| Manual | 继续复用 | 关闭 | 显式点击 Disconnect 管理，适合远程设备 |

所有 Scope 在连接配置改变时都会关闭旧 Session。`Manual` 不等于永久后台运行：离开当前 Workspace 或关闭 TensorNote 时仍会请求关闭 Kernel；Jupyter Server 本身由终端单独管理。

## 5. Lab 操作

- **Run**：运行当前 Cell；快捷键为 `Shift + Enter`。
- **Run All**：按顺序运行全部 Cell。
- **Run Above**：运行当前 Cell 上方的 Cell。
- **Run Below**：运行当前 Cell 及其下方 Cell。
- **Interrupt**：中断当前正在执行的 Kernel 请求。
- **Restart**：清空 Kernel 内存并保留 Lab 编辑内容。
- **Restart & Run All**：重启后从第一格顺序执行。
- **Clear outputs**：只清空 TensorNote 当前显示的输出，不重启 Kernel。
- **Save to note**：本地可写 Workspace 中，把 Lab 代码修改写回原 executable Fence。

输出不会自动写入 Markdown。图片和 HTML 输出只存在当前界面会话中。

## 6. Scratch Lab

点击顶部 `Scratch` 打开临时实验区。Scratch Cell 只存在浏览器内存中，适合验证 API、检查张量形状或快速调试。

1. 使用 `Add cell` 添加临时 Cell。
2. 正常运行、重启或清空输出。
3. 打开一篇本地可写笔记。
4. 点击 `Insert into note`，TensorNote 才会把非空 Cell 追加为带 `exec` 的 Python Fence。

关闭、刷新或离开仍有代码的 Scratch Lab 前会出现确认。Scratch 不自动恢复，也不会在后台静默修改 Markdown。如果当前 Markdown Editor 有未保存内容，必须先保存编辑器草稿，再插入 Scratch，以避免覆盖。

## 7. Workspace Environment

Workspace 可以在 `tensornote.yaml` 声明依赖文件：

```yaml
schemaVersion: 1
environment:
  files:
    - requirements.txt
    - pyproject.toml
    - environments/gpu.yml
```

TensorNote 同时自动检测根目录的：

- `requirements.txt`
- `pyproject.toml`
- `environment.yml`
- `environment.yaml`

Compute 设置会标记 `Found`、`Missing`、`declared` 或 `detected`。这只是可见性提示：TensorNote **绝不静默创建环境或安装依赖**。用户仍需在终端中审核文件并选择 Conda、pip 或 uv 执行安装。

## 8. Connection Diagnostics

点击 `Run diagnostics` 后按顺序检查：

1. **Browser access**：页面协议是否允许访问目标 URL；HTTPS 页面不能直接请求 HTTP Server。
2. **Server reachable**：浏览器能否访问 Jupyter REST API。
3. **Authentication**：Token 是否被接受。
4. **CORS**：浏览器能否读取响应；Jupyter 的 `allow_origin` 必须匹配 TensorNote Origin。
5. **Kernel available**：Kernel Name 是否存在。
6. **WebSocket**：创建一个临时 Kernel 测试实时通道，然后立即关闭。

诊断不会安装包或修改 Workspace。WebSocket 检查会短暂创建一个 Kernel；正在运行的 TensorNote Compute Session 不会被诊断复用。

常见结果：

- Browser 失败：检查 HTTP/HTTPS 混合内容和浏览器对 localhost 的限制。
- Server 与 CORS 同时失败：先确认 Jupyter 仍在运行，再核对 `--ServerApp.allow_origin`。
- Authentication 失败：用 `jupyter server list` 获取当前 Token。
- Kernel 失败：用 `jupyter kernelspec list` 核对内部名称。
- WebSocket 失败：检查反向代理是否转发 Upgrade/Connection 头，以及网络或防火墙。

## 9. 安全边界

- 只有 `features.executable: true` 的 Workspace 才允许执行。
- GitHub Workspace 必须信任固定的 `owner/repo@commitSHA`；Revision 改变后重新确认。
- Token 只存在当前浏览器会话，诊断错误也会对 Token 文本脱敏。
- 不建议关闭 Jupyter 身份验证，也不建议使用 `allow_origin=*`。
- TensorNote 不自动安装 Workspace 声明的 Python 依赖。

## 10. 每日启动清单

1. 终端 A 激活正确 Python 环境并启动 Jupyter Server。
2. 终端 B 启动 TensorNote：`pnpm dev --host localhost --port 5173 --strictPort`。
3. 浏览器打开 `http://localhost:5173`。
4. 选择 Profile，必要时更新 Token，首次或故障时运行 diagnostics。
5. 仅阅读 Markdown 时不需要启动 Jupyter。
