# TensorNote 2.1 使用说明

## 1. 从首页进入知识库

顶部 `Web版` 或 `桌面版` 标识说明当前 Host。“最近打开”最多保留 8 个知识库，可重新打开、逐项移除或清空记录。旧版内置示例记录会在升级后自动清理。

首页有三个入口：

- **打开本地知识库**：选择一个已有的 Markdown 知识库根目录。
- **新建本地知识库**：输入名称、选择父目录并确认完整路径。TensorNote 会创建 `tensornote.yaml`、`notes/` 和 `assets/`，随后自动打开。
- **打开在线知识库**：选择 GitHub、GitLab 或 Gitee，粘贴公开仓库首页 URL，可选填分支或 Ref。

知识库名称不能使用 `/ \\ : * ? " < > |`、`.`、`..` 或 Windows 保留名称。若父目录中已有同名目录，TensorNote 会停止创建且不会覆盖内容。

## 2. Web

在线版适合阅读和分享公开知识库，以及连接远程 Jupyter。GitHub、GitLab、Gitee 来源均为公开只读，无需账号或 Token；仓库 URL 必须是 `https://` 首页地址。远程目录和 revision 元数据会短时缓存，减少匿名 API 请求；固定 commit 的缓存时间更长。

最新版 Chrome / Edge 支持打开或新建浏览器授权的本地目录。目录权限由浏览器管理，刷新或重启后可能需要重新选择。其他浏览器仍可使用在线知识库入口。

运行 Jupyter Sidecar：设置 → 计算与 Jupyter → 远程运行 → 添加 Direct Jupyter、JupyterHub 或 BinderHub → 填写当前会话连接信息 → 运行诊断 → 按提示信任当前远程 revision。在线页面不能启动你电脑上的 Python，也不能绕过 HTTPS Mixed Content。不要把 Token 写进 Markdown 或分享 URL。

## 3. Desktop

从 GitHub Release 下载对应系统和 CPU 的安装包，核对 `SHA256SUMS` 后安装。首页可直接打开已有知识库，也可选择父目录创建新知识库。桌面端只保存用户授权目录的内部标识，创建和文件操作始终限制在该授权范围内。Markdown、附件和 `tensornote.yaml` 留在原目录，无需 Vite 或额外 TensorNote 服务。

顶部“使用说明”通过受限的系统外链能力打开浏览器。在 Files 中按真实目录/文件名浏览；使用搜索或标签切换笔记；Outline 在当前笔记内定位。保存使用磁盘冲突检查，未保存草稿保存在设备恢复区。 不同目录可以包含同名 Markdown；路径区分文件，显式 Frontmatter `id` 用作知识引用身份。Overview 只读取根目录 `OVERVIEW.md`，不存在时读取根 `README.md`。

运行 Jupyter Sidecar：设置 → 计算与 Jupyter → 本地运行。便捷连接可选择已有 Conda/uv/venv 环境或创建环境，确认完整落盘路径后启动 Jupyter；手动连接用于你自己启动的 Server。远程运行与 Web 相同。阅读与编辑不需要 Python。

## 4. 分享

在线知识库的分享窗口只保留一个主操作：“复制链接”。

- 默认链接跟随当前 Ref，适合持续更新的知识库。
- 在笔记页分享时，链接会直接打开当前笔记；在概览页分享时打开知识库概览。
- 展开“更多选项”并勾选“固定到当前版本”，可生成固定 commit 的可复现链接。
- 旧的 `/open/github/:owner/:repo` 链接继续可用；新链接统一使用 `/open/remote`，覆盖 GitHub、GitLab 和 Gitee。

本地知识库不会被 TensorNote 自动上传。若要分享，请先用 Git 工具将它托管为公开仓库，再从“打开在线知识库”进入并复制链接。

## 5. Sidecar 与 Git

正文卡片打开统一 SidePanel，同一时刻显示一个 Sidecar。Derivation 是不执行代码的“推导 / 补充内容”，支持 Markdown、公式、表格、图片、Mermaid 与 Callout；Jupyter 只执行明确标记为 `python` 的多个 Cell，并共享同一 Kernel。

编辑笔记时点击“侧栏内容”，可以新建或选择当前笔记中的 Sidecar。Derivation 提供编辑/预览；Jupyter Cell 可以添加、删除和排序；修改与删除只作用于对应的 Markdown 指令范围。ID 会从标题自动生成，高级用户可在“高级设置”修改。旧 `python exec` Lab 仍可读取。

TensorNote 不提供 Git 工作台。知识库是普通文件夹：先保存编辑，再使用 Git CLI、GitHub Desktop、Fork、SourceTree 等工具提交和同步。

## 6. 智能体维护

从 Release 解压 Agent Skill，把完整目录和明确的知识库根目录交给智能体。智能体可以维护 Markdown、资源、链接、Frontmatter 和 Sidecar，并运行：

```sh
npm ci --ignore-scripts
node scripts/validate-workspace.mjs "/path/to/workspace" --strict
```

Validator 和内容维护不要求启动 TensorNote 或 Jupyter。任何安装、执行、联网与 Git 写操作仍需单独授权。
