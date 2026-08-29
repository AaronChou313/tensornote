![TensorNote — Executable Notes for Learning AI](assets/images/TensorNote_logo_wide.png)

# TensorNote

TensorNote 是一个本地优先、Markdown 优先的可执行知识 Workspace。它不限定知识领域，也不把内容锁进数据库；普通文件夹、公开 GitHub Repository 和随应用提供的示例内容都通过同一套 Workspace 接口读取。

知识正文始终是普通 `.md` 文件。应用提供目录、路由、全文搜索、KaTeX、Mermaid、Callout、学习进度和可折叠的 Python Lab。Python 代码只会在 Workspace 声明可执行、远程 Revision 已受信任，并且用户主动连接自己的 Jupyter Server 后运行。

当前版本：`v0.2.0 — Authoring`。

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

生产检查：

```bash
pnpm test
pnpm lint
pnpm build
```

## 连接 Jupyter

先激活需要使用的 Conda 或 venv 环境，并确保该环境已安装 Jupyter Server：

```bash
conda activate your-env
jupyter server --ServerApp.allow_origin=http://localhost:5173
```

保留 Jupyter 的 Token 身份验证。运行后，从终端输出或下面的命令获取 Server URL 与 Token：

```bash
jupyter server list
```

在任意笔记中打开 Python Lab，点击右上角设置，填写：

- Server URL，默认 `http://127.0.0.1:8888`
- Token
- Kernel Name；按完整手册注册后填写 `tensornote`

第一次运行 Cell 时才会创建 Kernel。同一篇笔记内的所有 Lab 共享 Kernel。切换笔记会关闭当前 Kernel，防止变量污染。

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
│   ├── content/         Markdown 加载和 Lab Parser
│   ├── jupyter/         Jupyter 执行层
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

实现边界与后续演进见 [TensorNote 架构说明](docs/ARCHITECTURE.md)，环境配置见[完整环境配置与使用手册](docs/ENVIRONMENT_SETUP.md)。
