# TensorNote 开发与版本更新指南

本文说明两类更新：使用者如何把已有安装更新到最新版，以及开发者如何实现、验证并发布后续功能。

## 1. 使用者更新现有安装

### 1.1 查看当前版本和改动

在 TensorNote 根目录运行：

```bash
git status
git log -1 --oneline
git tag --points-at HEAD
```

如果 `git status` 显示本地修改，先提交到自己的分支，或确认这些文件可以保留。不要用 `git reset --hard` 清除不确定的修改。

### 1.2 拉取主分支

建议先停止 Vite；如果本次更新包含 Python/Jupyter 依赖变更，也停止 Jupyter。然后运行：

```bash
git switch main
git pull --ff-only origin main
pnpm install --frozen-lockfile
```

如果 `requirements-jupyter.txt` 有变化，激活 TensorNote 的 Python 环境后更新依赖：

```bash
# Conda 用户
conda activate tensornote

# venv / uv 用户
# source .venv/bin/activate

python -m pip install -r requirements-jupyter.txt
```

uv 环境也可以运行：

```bash
uv pip install -r requirements-jupyter.txt
```

更新完成后，按照[环境配置与使用手册](ENVIRONMENT_SETUP.md#9-以后每天启动什么)重新启动 Jupyter 和前端。

### 1.3 更新到指定 Release

如果不想跟随 `main` 的最新开发状态，可以切换到指定版本：

```bash
git fetch origin --tags
git switch --detach v0.3.0
pnpm install --frozen-lockfile
```

回到持续更新的主分支：

```bash
git switch main
git pull --ff-only origin main
```

## 2. 开发新功能

### 2.1 从最新主分支创建功能分支

```bash
git switch main
git pull --ff-only origin main
git switch -c feat/功能短名称
```

建议的分支前缀：

- `feat/`：新功能
- `fix/`：Bug 修复
- `docs/`：文档修改
- `refactor/`：不改变外部行为的重构
- `content/`：课程和笔记内容

### 2.2 修改位置

- 新增或修改课程：编辑 `notes/**/*.md`。
- 修改 Workspace Schema：编辑 `src/workspace/schema.ts` 与 `src/workspace/types.ts`。
- 新增内容来源：实现 `src/workspace/types.ts` 中的 `WorkspaceProvider`；写入来源还要实现相应 mutation 方法。UI 必须读取 capability，不直接根据 Provider 类型假定读写能力。
- 修改目录和路由：编辑 `src/content/noteTree.ts`、`src/workspace/loadWorkspace.ts` 与相关页面。
- 修改 Markdown 渲染：编辑 `src/components/MarkdownRenderer.tsx` 和 `src/styles.css`。
- 修改 WikiLink、Tag、Backlink、Search v2 或图谱索引：编辑 `src/content/knowledgeIndex.ts`，并同步更新 `KnowledgePanel` / `KnowledgePage`。
- 修改 Python Lab：编辑 `src/components/LabDrawer.tsx`、`CodeCell.tsx` 或 `src/jupyter/`。
- 修改主题与界面状态：编辑 `src/store/useAppStore.ts` 和相应组件。
- 新增 Python 课程依赖：修改 `requirements-jupyter.txt`，并同步更新环境手册。
- 新增前端依赖：使用 `pnpm add <包名>` 或 `pnpm add -D <包名>`，同时提交 `package.json` 与 `pnpm-lock.yaml`。

### 2.3 开发中验证

Vite 正在运行时，大多数前端代码和 Markdown 修改会自动热更新。涉及依赖、Vite 配置或 Python 环境的变化时，应重新启动相应进程。

提交前必须运行：

```bash
pnpm test
pnpm lint
pnpm build
```

涉及界面时，还应在浏览器中至少检查：

- 明亮和暗色主题
- 桌面和窄屏布局
- 普通 Markdown 代码块、Mermaid、公式和 Callout
- Python Lab 展开、编辑、运行与输出
- 页面切换时 Kernel 生命周期

### 2.4 提交并合并

```bash
git status
git diff --check
git add <本次修改的文件>
git commit -m "feat: describe the feature"
git push -u origin feat/功能短名称
```

审查通过后通过 Pull Request 合并；个人维护时也可以在本地把功能分支快进或合并到 `main`，再次运行完整检查后推送。

提交消息建议使用：

- `feat:` 新功能
- `fix:` 修复
- `docs:` 文档
- `test:` 测试
- `refactor:` 重构
- `perf:` 性能优化
- `chore:` 工程维护

## 3. 版本号策略

TensorNote 在 `1.0.0` 前使用以下约定：

- `0.0.x`：Bug 修复、样式修复、小范围文档更新。
- `0.x.0`：新增一组可用功能或课程模块。
- `1.0.0`：功能、配置格式和升级路径达到稳定状态。

每次 Release 前应同步修改 `package.json` 中的 `version`，并保证 Git Tag 使用带 `v` 的相同版本，例如包版本 `0.0.2` 对应 Tag `v0.0.2`。

## 4. 发布下一版本

以下示例发布 `v0.3.1`：

```bash
git switch main
git pull --ff-only origin main
pnpm test
pnpm lint
pnpm build
git status
```

确认工作区干净、版本号和发布说明已更新后：

```bash
git push origin main
gh release create v0.3.1 \
  --target main \
  --title "TensorNote v0.3.1" \
  --notes-file docs/releases/v0.3.1.md
```

验证：

```bash
git fetch origin --tags
git tag --points-at HEAD
gh release view v0.3.1
```

Release 创建后，GitHub 会提供该 Tag 对应的源码压缩包。当前 TensorNote 是本地开发型 Web App，因此 Release 暂不附带独立安装程序。

## 5. 请求后续功能时提供什么

提出新功能时，说明以下内容会更容易一次完成：

1. 使用场景：想解决什么问题。
2. 入口位置：主页、笔记页、Python Lab、设置或其他位置。
3. 预期行为：操作前后发生什么。
4. 数据是否需要持久化，以及存放在 Markdown、浏览器还是本地文件。
5. 验收方式：什么结果算完成。
6. 希望发布的版本号；未指定时可按上述策略选择。

一个可直接使用的示例：

```text
为 TensorNote 增加笔记收藏功能。入口放在笔记标题右侧，收藏状态保存在浏览器本地；主页增加“已收藏”筛选。要求支持明暗主题和移动端，完成测试后提交、推送并发布 v0.3.1。
```
