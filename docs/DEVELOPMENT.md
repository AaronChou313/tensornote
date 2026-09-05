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

更新完成后，按照[环境配置与使用手册](ENVIRONMENT_SETUP.md#10-以后每天启动什么)重新启动需要的 TensorNote、Jupyter 与可选 Git Bridge 进程。

### 1.3 更新到指定 Release

如果不想跟随 `main` 的最新开发状态，可以切换到指定版本：

```bash
git fetch origin --tags
git switch --detach v0.8.0
pnpm install --frozen-lockfile
```

回到持续更新的主分支：

```bash
git switch main
git pull --ff-only origin main
```

## 2. 开发新功能

开始开发前先核对[近期产品路线图](ROADMAP.md)。编辑器工具栏、快捷键和 Command Palette 必须复用统一的 Editor Command / `CommandRegistry`，不能在各 UI 入口重复实现 Markdown 变换逻辑。

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
- 修改 Frontmatter 属性索引或 Database 查询契约：编辑 `src/content/propertyIndex.ts`；Database 页面位于 `src/pages/StructuredKnowledgePage.tsx`，并同步更新 [Structured Knowledge 指南](STRUCTURED_KNOWLEDGE.md)。
- 修改 Local Git 协议：Bridge 位于 `scripts/git-bridge*.mjs`，浏览器客户端位于 `src/git/`，工作台状态和页面位于 `src/store/useGitStore.ts` 与 `src/pages/GitWorkspacePage.tsx`；同步更新 [Local Git 指南](GIT_AND_SYNC.md)。禁止把任意 Shell、任意仓库路径或远程凭据暴露给浏览器。
- 修改 Python Lab：编辑 `src/components/LabDrawer.tsx`、`CodeCell.tsx` 或 `src/content/labParser.ts`。
- 修改 Compute Profile、Scope、Session 生命周期或诊断：编辑 `src/compute/` 与 `src/store/useComputeStore.ts`；Jupyter 协议细节才进入 `src/jupyter/`。
- 修改主题与界面状态：编辑 `src/store/useAppStore.ts` 和相应组件。
- 修改工作台标签、Pane、历史或侧栏：编辑 `src/workbench/`；它们是用户 UI 状态，不能写入 Markdown 或 Provider。
- 新增可见操作：先注册到 `src/commands/CommandRegistry.ts`；Markdown 变换只进入 `src/commands/editor.ts`，不在工具栏或快捷键处理器复制字符串逻辑。
- 修改扩展平台：核心契约与生命周期位于 `src/extensions/`，管理界面位于 `src/components/extensions/`；本地插件格式与权限要求见 [Extension Platform 指南](EXTENSIONS.md)。
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

涉及 Workspace 索引、Markdown 解析、目录树或 Provider 加载策略时，还必须运行：

```bash
pnpm test:performance
```

涉及界面时，还应在浏览器中至少检查：

- 明亮和暗色主题
- 桌面和窄屏布局
- 普通 Markdown 代码块、Mermaid、公式和 Callout
- Python Lab 展开、编辑、运行与输出
- 页面切换时 Kernel 生命周期
- 标签/固定/拆分窗格、Command Palette、明暗主题和窄屏侧栏

### 2.4 Desktop 开发

v1.1.0 起，Desktop 使用 Tauri 2 并复用同一个 `src/`；v1.2.0 加入受限 Native Workspace 与 Native Git，v1.3.0 加入 Local Runtime Assistant，v1.4.0 加入受限 GitHub 深链与 Repository-owned Pages，v1.5.0 加入保持 ComputeProvider 独立的 Remote Compute Connectors。先安装 Rust stable；macOS Homebrew 用户可运行 `brew install rust`。确认：

```bash
rustc --version
cargo --version
rustfmt --version
cargo clippy --version
```

启动和验证：

```bash
pnpm dev:desktop
pnpm check:desktop
pnpm exec tauri build --no-bundle
```

构建当前平台 `.app`/安装资产使用 `pnpm build:desktop`。Host 能力必须进入 `src/host/`，Tauri IPC 必须在 `src-tauri/permissions/` 声明并更新安全 ADR。不得让共享 React、Workspace 或 Compute 核心直接依赖 Tauri，也不得为方便而加入任意 Shell 命令。

Native Workspace 改动还必须验证：路径穿越/符号链接拒绝、原子写与陈旧保存冲突、拖入 Markdown 的相对路径、真实临时 Git 仓库的 Status/Stage/Commit，以及 `pnpm build:web` 的 IPC 边界扫描。Local Runtime 改动必须覆盖 plan/apply 分离、失败清理、Secret/路径脱敏、Owned Process 和退出清理。Static 产物中出现 `__TAURI_INTERNALS__`、`native_workspace_`、`native_git_` 或 `local_runtime_` 会直接失败。

Publish 改动还必须运行 `pnpm validate:publication`，验证固定 revision、License、首页、环境文件和敏感文件门；Static 产物不得包含 Deep Link 插件标记。复制式 Workflow、`publishing` Schema 与 Agent Skill 模板必须在同一提交更新。

### 2.5 提交并合并

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

TensorNote 使用语义化版本：

- Patch：兼容的 Bug、样式或文档修复。
- Minor：向后兼容的功能、可选字段或新贡献点。
- Major：需要迁移的契约破坏。v1.x 必须保持 [Platform Contracts](PLATFORM_CONTRACTS.md) 中的 v1 基线向后兼容。

每次 Release 前应同步修改 `package.json` 中的 `version`，并保证 Git Tag 使用带 `v` 的相同版本，例如包版本 `0.0.2` 对应 Tag `v0.0.2`。

如果 Workspace Schema、Provider、Executable Markdown、Settings/Secret 或启动方式发生变化，还必须同步更新 `skills/tensornote-knowledge-workspace/` 的 reference、模板和校验器，并按[智能体接口说明](AGENT_INTEGRATION.md)运行 Skill 验证。

## 4. 发布下一版本

以下示例发布 `v1.0.0`。先完成源码候选并交付试用；只有最终验收确认后才执行 Tag 与 GitHub Release：

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
git tag -a v1.0.0 -m "TensorNote v1.0.0"
git push origin v1.0.0
gh release create v1.0.0 \
  --target main \
  --title "TensorNote v1.0.0" \
  --notes-file docs/releases/v1.0.0.md
```

验证：

```bash
git fetch origin --tags
git tag --points-at HEAD
gh release view v1.0.0
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
为 TensorNote 增加笔记收藏功能。入口放在笔记标题右侧，收藏状态保存在浏览器本地；主页增加“已收藏”筛选。要求支持明暗主题和移动端，完成测试后提交、推送并发布 v0.5.1。
```
