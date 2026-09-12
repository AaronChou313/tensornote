<p align="center"><img src="src/assets/TensorNote_logo_wide.png" alt="TensorNote" width="420"></p>

# TensorNote 2.1

**以 Markdown 为事实来源，用 Sidecar 承载完整推导与可执行 Python 的技术知识工作台。**

[在线使用](https://aaronchou313.github.io/tensornote/) · [下载桌面版](https://github.com/AaronChou313/tensornote/releases) · [English](README.en.md) · [使用说明](docs/zh-CN/USER_GUIDE.md)

[![CI](https://github.com/AaronChou313/tensornote/actions/workflows/ci.yml/badge.svg)](https://github.com/AaronChou313/tensornote/actions/workflows/ci.yml) [![License](https://img.shields.io/badge/license-Apache--2.0-5d7869)](LICENSE)

TensorNote 直接读取普通 Markdown、附件和 `tensornote.yaml`。笔记在任何编辑器中都可读；索引可以重建；凭证和运行状态不会写进知识库。

## 从知识库首页开始

首页集中提供“最近打开”和三个入口：打开本地知识库、新建本地知识库、打开在线知识库。顶部的 `Web版` / `桌面版` 标识说明当前 Host，“使用说明”可随时打开本指南。TensorNote 不再自动载入内置示例知识库。

“新建本地知识库”会让你输入名称并选择父目录，然后真实创建：

```text
知识库名称/
├── tensornote.yaml
├── notes/
└── assets/
```

创建完成后会自动打开并加入“最近打开”。

## 选择 Host

| | Web | Desktop |
| --- | --- | --- |
| 开始使用 | 打开在线站点；也可自行部署静态包/容器 | 从 Release 安装对应系统包 |
| 主要定位 | 阅读和分享公开在线知识库；浏览器允许时管理本地目录 | 长期管理、编辑和运行本地知识库 |
| 知识来源 | 公开 GitHub / GitLab / Gitee；Chrome/Edge 授权的本地目录 | 公开 GitHub / GitLab / Gitee；原生本地目录 |
| 编辑 | 仅浏览器授予写权限的本地目录 | 本地目录原生读写、草稿恢复、外部变更保护 |
| Jupyter | 连接兼容的 HTTPS Jupyter/JupyterHub/BinderHub | 便捷启动本机环境，或手动连接本地/远程 Jupyter |
| 离线 | 静态应用与本地目录可离线使用；在线仓库和远程计算需联网 | 本地笔记和已安装的 Python 环境可离线使用 |

三个在线 Provider 都只读取公开仓库，不需要账号或 Token，也不支持在线写回。TensorNote 2.1 不提供 Git 工作台；请用 Git CLI 或你熟悉的 Git 客户端同步本地知识库。

## 从下载到使用

### Web

1. 打开[在线版](https://aaronchou313.github.io/tensornote/)，选择“打开在线知识库”，粘贴 GitHub、GitLab 或 Gitee 的公开仓库首页 URL；也可以指定分支或 Ref。
2. 最新版 Chrome / Edge 还可打开或新建浏览器授权的本地目录。权限由浏览器管理，刷新后可能需要重新选择。
3. 分享窗口默认生成跟随当前分支的阅读链接；“更多选项”可以固定到当前 commit。旧版 GitHub 阅读链接继续兼容。
4. 运行 Jupyter Sidecar 时，在“设置 → 计算与 Jupyter → 远程运行”连接 HTTPS Jupyter、JupyterHub 或 BinderHub，并按提示信任当前远程 revision。

### Desktop

1. 从 [Releases](https://github.com/AaronChou313/tensornote/releases) 下载对应系统和 CPU 的安装包。
2. 在知识库首页打开已有目录，或选择父目录新建知识库；无需 Node.js、Vite 或额外 TensorNote 服务。
3. 阅读和编辑不需要 Jupyter。运行 Jupyter Sidecar 时，在“设置 → 计算与 Jupyter → 本地运行”选择或创建 Conda/uv/venv 环境并启动，也可手动连接服务器。
4. 未公证的社区 macOS 包、未签名的 Windows 包可能触发系统提示。请核对 Release 的 `SHA256SUMS` 并按[安装说明](docs/zh-CN/USER_GUIDE.md)打开。

## 核心能力

- 单笔记 Workbench：真实文件树、标签、历史、搜索、Outline、阅读与源码编辑。
- Markdown：Frontmatter Properties、WikiLinks、公式、Mermaid、附件、安全 HTML、草稿恢复。
- Contextual Sidecar：`derivation` 展开完整 Markdown 推导；`jupyter` 运行共享 Kernel 的 Python Cell。
- 本地与三种公开远程 Provider；远程元数据缓存减少 API 请求，GitHub 限额错误会显示预计恢复时间。
- Workspace Schema v1、远程 revision 信任、未来 Schema 只读降级、设备 Secret 分离。

旧的 `python exec` Lab 仍可读取，并适配为 Jupyter Sidecar；新内容使用 `:::tensornote{...}` 指令。详见[平台契约](docs/PLATFORM_CONTRACTS.md)。

## 让智能体维护知识库

Release 提供 `TensorNote-agent-skill-X.Y.Z.tar.gz`。把完整 Skill 目录和明确的知识库根目录交给支持 Skill 的智能体，它即可按统一格式创建、更新、整理和校验笔记、资源、链接与 Sidecar。

```sh
cd tensornote-knowledge-workspace
npm ci --ignore-scripts
node scripts/validate-workspace.mjs "/absolute/path/to/workspace" --strict
```

Skill 不需要运行 TensorNote 或 Jupyter，不会获得额外执行授权，也不得把 Token、密码或密钥写入知识库。说明见[智能体接口](docs/AGENT_INTEGRATION.md)。

## 开发

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm check
```

桌面开发另需 Rust 与平台构建工具，使用 `pnpm dev:desktop`。架构与贡献说明见[开发文档](docs/DEVELOPMENT.md)。Apache-2.0 licensed.
