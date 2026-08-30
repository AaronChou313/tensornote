# TensorNote Local Git 使用说明

TensorNote v0.8.0 为本地 Workspace 提供可选的 Git 工作台：查看 Branch Info、Status、逐文件 Diff、History，暂存或取消暂存文件，并创建本地 Commit。Markdown 与资源文件仍是唯一数据源，Git 只负责版本记录。

本版不包含 Clone、Push、Pull、Fetch、Branch 创建/切换、GitHub OAuth、私有仓库认证或冲突解决器。

## 1. 为什么需要 Git Bridge

TensorNote 的本地目录由浏览器 File System Access API 打开。浏览器不会暴露目录绝对路径，也不能直接执行系统 `git`。因此 Git 功能由一个显式启动的本地 companion 提供：

```text
TensorNote /git
      │ HTTP，仅 localhost
      ▼
Git Bridge（固定一个仓库根目录）
      │ execFile，无 Shell
      ▼
系统 Git
```

Bridge 只监听 `127.0.0.1`，启动时固定一个 Git 仓库根目录；API 不接受任意工作目录、任意 Git 参数或 Shell 命令。

## 2. 前置条件

检查 Git 与 Node.js：

```bash
git --version
node --version
pnpm --version
```

目标 Workspace 必须已经是 Git 仓库，且 `--workspace` 必须指向仓库根目录：

```bash
cd /absolute/path/to/workspace
git rev-parse --show-toplevel
git status
```

首次在这台电脑提交前配置 Git 身份。全局配置：

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

只为当前 Workspace 配置：

```bash
cd /absolute/path/to/workspace
git config user.name "Your Name"
git config user.email "you@example.com"
```

## 3. 启动 Git Bridge

在 TensorNote 软件仓库中打开第三个终端；`--workspace` 指向你在浏览器中打开的本地知识库，而不一定是 TensorNote 软件目录。

macOS / Linux：

```bash
cd /path/to/tensornote
pnpm git:bridge -- --workspace "/absolute/path/to/markdown-workspace"
```

Windows PowerShell：

```powershell
cd C:\path\to\tensornote
pnpm git:bridge -- --workspace "C:\absolute\path\to\markdown-workspace"
```

成功后应看到：

```text
TensorNote Git Bridge v0.8.0
Repository: /absolute/path/to/markdown-workspace
Listening:  http://127.0.0.1:4318
```

保持这个终端运行。Git Bridge 不依赖 Conda、venv、uv 或 Jupyter。

## 4. 在 TensorNote 中连接

1. 首页选择 `Open local workspace`，选择与 Bridge 相同的仓库根目录。
2. 左侧选择 `Git`，或在 Command Palette 执行 `Open Git workspace`。
3. 默认 Bridge URL 为 `http://127.0.0.1:4318`，页面会自动尝试连接。
4. 页面会验证 Bridge 的仓库文件夹名与当前 Local Workspace 文件夹名一致；不一致时拒绝显示或修改仓库。
5. 连接成功后检查仓库路径、Branch、Upstream 与改动数量。

Bundled 和 GitHub 阅读来源不会显示 Git 入口。GitHub Workspace 的 `capabilities.git` 只描述远程来源元数据，不表示它可以调用本地 Git 工作台。

## 5. Status 与 Diff

Changes 分成两组：

- `Working tree`：尚未暂存的修改、删除和未跟踪文件。
- `Staged`：已经进入 Git Index、会被下一次 Commit 包含的文件。

选择文件后右侧显示对应的 Worktree 或 Index Diff。绿色表示新增，红色表示删除。重命名、冲突与未跟踪文件会显示独立状态。

当前 Diff 是文本预览：

- 二进制文件不显示文本补丁。
- 未跟踪文件在暂存前可能没有补丁；点击 `Stage` 后可查看 Staged Diff。
- 为保持浏览器流畅，单次最多显示前 2,000 行；Bridge 输出本身限制为 2 MiB。

页面的 `Refresh` 会重新读取 Git，不会刷新 Markdown Workspace。外部修改了笔记内容时，仍应使用 Workspace 自身的刷新/重新打开流程。

## 6. 暂存、取消暂存与提交

每个 Working tree 文件右侧的 `+` 会执行安全的路径限定暂存；每个 Staged 文件右侧的 `−` 会取消暂存。

创建本地提交：

1. 先保存 TensorNote 编辑器里的草稿。页面会提示尚未保存的编辑器数量；未保存内容不在文件系统中，也不会进入 Git。
2. 检查 Staged 列表与 Staged Diff。
3. 输入 1–200 个字符的单行提交说明。
4. 点击 `Commit`。

Commit 只包含 Git Index 中已经暂存的改动。TensorNote 不会自动暂存整个仓库，也不会自动 Push。

如果 Git 身份未配置、存在未解决冲突、Commit Hook 失败或没有已暂存内容，页面会显示系统 Git 返回的错误；修复后点击 `Refresh` 再试。

## 7. History 与 Branch Info

History 最多显示最近 40 条本地提交，包含 Subject、Author、时间与短 Hash。页面顶部显示：

- 当前 Branch；Detached HEAD 时显示当前提交短 Hash。
- Upstream 名称。
- 相对 Upstream 的 Ahead / Behind 数量；这些数字来自本地已有引用，本版不会自动 Fetch。

v0.8.0 不提供 Branch 创建、切换、合并、Rebase、Reset 或恢复文件。需要这些操作时继续使用系统 Git、IDE 或专用 Git 客户端，然后回到 TensorNote 点击 `Refresh`。

## 8. 端口与 Origin 配置

更换 Bridge 端口：

```bash
pnpm git:bridge -- --workspace "/path/to/workspace" --port 4320
```

然后把 Git 页面中的 Bridge URL 改为 `http://127.0.0.1:4320`。

Bridge 默认只允许：

```text
http://localhost:5173
http://127.0.0.1:5173
```

如果 TensorNote 使用其他 Origin，启动时显式声明，多个值用逗号分隔：

```bash
TENSORNOTE_ORIGIN=http://localhost:4173 \
pnpm git:bridge -- --workspace "/path/to/workspace"
```

也可以使用环境变量：

```bash
TENSORNOTE_GIT_ROOT="/path/to/workspace" TENSORNOTE_GIT_PORT=4318 pnpm git:bridge
```

不要把 Bridge 反向代理到公网，也不要把允许 Origin 设置为任意来源。

## 9. 安全边界

- Bridge 固定绑定 `127.0.0.1`，不监听局域网地址。
- 浏览器客户端只接受 `localhost`、`127.0.0.1` 或 `::1`。
- 服务启动时确认配置目录就是 Git 仓库根目录，不接受仓库内任意子目录。
- Git 子进程通过 `execFile` 参数数组运行，不经过 Shell。
- Bridge 创建 Commit 时禁用 Repository Hook 与自动 GPG 签名，避免网页操作触发仓库脚本或交互式签名；需要这些流程时请在终端提交。
- Stage 与 Diff 路径必须是仓库内相对路径；绝对路径、空路径、NUL 与 `..` 越界会被拒绝。
- POST 请求必须使用允许的 TensorNote Origin 与 JSON Content-Type。
- Bridge 不提供凭据、Push、Pull、Fetch、远程配置或任意命令入口。

Commit 是会改变本地仓库历史的明确用户操作。Git 提交通常可以恢复，但仍应先核对 Staged Diff。

## 10. 常见问题

### `无法连接 Git Bridge`

确认第三个终端仍在运行，页面 URL 和终端端口一致：

```bash
curl http://127.0.0.1:4318/api/git/health
```

### Bridge 指向的 Workspace 名称不一致

停止旧 Bridge，在 TensorNote 软件目录重新运行，并把 `--workspace` 指向当前浏览器打开的本地 Workspace 根目录。

### `配置目录不是仓库根目录`

运行：

```bash
git -C "/path/to/workspace" rev-parse --show-toplevel
```

把输出的完整路径用于 `--workspace`。如果目录尚未初始化，并且你确定要让它成为新仓库：

```bash
git -C "/path/to/workspace" init
```

### Commit 提示身份未知

按照本文第 2 节设置 `user.name` 与 `user.email`，然后回到页面重试。

### Ahead / Behind 没有更新

v0.8.0 不执行 Fetch。先在终端或 Git 客户端更新远程引用，再点击 TensorNote 的 `Refresh`。
