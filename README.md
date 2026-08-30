![TensorNote — Executable Notes for Learning AI](assets/images/TensorNote_logo_wide.png)

# TensorNote

TensorNote 是一个本地优先、Markdown 优先的可执行知识 Workspace。它不限定知识领域，也不把内容锁进数据库；普通文件夹、公开 GitHub Repository 和随应用提供的示例内容都通过同一套 Workspace 接口读取。

知识正文始终是普通 `.md` 文件。应用提供目录、路由、全文搜索、KaTeX、Mermaid、Callout、学习进度和可折叠的 Python Lab。Python 代码只会在 Workspace 声明可执行、远程 Revision 已受信任，并且用户主动连接自己的 Jupyter Server 后运行。

当前版本：`v0.4.0 — Compute Platform`。

## 快速开始

首次配置请先阅读[完整环境配置与使用手册](docs/ENVIRONMENT_SETUP.md)，其中包含 Conda、标准 `venv`、`uv`、Jupyter Kernel、Token/CORS 和每日启动顺序。

已有安装如何拉取更新、开发新功能和发布新版本，请阅读[开发与版本更新指南](docs/DEVELOPMENT.md)。

```bash
pnpm install
pnpm dev
```

打开 <http://localhost:5173>。

首页可以：

- 打开本地 Markdown 文件夹（Chrome / Edge 的 File System Access API）。
- 打开内置的 AI Learning Notes 示例 Workspace。
- 输入 `owner/repository`、完整 GitHub URL 和可选 Ref，读取公开仓库。
- 通过 `/open/github/{owner}/{repo}?ref={branch}` 直接打开公开仓库。

## 本地创作

本地 Workspace 在支持 File System Access API 的浏览器中提供：

- Reading、Editing 和 Split 三种模式。
- CodeMirror 6 Markdown 编辑器、Undo / Redo 与 `Ctrl/Cmd + S`。
- Dirty State、离开保护、外部文件变化检测和保存冲突保护。
- 新建笔记/文件夹、重命名、移动、删除和复制。
- 粘贴图片、拖放文件或通过 Asset 按钮上传到 `assets/`。
- 可视化 Frontmatter 属性编辑；属性仍保存在 Markdown 中。
- Python Lab 修改后使用 `Save to note` 写回原始 executable Fence。

内置和 GitHub Workspace 仍保持只读，不显示写入入口。

## 知识系统

TensorNote 会在打开或保存 Workspace 时，从 Markdown 重建统一 `KnowledgeIndex`：

- `[[WikiLink]]`、`[[Note#Heading|显示文字]]` 与标准 Markdown 链接。
- `![[Embedded Note]]` 和 `![[Note#Heading]]` 笔记嵌入。
- Frontmatter `aliases`、`tags`、任意 Properties 与正文 `#inline-tag`。
- 当前笔记的 Backlinks、Outgoing Links、Outline 与一跳 Local Graph。
- Search v2 按 Title、Alias、Tag、Heading、Path、Property 和 Body 加权检索。
- Knowledge 页面集中浏览 Tag Atlas、Properties、关联笔记和未解析链接。

示例：

```markdown
---
title: Self-Attention
aliases: [Scaled Dot-Product Attention]
tags: [transformer, attention]
status: growing
---

继续阅读 [[Multi-Head Attention#核心结构|多头注意力]]。

![[Transformer 学习地图#学习路径]]
```

索引只存在于运行时，可以随时从 Markdown 重新生成，不会创建专有知识数据库。

完整语法、链接解析规则和重命名注意事项见[知识系统使用说明](docs/KNOWLEDGE_SYSTEM.md)。

## Compute Platform

原有单一 Jupyter 连接已升级为通用 Compute Layer：

- 保存多个 Compute Profile，例如 Local Python、Laptop GPU、Lab RTX4090、Remote Server 和 Jetson。
- 每个 Profile 可选择 Per note、Per workspace 或 Manual Session Scope。
- Lab 支持 Run、Run All、Run Above、Run Below、Interrupt、Restart、Restart & Run All 和 Clear Outputs。
- Scratch Lab 中的临时代码不会自动写入 Markdown；确认后才使用 `Insert into note` 生成可移植的 executable Fence。
- 自动检测 Workspace 声明或根目录中的 `requirements.txt`、`pyproject.toml` 与 `environment.yml`，只提示、不静默安装。
- 内置连接诊断依次检查 Browser、Server、Authentication、CORS、Kernel 与 WebSocket。

完整配置、生命周期与故障排查见 [Compute Platform 使用说明](docs/COMPUTE_PLATFORM.md)。

生产检查：

```bash
pnpm test
pnpm lint
pnpm build
```

## 配置 Compute Profile

先激活需要使用的 Conda 或 venv 环境，并确保该环境已安装 Jupyter Server：

```bash
conda activate your-env
jupyter server --ServerApp.allow_origin=http://localhost:5173
```

保留 Jupyter 的 Token 身份验证。运行后，从终端输出或下面的命令获取 Server URL 与 Token：

```bash
jupyter server list
```

点击顶部 Kernel 状态，或在任意 Lab 中点击齿轮，打开 Compute 设置。默认 `Local Python` Profile 填写：

- Server URL，默认 `http://127.0.0.1:8888`
- Token
- Kernel Name；按完整手册注册后填写 `tensornote`

先运行 `Connection diagnostics`，全部关键检查通过后再执行 Cell。第一次运行时才会创建 Kernel；何时关闭由 Profile 的 Session Scope 决定。

## 可执行 Markdown 语法

Workspace 根目录可选放置 `tensornote.yaml`：

```yaml
schemaVersion: 1
workspace:
  name: My Knowledge Base
  description: Portable Markdown notes
content:
  root: notes
assets:
  root: assets
navigation:
  mode: filesystem
features:
  executable: true
environment:
  files:
    - requirements.txt
```

没有配置文件时，TensorNote 仍会尝试把目录作为普通 Markdown Workspace 打开，但默认不授予可执行能力。

普通 Python Fence 只用于展示：

````markdown
```python
x = 1
```
````

带 `exec` 的 Fence 会被解析成 Python Lab：

````markdown
```python exec lab="self-attention" cell="1" title="构造输入"
import torch
X = torch.randn(4, 8)
```
````

同一 `lab` 的 Cell 会按 `cell` 排序并折叠成一张 Lab Card。

## Callout

```markdown
> [!intuition]
> 这里写直觉理解。
```

支持 `intuition`、`important`、`pitfall`、`bridge`、`question`、`remember`。

## 目录结构

```text
tensornote/
├── src/                 React 应用
│   ├── components/      阅读与 Lab UI
│   ├── content/         Markdown、Lab Parser 与 KnowledgeIndex
│   ├── compute/         ComputeProvider、Profile、Scope 与诊断
│   ├── jupyter/         Jupyter Provider 的底层 Client
│   ├── workspace/       Schema、统一加载器与 Providers
│   └── store/           Workspace、界面、进度与连接配置
├── notes/               唯一知识源，共 35 篇 V1 笔记
├── assets/
│   ├── images/
│   ├── diagrams/
│   └── sketches/
├── docs/                安装、配置与使用文档
└── public/
```

即使 Web App 停止维护，`notes/` 仍可由 VS Code、Obsidian、GitHub 或普通 Markdown 阅读器直接使用。

实现边界见 [TensorNote 架构说明](docs/ARCHITECTURE.md)，近期开发范围见[产品路线图](docs/ROADMAP.md)，环境配置见[完整环境配置与使用手册](docs/ENVIRONMENT_SETUP.md)。
