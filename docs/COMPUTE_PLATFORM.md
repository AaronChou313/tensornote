# TensorNote Compute Platform 使用说明

> 面向用户的最新安装与使用主线已拆分为 [中文说明（默认）](zh-CN/USER_GUIDE.md) / [English user guide](en/USER_GUIDE.md)。本文保留专题技术参考；当前 GitHub 社区发行策略以 [发布矩阵](RELEASE_MATRIX.md) 为准。

本文覆盖 `v0.4.0 — Compute Platform` 到 `v1.5.0 — Remote Compute Connectors`。TensorNote 始终使用标准 Compute Provider 执行 Python；Profile 可以直连 Jupyter，也可以先由 JupyterHub 或 BinderHub Connector 获得一个标准 Jupyter Endpoint。

Python 环境、Conda、`venv`、`uv`、Jupyter 安装与每日启动命令见[环境配置与使用手册](ENVIRONMENT_SETUP.md)。

## 1. 概念

```text
Lab / Scratch Lab
        │
        ▼
ComputeRuntime ── Profile + Session Scope
        │
        ▼
ComputeConnector（Direct / JupyterHub / BinderHub）
        │  标准 Connection Lease
        ▼
ComputeProvider（v0.4 为 Jupyter）
        │
        ▼
Jupyter Server ── Kernel
```

- **Compute Provider**：统一连接、执行、中断、重启、关闭和诊断接口。v0.4 内置 Jupyter Provider，后续可增加其他实现。
- **Compute Connector**：验证、发现或启动计算服务，最终只返回标准 Jupyter 连接；不读取笔记，也不执行代码。
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
| JupyterHub | 高校、实验室或组织的个人 Server | Per workspace |
| BinderHub | 公开 GitHub 固定 Revision 的临时环境 | Per workspace |

模板地址只是示例。创建后必须按真实环境修改：

- **Profile name**：界面显示名，不影响 Jupyter。
- **Server URL**：例如 `http://127.0.0.1:8888`；不要附带 `?token=...`。
- **Kernel Name**：Jupyter 内部名称，可通过 `jupyter kernelspec list` 查看，例如 `tensornote`。
- **Token**：从 `jupyter server list` 获取。每次浏览器会话可能需要重新填写。
- **Connection**：Generic Jupyter、JupyterHub 或 BinderHub。远程服务必须使用 HTTPS。

修改连接地址、Kernel、Scope 或切换 Profile 时，现有不兼容 Session 会先被关闭。删除 Profile 不会删除 Python 环境、Jupyter Kernel Spec 或远程文件。

### Remote Connector 兼容性矩阵

| Connector | 身份 | Server 生命周期 | 数据持久性 | 必要条件 |
| --- | --- | --- | --- | --- |
| Generic Jupyter | 可选 Jupyter Token | 外部管理；TensorNote 只管理 Kernel | Server 管理者决定 | HTTPS、CORS、Kernel WebSocket |
| JupyterHub | 当前用户有限权限 API Token | 复用已有 Server，或启停 TensorNote 本次启动的 Server | Hub 管理者决定 | Hub 与用户 Server CORS；读/启停自身 Server 权限；命名 Server；Token WebSocket 配置 |
| BinderHub | build/launch 返回的临时 Token | 从固定 Revision 构建、启动并在断开时释放；默认 5 分钟启动超时 | 临时、受平台闲置回收约束 | 公开 GitHub Repo、40 位 commit SHA、兼容环境文件、HTTPS/CORS |

JupyterHub Profile 可留空用户名，让 Token 自动识别身份；填写用户名时会额外校验，防止误用他人 Token。BinderHub 默认读取当前 GitHub Workspace 的 Repository 和已解析 commit，也可在 Profile 中显式指定同样格式的公开来源。

浏览器 WebSocket 不能附加普通 HTTP `Authorization` 请求头，因此 JupyterLab Services 会在 Kernel WebSocket URL 中携带 Token。JupyterHub 5 的纯 Token 接入应在单用户 Server 环境中设置 `JUPYTERHUB_ALLOW_TOKEN_IN_URL=1`；REST 请求仍由 TensorNote 使用 `Authorization: token …`，不会把 Token 写入 URL。只应在 HTTPS 下使用有限权限、可撤销的 Token。若组织不允许 URL Token，应使用其交互式 OAuth 登录后的同源 Cookie，或由受信任的 Desktop/反向代理桥接，不能靠前端绕过策略。

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

## 6. 从编辑器插入实验

编辑本地可写笔记时，点击 Markdown 工具栏中的烧瓶“实验”按钮，可以直接创建可执行实验，无需手写 Fence 元数据。

1. 可先在编辑器中选中一段 Python 代码；打开窗口后，这段代码会成为第一个 Cell。
2. 填写稳定的实验标识，例如 `loss-curves`。相同标识的 Cell 会合并为同一张实验卡。
3. 选择运行级别，并按需使用“添加 Cell”组织准备数据、运行模型、绘图等步骤。
4. 点击“插入实验”后保存笔记；切回阅读视图即可从实验卡打开并运行全部 Cell。

TensorNote 会自动生成连续的 `cell` 编号和必要的 `exec`、`lab`、`title`、`difficulty` 元数据。Cell 代码不能包含嵌套的三个反引号 Fence；需要展示 Fence 时请改用字符串拼接或其他写法。

## 7. Scratch Lab

点击顶部 `Scratch` 打开临时实验区。Scratch Cell 只存在浏览器内存中，适合验证 API、检查张量形状或快速调试。

1. 使用 `Add cell` 添加临时 Cell。
2. 正常运行、重启或清空输出。
3. 打开一篇本地可写笔记。
4. 点击 `Insert into note`，TensorNote 才会把非空 Cell 追加为带 `exec` 的 Python Fence。

关闭、刷新或离开仍有代码的 Scratch Lab 前会出现确认。Scratch 不自动恢复，也不会在后台静默修改 Markdown。如果当前 Markdown Editor 有未保存内容，必须先保存编辑器草稿，再插入 Scratch，以避免覆盖。

## 8. Workspace Environment

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

Compute 设置会标记 `Found`、`Missing`、`declared` 或 `detected`。这些 Workspace 文件只是可见性提示，TensorNote **绝不静默安装 Workspace 依赖**。Local Web 用户仍需在终端中审核文件；v1.3.0 Desktop 可另外创建 TensorNote 自己管理的最小基础环境，但必须先审核固定计划并输入确认短语。

### Desktop Local Runtime Assistant

Desktop 的“设置 → 计算与 Jupyter”提供独立运行时助手：

1. “重新检测”只读扫描 Python、Conda、uv、Jupyter、Kernel 与 Loopback Server；前端看不到可执行文件绝对路径。
2. “创建 TensorNote Managed Environment”先生成计划。最小包固定为 `jupyter-server`、`ipykernel`、`numpy`、`matplotlib` 与 `pillow`，不包含 PyTorch、Transformers、CUDA 或 Workspace 依赖。
3. 输入界面给出的精确确认短语后才创建；失败或取消会清理不完整目录，只有完成全部步骤的环境会显示为 Managed。
4. 选择已安装 Jupyter 的环境并点击“启动并使用”。TensorNote 只在 `127.0.0.1` 启动带随机 Token 的 Owned Server，端口就绪后自动创建当前会话 Compute Profile。
5. 可查看有长度上限且已脱敏的日志；“停止”只会终止 TensorNote 当前仍拥有的 Server，并移除临时 Profile。关闭应用也会停止 Owned Server。

运行时助手不会修改 Workspace、读取其中的安装命令、停止外部 Jupyter，或把 Jupyter 合并进 TensorNote 进程。Conda、uv、Python、Jupyter 和 Kernel 仍是独立工具。

## 9. Connection Diagnostics

点击 `Run diagnostics` 后按顺序检查：

1. **Browser access**：页面协议是否允许访问目标 URL；HTTPS 页面不能直接请求 HTTP Server。
2. **Server reachable**：浏览器能否访问 Jupyter REST API。
3. **Authentication**：Token 是否被接受。
4. **CORS**：浏览器能否读取响应；Jupyter 的 `allow_origin` 必须匹配 TensorNote Origin。
5. **Kernel available**：Kernel Name 是否存在。
6. **WebSocket**：创建一个临时 Kernel 测试实时通道，然后立即关闭。

诊断不会安装包或修改 Workspace。WebSocket 检查会短暂创建一个 Kernel；正在运行的 TensorNote Compute Session 不会被诊断复用。

Connector 诊断在 Jupyter 检查之前执行：JupyterHub 会验证身份并判断目标 Server 是已就绪还是需要启动；BinderHub 只检查固定来源和 `/health`，不会因“运行诊断”触发昂贵构建。点击“复制诊断报告”得到不含 Token、URL Query 和用户密码的纯文本报告，分享前仍应人工复核。

常见结果：

- Browser 失败：检查 HTTP/HTTPS 混合内容和浏览器对 localhost 的限制。
- Server 与 CORS 同时失败：先确认 Jupyter 仍在运行，再核对 `--ServerApp.allow_origin`。
- Authentication 失败：用 `jupyter server list` 获取当前 Token。
- Kernel 失败：用 `jupyter kernelspec list` 核对内部名称。
- WebSocket 失败：检查反向代理是否转发 Upgrade/Connection 头，以及网络或防火墙；JupyterHub 5 的纯 Token 模式还要检查用户 Server 的 `JUPYTERHUB_ALLOW_TOKEN_IN_URL=1`。

## 10. 安全边界

- Workspace 默认遵循 `features.executable`；用户也可以在“设置 → 计算与 Jupyter”中为当前 Workspace 显式开启或关闭执行。
- 手动授权按 Workspace 保存在当前浏览器，不会静默改写 `tensornote.yaml`，也不会随仓库分享给其他设备。
- GitHub Workspace 必须信任固定的 `owner/repo@commitSHA`；Revision 改变后重新确认。
- Token 只存在当前浏览器会话，诊断错误也会对 Token 文本脱敏。
- BinderHub 返回的临时 Token、Server URL 与 Lease 只存在运行时内存，不进入 Profile、恢复快照、Pages Cache 或 Workspace。
- TensorNote 只会停止自己本次启动的 JupyterHub Server；连接前已经存在的 Server 始终属于用户或 Hub 管理者。
- Binder 环境中的文件和 UI 输出不会写回只读 GitHub Workspace；重要结果必须显式下载或复制到本地 Workspace。
- 不建议关闭 Jupyter 身份验证，也不建议使用 `allow_origin=*`。
- TensorNote 不自动安装 Workspace 声明的 Python 依赖；Desktop Managed Environment 也只安装界面明确列出的最小基础包。

## 11. 远程公开知识库流程

1. 作者把带环境文件和 executable Markdown 的 Workspace 发布到公开 GitHub Repository，并使用固定 Revision Reader。
2. 读者显式信任该 Revision，并在当前浏览器为 Workspace 开启执行。
3. 读者选择自己的 Generic Jupyter/JupyterHub Profile，或选择 BinderHub 临时环境。
4. Connector 完成身份、构建或 Server 启动后，现有 Jupyter Compute Provider 创建隔离 Kernel；多 Cell Lab 按原顺序运行。
5. 断开、切换 Workspace 或关闭应用时，Kernel 与 TensorNote-owned Lease 被清理；远程输出不自动持久化。

BinderHub `/build` 的事件和临时 URL/Token 语义见 [BinderHub API](https://binderhub.readthedocs.io/en/latest/api.html)；JupyterHub 当前用户、Server 启停与 Progress API 见 [JupyterHub REST API](https://jupyterhub.readthedocs.io/en/stable/reference/rest-api.html)。公共 Binder 资源没有生产可用性承诺，不应作为 TensorNote 默认后端。

## 12. 每日启动清单

Desktop：启动 TensorNote → 打开 Workspace → 在设置中“启动并使用” → 开始运行 Lab。Local Web：终端 A 启动 Jupyter，终端 B 启动 TensorNote，再配置 Profile。两种模式仅阅读 Markdown 时都不需要 Jupyter。
