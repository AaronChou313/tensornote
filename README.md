![TensorNote — Executable Notes for Learning AI](assets/images/TensorNote_logo_wide.png)

# TensorNote

TensorNote 是一个本地优先、Markdown 优先的可执行 AI 学习笔记 Web App。

知识正文始终保存在 `notes/**/*.md`。应用提供目录、路由、全文搜索、KaTeX、Mermaid、Callout、学习进度和可折叠的 Python Lab。Python 代码在用户自己的 Jupyter Server 与 Python 环境中运行。

## 快速开始

首次配置请先阅读[完整环境配置与使用手册](docs/ENVIRONMENT_SETUP.md)，其中包含 Conda、标准 `venv`、`uv`、Jupyter Kernel、Token/CORS 和每日启动顺序。

```bash
pnpm install
pnpm dev
```

打开 <http://localhost:5173>。

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
│   └── store/           界面、进度与连接配置
├── notes/               唯一知识源，共 35 篇 V1 笔记
├── assets/
│   ├── images/
│   ├── diagrams/
│   └── sketches/
├── docs/                安装、配置与使用文档
└── public/
```

即使 Web App 停止维护，`notes/` 仍可由 VS Code、Obsidian、GitHub 或普通 Markdown 阅读器直接使用。
