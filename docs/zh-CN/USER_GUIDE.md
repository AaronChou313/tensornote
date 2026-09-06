# TensorNote 使用说明

中文（默认） · [English](https://github.com/AaronChou313/tensornote/blob/main/docs/en/USER_GUIDE.md)

适用版本：1.6.1。按“下载 → 打开 → 按需配置 → 日常使用”组织。只阅读、编辑 Markdown 不需要 Jupyter；执行 Python 才需要计算环境。TensorNote 不托管你的知识库或公共算力。

<a id="choose"></a>
## 1. 先选版本

| | 在线 Web（GitHub Pages） | 本地 Web | 桌面版 |
| --- | --- | --- | --- |
| 获取 | 直接打开网站 | 下载 Local Web 包，安装 Node.js 22+ | 下载对应系统、架构的安装包 |
| 打开笔记 | 示例、公开 GitHub、本地目录¹ | 示例、公开 GitHub、本地目录¹ | 示例、公开 GitHub、原生本地目录 |
| 编辑保存 | 本地授权目录可写；GitHub/示例只读 | 本地授权目录可写 | 本地目录可写 |
| Python | HTTPS Jupyter / JupyterHub / BinderHub | 本机 Jupyter 或 HTTPS 远程服务 | 环境检测、创建基础环境、启动 Jupyter；也可连远程 |
| Git | 无本地 Git 集成 | 可选 Git Bridge + 系统 Git | 系统 Git，无需 Bridge |
| 离线 | 已缓存页面不等于完整离线；GitHub、远程计算需网络 | 本地应用、笔记和已安装的本地 Python 可离线使用 | 本地笔记和已安装的本地 Python 可离线使用 |
| 适合 | 快速体验、分享、用团队远程计算 | 不安装桌面应用、在浏览器工作 | 每天管理自己的知识库和本地实验 |

¹ 浏览器读写本地目录需要支持 File System Access API 的 Chrome/Edge，以及你显式选择目录并授权。Safari/Firefox 用户可读示例或 GitHub；本地编辑建议使用桌面版。网页里的本地目录指浏览器所在电脑，不是网站服务器的磁盘。

所有版本共用 Markdown、图片和 `tensornote.yaml`。GitHub 来源固定到具体 Revision 后只读；要修改请先克隆/下载到自己的目录再打开。当前 Git 功能包括状态、差异、暂存和提交，**没有 Push、Pull、Clone 或分支切换**；远程同步使用 Git 客户端。

## 2. 下载和第一次打开

### 在线 Web

打开 [TensorNote 在线版](https://aaronchou313.github.io/tensornote/)，点击 **AI Learning Notes** 即可阅读示例。也可输入 `owner/repository` 打开公开知识库。无需 TensorNote 账户。

### 本地 Web

1. 从 [GitHub Releases](https://github.com/AaronChou313/tensornote/releases) 下载 `TensorNote-local-web-1.6.1.tar.gz`，解压。
2. 安装 Node.js 22 或更高版本。首次下载工具需要网络；包内已编译应用，**无需 pnpm、npm install 或前端构建**。
3. 在解压得到的 `TensorNote-local-web` 文件夹打开终端，运行：

```sh
node start.mjs
```

4. 用 Chrome/Edge 打开终端显示的 `http://127.0.0.1:5173`，点击“打开本地 Workspace”，选择自己的 Markdown 文件夹并允许读写。
5. 保持终端运行。结束时在终端按 `Ctrl+C`；下次重新运行同一命令。

不要双击 `app/index.html`。端口被占用时先停止另一个本地 Web 服务。建议始终用同一个地址：`localhost` 与 `127.0.0.1` 的浏览器授权、设置和 Token 存储彼此独立。

`TensorNote-web-1.6.1.tar.gz` 是用于 `/tensornote/` 路径部署的 Static Web 包；它不是本地 Web 启动包。GitHub 自动提供的 “Source code” 则是开发者源码。

### 桌面版

在 Releases 的 Assets 中选择与你的电脑匹配的安装包。macOS 分 Apple Silicon（aarch64/arm64）和 Intel（x64）；当前流水线也提供 Windows/Linux x64 包，跨平台安装实测覆盖情况以该版本 Release 说明为准。

1. 安装并打开 TensorNote。macOS 将应用拖入 Applications 后再运行。
2. 点击“打开本地 Workspace”选已有笔记目录，或“新建 Workspace”选空文件夹。
3. 在目录树中新建笔记、输入内容、保存；随后可从“最近打开”回到该知识库。
4. 阅读和写作无需安装 Node.js、启动 Web 服务或配置 Python。

当前 GitHub 社区发行不具有 Apple Developer ID 公证或 Windows 受信任发布者签名，系统可能提示未识别的开发者。核对下载来源和 Release 的 `SHA256SUMS`，仅在确认信任该包后使用系统提供的“仍要打开”/“更多信息”流程；受组织策略管理的电脑可能不能继续。Updater 的签名验证与操作系统开发者签名是不同机制。不要关闭整个系统的安全保护。

## 3. 阅读、写作与知识管理

- Overview 显示知识库入口和统计；左侧 Files 是文件目录，折叠分区和隐藏整个侧栏是不同操作。
- 打开笔记后可切换阅读、编辑和双栏预览；保存才写回 Markdown。未保存草稿与外部修改冲突要先处理，避免覆盖。
- WikiLinks、反向链接、标签和 Properties 帮助组织内容；图片与附件保留在知识库目录中。
- 只读示例适合探索，不会直接修改应用内置内容。编辑自己的副本时通过本地目录入口打开。
- 笔记正文是长期数据。Lab 输出、Scratch 临时代码和 Kernel 内存不等于已经保存到笔记；重要结果需显式保存代码、导出或复制。

<a id="compute"></a>
## 4. 按需连接 Jupyter

先打开知识库，再进入 **设置 → 计算与 Jupyter**。确认当前知识库的代码值得信任，然后开启执行权限。GitHub 来源还要信任当前固定 Revision；仓库更新后应重新审核。Token 只填应用专用输入框，不写进笔记、仓库或分享链接。

### 在线 Web：使用自己的在线计算服务

选择顺序：已有 HTTPS Jupyter 选 **Generic Jupyter**；学校/实验室平台选 **JupyterHub**；公开仓库临时体验可选 **BinderHub**。TensorNote 不是算力提供商，也不能把任意 Notebook 网站的分享页面变成可连接的 Jupyter API。

**Generic Jupyter**

1. 从服务提供者获取真正的 Jupyter Server 根地址（例如 `https://compute.example.org/user/me/`）、你自己的 Token 和 Kernel 内部名称。
2. 新增 Remote Server Profile，填写地址（不包含 `?token=`）、Token、Kernel。
3. 服务方需允许 TensorNote 的 Origin：`https://aaronchou313.github.io`，并转发 Kernel WebSocket。Origin 不包括 `/tensornote/` 路径。
4. 运行连接诊断，成功后打开笔记的实验卡，先运行一个简单 Cell。

**JupyterHub**

1. 登录自己的 Hub 账户，获取组织允许的、可撤销的个人 API Token。
2. 新增 JupyterHub Profile，填写 HTTPS Hub 根地址、自己的 Token；用户名可留空由 Token 识别，按需填写命名 Server。
3. Hub 和单用户 Server 都必须允许 TensorNote 来源。组织管理员还需配置 Token WebSocket 接入；单纯登录 Hub 网页不保证跨站 API 可用。
4. 准备连接后运行诊断。TensorNote 复用已有 Server；只会停止它本次启动且仍归它管理的 Server。

**BinderHub**

1. 打开公开 GitHub 知识库，确认固定 commit 和环境文件可信。
2. 新增 BinderHub Profile，使用该平台的 HTTPS 地址及公开仓库的完整 40 位 commit SHA；可以从当前 GitHub Workspace 获取来源。
3. 显式连接，等待环境构建和启动。诊断本身不会触发构建。
4. 公共 Binder 可能排队、超时或容量不足，不能保证随时可用。重要成果及时下载/复制，临时环境会回收，也不会自动回写 GitHub。

在线 HTTPS 页面不能直接连接 `http://127.0.0.1:8888`。想用本机 Python 时最方便的是改用桌面版或本地 Web；不要关闭浏览器安全检查。

### 本地 Web：启动自己的本机 Jupyter

在独立 Python 环境安装基础包（首次需要网络）：

```sh
python3 -m venv .venv
# macOS / Linux
source .venv/bin/activate
# Windows PowerShell 改用：.venv\Scripts\Activate.ps1
python -m pip install jupyter-server ipykernel numpy matplotlib
python -m ipykernel install --user --name tensornote --display-name TensorNote
python -m jupyter_server --no-browser --ServerApp.ip=127.0.0.1 --ServerApp.port=8888 --ServerApp.allow_origin=http://127.0.0.1:5173
```

Windows 如无 `python3`，使用已安装的 `python`。在应用 Local Python Profile 填 `http://127.0.0.1:8888`、Jupyter 启动输出中的 Token、Kernel `tensornote`。保持 Jupyter 终端运行。不要把含 Token 的终端截图公开；不要把 `allow_origin` 改为 `*`。Python 环境属于你选择的位置，与应用解压目录和知识库可以分开。

### 桌面版：运行时助手

1. 在“设置 → 计算与 Jupyter”点击重新检测，选择已安装 Jupyter 的环境。
2. 点击“启动并使用”，应用在本机启动 Jupyter 并自动连接，无需复制随机 Token。
3. 没有合适环境时，查看“创建 TensorNote Managed Environment”的安装计划并按界面确认。仍需可用的 Python/环境管理工具；下载基础包需要网络。
4. 基础环境不包含整个 PyTorch/CUDA 栈。笔记要求的额外依赖需你审核后自行安装。
5. 使用完成可停止；退出应用会清理本次由 TensorNote 启动的 Jupyter，不会停止你另外启动的服务。

### 连接失败时

按诊断顺序处理：地址和协议 → 服务是否运行 → Token → CORS 来源 → Kernel 是否存在 → WebSocket/代理。修好一项再重试，不要反复新建 Profile。可复制脱敏诊断报告反馈问题，发送前仍需检查是否含私密信息。

## 5. 按需启用 Git

### 桌面版

安装系统 Git，打开一个已有 Git 仓库的知识库。进入 Git 页面检查状态、查看差异、暂存、填写消息并提交。无需启动 Bridge。

### 本地 Web

先确认终端中 `git --version` 可用。已有仓库直接使用；新知识库可在其根目录运行 `git init`。在 **应用解压目录** 另开终端：

```sh
node scripts/git-bridge.mjs --workspace "/absolute/path/to/your-vault"
```

把示例绝对路径替换为浏览器当前打开的**知识库 Git 根目录**，不要误指向应用包。然后在应用 Git 页面连接 `http://127.0.0.1:4318`。Bridge 只监听本机，并验证浏览器来源；默认允许 `http://127.0.0.1:5173` 与 `http://localhost:5173`。关闭 Bridge 终端只会停用 Git，不影响阅读和本地编辑。

如使用自定义 Web Origin，在启动 Bridge 前设置 `TENSORNOTE_ORIGIN` 为该完整 Origin，不要使用通配符。源码开发者也可运行 `pnpm git:bridge -- --workspace "..."`。

### 提交不等于同步

建议流程：保存笔记 → Git 页面检查 Diff → 暂存选中文件 → Commit → 用 Git 客户端 Push。另一台设备先 Pull，再打开或刷新知识库。首次身份配置可在知识库终端执行：

```sh
git config user.name "Your Name"
git config user.email "you@example.com"
```

远程地址、登录凭据、Push/Pull、分支与冲突在 Git 客户端处理。TensorNote 不替你保存 GitHub 密码，也不会自动覆盖冲突。Bridge 与 Jupyter 是两种独立的可选服务：前者管理本地 Git，后者运行 Python。

## 6. 让智能体维护知识库

从同版本 Release 下载 `TensorNote-agent-skill-1.6.1.tar.gz`，解压后把 `tensornote-knowledge-workspace/SKILL.md` 连同所在目录交给支持 Skill 的智能体；不能只复制标题或丢弃引用文件。明确指定你的知识库目录，不要让它误改 TensorNote 应用源码目录。

建议任务：“按照这个 Skill 审核并更新指定知识库，保持 Schema v1、稳定笔记 ID、WikiLinks、可执行代码元数据和附件相对路径；先读取现有内容，更新后运行自带验证器并说明变化，不把任何 Token 写入文件。”

验证器在 Skill 目录安装自己的依赖后可独立运行：

```sh
npm ci
node scripts/validate-workspace.mjs "/absolute/path/to/your-vault" --strict
```

智能体仍通过文件读写维护可移植 Markdown；这不是给任意智能体开放桌面 Shell 的远程接口。更多格式与维护规则随 Skill 的 references 和 templates 分发。

## 7. 更新、备份与问题反馈

- 更新前保存笔记、备份整个知识库（包括附件和 `tensornote.yaml`）。应用安装目录与知识库分开。
- 本地 Web：停止服务，解压新版到新目录，运行新版 `node start.mjs`，重新授权原知识库。不要把个人笔记放在 `app/` 中。
- 桌面：设置的更新入口检查新版本；也可下载匹配架构的新版安装包。不要在写入/执行过程中强制替换应用。
- 在线：重新加载网站。若旧缓存导致样式异常，先保存本地草稿，再刷新或清除该站点缓存；清理站点数据可能丢失本机偏好、授权和会话 Token，不会删除目录里的 Markdown。
- 侧栏不见时先检查隐藏侧栏按钮和窗口宽度。1.6.1 修复了 Web/Desktop 共用侧栏变换规则冲突；若仍异常，请提供版本、系统、窗口尺寸和不含私密内容的截图。
- 在 [GitHub Issues](https://github.com/AaronChou313/tensornote/issues) 反馈复现步骤。不要上传私有知识库、Token 或凭据。

## 服务端参考

[Jupyter Server](https://jupyter-server.readthedocs.io/en/latest/operators/public-server.html) · [JupyterHub REST API](https://jupyterhub.readthedocs.io/en/stable/howto/rest.html) · [Binder usage limits](https://mybinder.readthedocs.io/en/latest/about/user-guidelines.html)

刷新 Workspace 概览会返回首页，可从“最近打开”继续；浏览器目录权限可能需要再次确认。
