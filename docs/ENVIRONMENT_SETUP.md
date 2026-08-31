# TensorNote 环境配置与使用手册

本文从一台尚未配置开发环境的电脑开始，覆盖前端依赖、三种 Python 环境方案、Jupyter Server、Kernel 注册、TensorNote 连接设置，以及以后每天的启动和关闭顺序。

> [!IMPORTANT]
> Conda、标准 `venv`、`uv` 是三种可替代的 Python 环境方案。选择其中一种即可，不要为同一个 TensorNote 环境同时混用三种方案。

## 1. 运行结构

TensorNote 日常阅读由前端进程组成；运行 Python Lab 时增加 Jupyter，使用 v0.8 Local Git 工作台时再增加可选 Git Bridge：

```text
浏览器中的 TensorNote（http://localhost:5173）
        ├── Jupyter REST + WebSocket（可选，运行 Python）
        │       ▼
        │   Jupyter Server → tensornote Kernel
        │
        └── HTTP / JSON（可选，本地版本管理）
                ▼
            Git Bridge → 系统 Git
```

- 前端进程负责 Markdown 阅读、目录、搜索、公式、图表和 Lab 界面。
- Jupyter Server 负责启动 Kernel、执行 Python 和返回输出。
- Python 环境提供 PyTorch、NumPy、Matplotlib、Transformers 等课程依赖。
- 普通阅读不需要 Jupyter；只有运行带 `exec` 的 Python Cell 时才需要它。
- 普通阅读和编辑不需要 Git Bridge；只有使用 `/git` 的 Status、Diff、History、Stage 或 Commit 时才需要它。
- 笔记正文保存在 `notes/**/*.md`，不依赖数据库。

## 2. 首次安装公共工具

无论选择哪一种 Python 方案，都需要 Git、Node.js 和 pnpm。

### 2.1 Git

安装 [Git](https://git-scm.com/downloads) 后检查：

```bash
git --version
```

如果项目尚未下载：

```bash
git clone <仓库地址> tensornote
cd tensornote
```

如果已经位于项目目录，只需确认：

```bash
git status
```

### 2.2 Node.js 与 pnpm

建议安装 Node.js 22 或更高版本。安装 [Node.js](https://nodejs.org/en/download) 后检查：

```bash
node --version
npm --version
```

安装 pnpm。macOS 且已安装 Homebrew 时可使用：

```bash
brew install pnpm
```

Windows 可使用：

```powershell
winget install -e --id pnpm.pnpm
```

也可以在任何已安装 Node.js/npm 的平台运行：

```bash
npx get-pnpm
```

检查安装：

```bash
pnpm --version
```

在 TensorNote 根目录安装前端依赖：

```bash
pnpm install
```

这一步只需要在首次配置、切换电脑或 `pnpm-lock.yaml` 发生变化后执行。

## 3. 选择一种 Python 环境方案

以下三节三选一。推荐 Python 3.11：对 PyTorch、Jupyter 和常用 AI 包兼容性较稳妥。

### 方案 A：Conda

适合已经使用 Conda、需要管理多个科学计算环境，或希望系统 Python 完全不受影响的用户。

#### A.1 安装 Conda

从 [Miniconda 官方安装页](https://www.anaconda.com/docs/getting-started/miniconda/install) 下载当前系统的安装程序。安装后打开新终端：

```bash
conda --version
```

如果当前 shell 还不能执行 `conda activate`，初始化对应 shell，然后完全关闭并重新打开终端：

```bash
# macOS 默认 shell
conda init zsh

# Linux 常见 shell
conda init bash
```

Windows 可以使用安装器提供的 Miniconda Prompt，或在 PowerShell 中运行：

```powershell
conda init powershell
```

#### A.2 创建并激活环境

```bash
conda create -n tensornote python=3.11 pip -y
conda activate tensornote
python --version
```

终端提示符前通常会出现 `(tensornote)`。可用下面的命令确认当前环境：

```bash
conda info --envs
```

#### A.3 安装 Jupyter 和课程依赖

在已激活的 `tensornote` 环境中、TensorNote 根目录下运行：

```bash
python -m pip install --upgrade pip
python -m pip install -r requirements-jupyter.txt
```

如果需要传统 JupyterLab 页面，可额外安装；TensorNote 本身不需要 JupyterLab UI：

```bash
python -m pip install jupyterlab
```

以后每次启动 Jupyter 前都要先运行：

```bash
conda activate tensornote
```

退出环境使用：

```bash
conda deactivate
```

### 方案 B：Python 标准 `venv`

适合希望只使用 Python 官方内置工具、依赖最少的用户。

#### B.1 安装 Python

从 [Python 官方下载页](https://www.python.org/downloads/) 安装 Python 3.11。Windows 安装时建议启用将 Python 加入 PATH 的选项。

检查版本：

```bash
# macOS / Linux
python3.11 --version

# Windows
py -3.11 --version
```

#### B.2 创建环境

在 TensorNote 根目录运行：

```bash
# macOS / Linux
python3.11 -m venv .venv
source .venv/bin/activate
```

Windows PowerShell：

```powershell
py -3.11 -m venv .venv
.venv\Scripts\Activate.ps1
```

Windows `cmd.exe`：

```bat
py -3.11 -m venv .venv
.venv\Scripts\activate.bat
```

如果 PowerShell 阻止激活脚本，可为当前用户允许本地签名脚本，关闭并重新打开 PowerShell 后再激活：

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### B.3 安装依赖

确保提示符前有 `(.venv)`，然后运行：

```bash
python -m pip install --upgrade pip
python -m pip install -r requirements-jupyter.txt
```

以后每次启动 Jupyter 前先激活 `.venv`。退出环境使用：

```bash
deactivate
```

`.venv` 已加入 `.gitignore`，不会被提交到 Git。

### 方案 C：uv

适合希望快速安装 Python、创建环境和安装依赖的用户。即使电脑上还没有 Python，uv 也可以下载所需版本。

#### C.1 安装 uv

macOS 或 Linux：

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

macOS 使用 Homebrew：

```bash
brew install uv
```

Windows PowerShell：

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

重新打开终端后检查：

```bash
uv --version
```

#### C.2 创建环境并安装依赖

在 TensorNote 根目录运行：

```bash
uv python install 3.11
uv venv .venv --python 3.11
```

激活环境：

```bash
# macOS / Linux
source .venv/bin/activate
```

```powershell
# Windows PowerShell
.venv\Scripts\Activate.ps1
```

安装依赖：

```bash
uv pip install -r requirements-jupyter.txt
```

如果需要传统 JupyterLab 页面：

```bash
uv pip install jupyterlab
```

uv 在项目目录中会自动发现 `.venv`，但每日启动时仍建议显式激活，便于确认 `python` 和 `jupyter` 来自正确环境。退出环境使用 `deactivate`。

## 4. 注册 TensorNote Kernel

完成任意一种 Python 环境方案后，保持该环境激活，执行一次：

```bash
python -m ipykernel install --user --name tensornote --display-name "Python (TensorNote)"
```

这里有两个不同名字：

- `tensornote` 是 Jupyter 内部 Kernel Name，也是 TensorNote 设置中要填写的值。
- `Python (TensorNote)` 是在传统 Notebook/JupyterLab 菜单中显示的名称。

检查注册结果：

```bash
jupyter kernelspec list
```

应该能看到名为 `tensornote` 的条目。如果以后重建了同名环境，再运行一次注册命令即可覆盖旧 Kernel 入口。

## 5. 验证 Python 环境

保持环境激活，在项目根目录运行：

```bash
python -c "import torch, numpy, matplotlib, transformers, PIL; print('Python 环境正常'); print('PyTorch:', torch.__version__)"
jupyter server --version
jupyter kernelspec list
```

如果使用 NVIDIA GPU，PyTorch 安装命令会随操作系统、CUDA 版本变化。需要 GPU 加速时，请使用 [PyTorch 官方安装选择器](https://pytorch.org/get-started/locally/) 获取适合本机的命令，再重新运行上面的导入检查。TensorNote 的示例也可以在 CPU 上运行，只是大型模型会更慢。

## 6. 启动 Jupyter Server

### 6.1 macOS / Linux

打开终端 A，进入项目并激活刚才创建的环境，然后启动：

```bash
cd /path/to/tensornote

# 三选一：
conda activate tensornote
# 或 source .venv/bin/activate

jupyter server \
  --ip=127.0.0.1 \
  --port=8888 \
  --no-browser \
  --ServerApp.allow_origin=http://localhost:5173
```

### 6.2 Windows PowerShell

```powershell
cd C:\path\to\tensornote

# Conda：
conda activate tensornote

# 或 venv / uv：
.venv\Scripts\Activate.ps1

jupyter server `
  --ip=127.0.0.1 `
  --port=8888 `
  --no-browser `
  --ServerApp.allow_origin=http://localhost:5173
```

这些选项的作用：

- `--ip=127.0.0.1`：只监听本机，不向局域网公开执行代码的入口。
- `--port=8888`：使用固定端口，便于 TensorNote 保存连接信息。
- `--no-browser`：不额外打开 Jupyter 自带页面。
- `allow_origin`：允许运行在 `http://localhost:5173` 的 TensorNote 调用 Jupyter API 和 WebSocket。

保持这个终端运行。Jupyter 启动日志中会显示类似地址：

```text
http://127.0.0.1:8888/?token=一串随机字符
```

也可以随时在另一个已激活相同环境的终端查询：

```bash
jupyter server list
```

复制 `token=` 后面的内容。不要在聊天记录、截图、仓库或公开文档中提交真实 Token。

> [!WARNING]
> Jupyter Token 默认开启，因为持有访问权限的人可以在你的电脑上执行代码。不要把 Token 和密码都设置为空，也不要为了省事使用 `allow_origin=*`。

## 7. 启动 TensorNote 前端

打开另一个终端 B。前端终端不要求激活 Python 环境：

```bash
cd /path/to/tensornote
pnpm dev --host localhost --port 5173 --strictPort
```

看到 Vite 输出后，打开：

```text
http://localhost:5173
```

`--strictPort` 会在 5173 被占用时直接报错，而不是自动换端口。这样可以保证页面 Origin 与 Jupyter 的 `allow_origin` 始终一致。

### 7.1 本地文件编辑权限

TensorNote v0.2 的本地编辑功能依赖 File System Access API，建议使用最新版 Chrome 或 Edge：

1. 首页选择 `Open local workspace` 或 `New workspace`。
2. 在系统目录选择器中选择 Workspace 根目录。
3. 浏览器询问权限时允许查看并保存该目录中的文件。

如果浏览器没有提供目录选择 API，仍可读取内置或 GitHub Workspace，但首页会提示改用支持该能力的浏览器。TensorNote 不会自动访问未由你选择的目录。

## 8. 在 TensorNote 中配置 Compute Profile

1. 在首页打开本地 Workspace，或打开内置的 AI Learning Notes。
2. 打开任意带 Python Lab 的笔记，例如 Self-Attention。
3. 点击顶部 Kernel 状态，或展开 Python Lab 后点击齿轮。
4. 填写：
   - Profile name：`Local Python`
   - Server URL：`http://127.0.0.1:8888`
   - Token：Jupyter 输出中 `token=` 后的随机字符串
   - Kernel Name：`tensornote`
   - Session Scope：初次使用建议 `Per note`
5. 点击 `Run diagnostics`，确认 Browser、Server、Authentication、CORS、Kernel 与 WebSocket。
6. 关闭设置后运行一个 Cell。

Token 只保存在当前浏览器会话的 `sessionStorage` 中，关闭浏览器会话后即清除，也不会写入 Markdown 或 Git。Profile 的名称、Server URL、Kernel Name 和 Scope 会保存在浏览器本地，方便下次复用。第一次运行 Cell 时才创建 Kernel。

Session Scope 决定 Kernel 生命周期：

- `Per note`：同一篇笔记的 Lab 共享 Kernel，切换笔记时关闭。
- `Per workspace`：同一 Workspace 内切换笔记仍复用 Kernel。
- `Manual`：在 Workspace 内持续复用，直到点击 Disconnect；关闭 Workspace 时仍会关闭。

可以为本机 CPU、笔记本 GPU、实验室服务器、远程服务器和 Jetson 分别创建 Profile。完整说明见 [Compute Platform 使用说明](COMPUTE_PLATFORM.md)。

### 8.1 声明 Workspace 环境文件

可在 Workspace 根目录的 `tensornote.yaml` 中声明环境入口：

```yaml
environment:
  files:
    - requirements.txt
    - pyproject.toml
    - environment.yml
```

Compute 设置会显示这些文件是否存在，也会发现根目录中的常见环境文件。TensorNote 只检测和提示，绝不会静默运行 `pip install`、`conda env create` 或 `uv sync`。

### 8.2 使用 Scratch Lab

顶部 `Scratch` 打开临时计算区。代码只存在内存中，点击 `Insert into note` 后才会追加到当前本地可写笔记；刷新或关闭前请先插入或手动复制需要保留的代码。

如果已经在笔记编辑器中工作，也可以点击 Markdown 工具栏的烧瓶“实验”按钮：选中的 Python 代码会自动带入第一个 Cell；在弹窗中可继续添加多个 Cell、设置统一实验标识和运行级别。保存笔记后，阅读视图会把同一实验标识下的 Cell 合并为可打开、可运行的实验卡。

## 9. 可选：启动 Local Git Bridge

只有当前 Workspace 是本地 Git 仓库、并且你想使用 TensorNote 的 Git 工作台时才需要这一步。打开终端 C，在 TensorNote 软件目录运行：

```bash
cd /path/to/tensornote
pnpm git:bridge -- --workspace "/absolute/path/to/markdown-workspace"
```

`--workspace` 必须是浏览器中 `Open local workspace` 选择的同一个目录，并且必须是 Git 仓库根目录。默认监听 `http://127.0.0.1:4318`；保持终端 C 运行，然后在 TensorNote 左侧打开 `Git`。

Git Bridge 不需要激活 Conda、venv 或 uv 环境，也不依赖 Jupyter。完整的 Git 身份配置、端口/Origin、安全边界、暂存与提交说明见 [Local Git 使用说明](GIT_AND_SYNC.md)。

## 10. 以后每天启动什么

首次配置完成后，按使用场景启动：

- 只阅读或编辑 Markdown：只启动终端 B。
- 需要运行 Python Lab：启动终端 A + B。
- 需要 Git 工作台：启动终端 B + C。
- 同时需要 Python 与 Git：启动终端 A + B + C。

### 终端 A：Jupyter

```bash
cd /path/to/tensornote
conda activate tensornote     # Conda 用户
# source .venv/bin/activate   # venv 或 uv 用户

jupyter server --ip=127.0.0.1 --port=8888 --no-browser --ServerApp.allow_origin=http://localhost:5173
```

### 终端 B：TensorNote 前端

```bash
cd /path/to/tensornote
pnpm dev --host localhost --port 5173 --strictPort
```

### 终端 C：Git Bridge（可选）

```bash
cd /path/to/tensornote
pnpm git:bridge -- --workspace "/absolute/path/to/markdown-workspace"
```

### 浏览器

打开 `http://localhost:5173`。选择正确 Compute Profile；如果 Jupyter 每次生成的新 Token 不同，需要更新 Token。连接异常时先运行内置 diagnostics。Git 页面会自动连接默认 Bridge；端口不同则在页面中修改 Bridge URL。

## 11. 正确关闭

1. 先停止运行中的 Cell，在 Compute 设置中点击 Disconnect，或关闭当前 Workspace，让 TensorNote 请求关闭当前 Kernel。
2. 如果启动了 Git Bridge，在终端 C 按 `Ctrl+C` 停止；这不会删除或回滚 Git 数据。
3. 在终端 B 按 `Ctrl+C` 停止 Vite。
4. 在终端 A 按 `Ctrl+C` 停止 Jupyter；如果要求确认，输入 `y`。
5. 可选：运行 `conda deactivate` 或 `deactivate` 退出 Python 环境。

如果终端被异常关闭，可重新启动 Jupyter 后运行以下命令查看是否还有 Server：

```bash
jupyter server list
```

## 12. 常见问题

### 页面能打开，但连接 Jupyter 失败或出现 403/CORS

- 先打开 Compute 设置运行 `Connection diagnostics`，查看失败发生在 Browser、Server、Authentication、CORS、Kernel 还是 WebSocket。
- 确认前端地址严格为 `http://localhost:5173`。
- 确认 Jupyter 启动参数包含完全相同的 `--ServerApp.allow_origin=http://localhost:5173`。
- 如果你改用 `http://127.0.0.1:5173` 打开前端，Jupyter 的 `allow_origin` 也必须同步改为该地址。
- 停止旧 Jupyter 进程后，用本文命令重新启动。

### Token 无效或忘记 Token

```bash
jupyter server list
```

复制当前 8888 端口对应 URL 的 `token=` 内容，不要复制问号、参数名或末尾路径。

### `Kernel not found: tensornote`

激活正确环境后重新注册：

```bash
python -m ipykernel install --user --name tensornote --display-name "Python (TensorNote)"
jupyter kernelspec list
```

并确认 TensorNote 设置填写的是内部名称 `tensornote`，不是显示名称 `Python (TensorNote)`。

### Cell 报 `ModuleNotFoundError`

通常是包安装到了另一个 Python 环境。先在当前 Kernel 中运行：

```python
import sys
print(sys.executable)
```

然后在终端中激活该解释器所属环境，再安装缺失包。安装完成后关闭并重建 Kernel。

### 8888 端口被占用

先检查：

```bash
jupyter server list
```

可以停止旧 Server，或将 Jupyter 改到 8889：

```bash
jupyter server --ip=127.0.0.1 --port=8889 --no-browser --ServerApp.allow_origin=http://localhost:5173
```

随后把 TensorNote 的 Server URL 改为 `http://127.0.0.1:8889`。

### 5173 端口被占用

停止占用该端口的旧 Vite 进程。若必须换端口，需要同时修改前端启动端口和 Jupyter 的 `allow_origin`，两处必须完全匹配。

### Git 页面提示无法连接 Bridge

确认终端 C 正在运行，并检查：

```bash
curl http://127.0.0.1:4318/api/git/health
```

如果前端不在 `http://localhost:5173` 或 `http://127.0.0.1:5173`，还要通过 `TENSORNOTE_ORIGIN` 把实际 Origin 加入 Bridge 白名单。详细命令见 [Local Git 使用说明](GIT_AND_SYNC.md#8-端口与-origin-配置)。

### Git 页面没有出现在左侧

Git 工作台只对 `Open local workspace` 打开的本地目录显示。内置 Workspace 和 GitHub 阅读来源保持只读，不连接本地 Git Bridge。

### Git Commit 失败

先确认至少有一个文件位于 `Staged`，并检查 Git 身份：

```bash
git -C "/path/to/workspace" config user.name
git -C "/path/to/workspace" config user.email
```

编辑器中尚未保存的草稿不会进入 Git；先保存笔记，再刷新 Git 状态。

### PyTorch 或 Transformers 下载慢

首次安装和首次加载模型可能需要较长时间。不要把模型缓存提交到仓库。TensorNote 的大多数课程实验只依赖小型本地张量，不需要下载预训练模型；CLIP Zero-shot 示例才会下载模型权重。

## 12. 开发检查与 Git 工作流

修改代码后，在提交前运行：

```bash
pnpm test
pnpm lint
pnpm build
git status
```

常用提交步骤：

```bash
git add <本次修改的文件>
git commit -m "docs: update TensorNote setup guide"
```

不要提交以下内容：

- `.venv/`
- `node_modules/`
- `dist/`
- Jupyter Token、密码或带 Token 的完整 URL
- 本地模型缓存和大型临时数据

## 13. 官方参考

- [Conda 环境管理](https://docs.conda.io/projects/conda/en/stable/user-guide/tasks/manage-environments.html)
- [Python `venv`](https://docs.python.org/3/library/venv.html)
- [uv 安装](https://docs.astral.sh/uv/getting-started/installation/)
- [uv 环境管理](https://docs.astral.sh/uv/pip/environments/)
- [安装 IPython Kernel](https://ipython.readthedocs.io/en/stable/install/kernel_install.html)
- [Jupyter Server 安全与 Token](https://jupyter-server.readthedocs.io/en/latest/operators/security.html)
- [Jupyter Server 配置项](https://jupyter-server.readthedocs.io/en/stable/other/full-config.html)
- [pnpm 安装](https://pnpm.io/installation)
- [PyTorch 安装选择器](https://pytorch.org/get-started/locally/)
