# TensorNote 2.0 使用说明

## 1. 选择版本

Web 适合试读、分享公开 GitHub 知识库和远程 Jupyter；Desktop 适合长期管理本地 Markdown、编辑和运行本机 Python。浏览器开发服务器不是独立发行版。

## 2. Web

打开在线站点后选择内置 Workspace，或在 GitHub 入口粘贴公开仓库 URL。分享时使用应用生成的链接；它会包含仓库和固定 revision，接收者可直接进入相同内容。

浏览器支持且你主动授权目录时，也可打开本地文件夹。权限由浏览器管理，刷新或重启后可能需要重新授权。在线站点不能启动你电脑上的 Python，也不能绕过 HTTPS Mixed Content。

运行 Jupyter Sidecar：设置 → 计算与 Jupyter → 远程运行 → 添加 Direct Jupyter、JupyterHub 或 BinderHub → 填写当前会话连接信息 → 运行诊断 → 对 GitHub 来源信任当前 revision。不要把 Token 写进 Markdown 或分享 URL。

## 3. Desktop

从 GitHub Release 下载对应系统和 CPU 的安装包，核对 `SHA256SUMS` 后安装。首次打开选择知识库根目录；Markdown、附件和 `tensornote.yaml` 留在原目录。应用无需 Vite 或额外 TensorNote 服务。

在 Files 中按真实目录/文件名浏览；使用搜索或标签切换笔记；TopBar 的 Outline 在当前笔记内定位。编辑时 Properties 按需展开，保存使用磁盘冲突检查，未保存草稿保存在设备恢复区。

运行 Jupyter Sidecar：设置 → 计算与 Jupyter → 本地运行。便捷连接可选择已有 Conda/uv/venv 环境或创建环境，确认完整落盘路径后启动 Jupyter；手动连接用于你自己启动的 Server。远程运行与 Web 相同。阅读与编辑不需要 Python。

## 4. Sidecar

正文卡片打开统一 SidePanel，同一时刻显示一个 Sidecar。Derivation 展示完整 Markdown 推导；Jupyter 提供共享 Kernel 的多 Cell 执行。拖动左边缘调整宽度，关闭后正文位置不变，切换笔记会自动关闭。

编辑器的“实验/Sidecar”按钮可插入两种类型。旧 `python exec` Lab 仍可打开；新内容使用 `:::tensornote{...}`。

## 5. Git 与同步

TensorNote 2.0 不提供 Git 工作台或 Git Bridge。Workspace 是普通文件夹，可用 Git CLI、GitHub Desktop、Fork、SourceTree 等工具提交和同步。先保存 TensorNote 中的编辑，再在 Git 客户端操作。

## 6. 智能体维护

从 Release 解压 Agent Skill，把完整目录和明确的 Workspace 根目录交给智能体。智能体可以维护 Markdown、资源、链接、Frontmatter 和 Sidecar，并运行：

```sh
npm ci --ignore-scripts
node scripts/validate-workspace.mjs "/path/to/workspace" --strict
```

Validator 和内容维护不要求启动 TensorNote 或 Jupyter。任何安装、执行、联网与 Git 写操作仍需单独授权。
