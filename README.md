<p align="center"><img src="src/assets/TensorNote_logo_wide.png" alt="TensorNote" width="420"></p>

# TensorNote 2.0

**以 Markdown 为事实来源，用 Sidecar 承载完整推导与可执行 Python 的技术知识工作台。**

[在线使用](https://aaronchou313.github.io/tensornote/) · [下载桌面版](https://github.com/AaronChou313/tensornote/releases) · [English](README.en.md) · [使用说明](docs/zh-CN/USER_GUIDE.md)

[![CI](https://github.com/AaronChou313/tensornote/actions/workflows/ci.yml/badge.svg)](https://github.com/AaronChou313/tensornote/actions/workflows/ci.yml) [![License](https://img.shields.io/badge/license-Apache--2.0-5d7869)](LICENSE)

TensorNote 直接读取普通 Markdown、附件和 `tensornote.yaml`。笔记在任何编辑器中都可读；索引可以重建；凭证和运行状态不会写进知识库。

## 选择 Host

| | Web | Desktop |
| --- | --- | --- |
| 开始使用 | 打开在线站点；也可自行部署静态包/容器 | 从 Release 安装对应系统包 |
| 主要定位 | 阅读、分享公开 GitHub 知识库 | 本地创作、管理、运行 |
| 知识来源 | 内置示例、公开 GitHub；浏览器授权时可打开本地目录 | 内置示例、公开 GitHub、原生本地目录 |
| 编辑 | 仅浏览器授予写权限的本地目录 | 本地目录原生读写、草稿恢复、外部变更保护 |
| Jupyter | 连接兼容的 HTTPS Jupyter/JupyterHub/BinderHub | 便捷启动本机环境，或手动连接本地/远程 Jupyter |
| 更新 | 部署方更新 | 应用内检查签名 Release；也可手动安装 |
| 离线 | 自部署静态资源和本地目录可阅读；远程来源/计算需联网 | 本地笔记和已安装的 Python 环境可离线使用 |

浏览器开发服务器只是开发工具，不构成第三种正式产品。TensorNote 2.0 不提供 Git 工作台；请用 Git CLI 或你熟悉的 Git 客户端同步 Workspace。

## 从下载到使用

### Web

1. 打开[在线版](https://aaronchou313.github.io/tensornote/)，直接试读内置 Workspace。
2. 选择 GitHub，粘贴公开仓库 URL；分享时使用应用生成的固定 revision 链接。
3. 需要运行 Jupyter Sidecar 时，进入设置的“远程运行”，连接自己的 HTTPS Jupyter、JupyterHub 或 BinderHub，并完成诊断与 Workspace 信任。

自行部署可从 Release 下载 `TensorNote-web-X.Y.Z.tar.gz`，也可使用仓库中的容器配置。GitHub 自动生成的 Source code 压缩包是开发源码。

### Desktop

1. 从 [Releases](https://github.com/AaronChou313/tensornote/releases) 下载对应系统和 CPU 的安装包。
2. 安装并选择本地知识库目录；无需 Node.js、Vite 或额外 TensorNote 服务。
3. 阅读和编辑不需要 Jupyter。运行 Jupyter Sidecar 时，在“设置 → 计算与 Jupyter → 本地运行”选择或创建 Conda/uv/venv 环境并启动，或切换为手动连接。
4. 未公证的社区 macOS 包、未签名的 Windows 包可能触发系统提示。可核对 Release 的 `SHA256SUMS` 后按[安装说明](docs/zh-CN/USER_GUIDE.md)打开。

## 核心能力

- 单笔记 Workbench：文件树、标签、历史、搜索、顶部 Outline、阅读与源码编辑。
- Markdown：Frontmatter Properties、WikiLinks、公式、Mermaid、附件、安全 HTML、草稿恢复。
- Contextual Sidecar：`derivation` 展开完整 Markdown 推导；`jupyter` 运行一个或多个共享 Kernel 的 Python Cell。
- 统一 SidePanel：同一时刻只显示一个 Sidecar，可调宽度，切换笔记自动关闭且保留正文位置。
- Workspace Provider 与 Compute Provider：本地、GitHub、Jupyter/JupyterHub/BinderHub 能力按 Host 和 Provider 明确降级。
- Workspace Schema v1、固定 GitHub revision 信任、未来 Schema 只读降级、设备 Secret 分离。

旧的 `python exec` Lab 在 2.0 中仍可读取，并适配为 Jupyter Sidecar；新内容使用 `:::tensornote{...}` 指令。详见[平台契约](docs/PLATFORM_CONTRACTS.md)。

## 让智能体维护知识库

Release 提供 `TensorNote-agent-skill-X.Y.Z.tar.gz`。把完整 Skill 目录交给支持 Skill 的智能体，并明确 Workspace 根目录；智能体即可按统一格式创建、更新、整理、校验笔记、资源、链接与 Sidecar。

```sh
cd tensornote-knowledge-workspace
npm ci --ignore-scripts
node scripts/validate-workspace.mjs "/absolute/path/to/workspace" --strict
```

Skill 不需要运行 TensorNote 或 Jupyter。它不会获得额外执行授权，也不得把 Token、密码或密钥写入 Workspace。说明见[智能体接口](docs/AGENT_INTEGRATION.md)。

## 开发

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm check
```

桌面开发另需 Rust 与平台构建工具，使用 `pnpm dev:desktop`。架构与贡献说明见[开发文档](docs/DEVELOPMENT.md)。Apache-2.0 licensed.
