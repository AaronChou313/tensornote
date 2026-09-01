# Contributing to TensorNote

感谢你帮助改进 TensorNote。项目优先接受范围清晰、能从 Markdown 源文件重建、不会削弱本地优先与显式授权边界的改动。

## 开始之前

1. 搜索现有 [Issues](https://github.com/AaronChou313/tensornote/issues)，避免重复工作。
2. Bug、文档和小型体验修复可以直接提交 Pull Request。
3. 新 Provider、稳定契约变化、大型 UI 重构或破坏兼容的修改应先创建 Issue，说明用户场景、边界和迁移方案。
4. 不要在 Issue、日志、截图或提交中包含 Jupyter Token、扩展 Secret、私有仓库内容或个人 Workspace 数据。

## 本地开发

```bash
git clone git@github.com:AaronChou313/tensornote.git
cd tensornote
corepack enable
pnpm install --frozen-lockfile
pnpm dev --host localhost --port 5173 --strictPort
```

环境要求与 Jupyter 配置见 [`docs/ENVIRONMENT_SETUP.md`](docs/ENVIRONMENT_SETUP.md)。架构改动先阅读 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) 与 [`docs/PLATFORM_CONTRACTS.md`](docs/PLATFORM_CONTRACTS.md)。

## 分支与提交

- 从最新 `main` 创建短生命周期分支，例如 `feat/compute-profile`、`fix/pane-scroll` 或 `docs/jupyter-setup`。
- 一个提交只解决一个可描述的问题；不要混入无关格式化或用户本地文件。
- 建议使用 `feat:`、`fix:`、`docs:`、`test:`、`refactor:`、`chore:` 前缀。
- 不要重写其他贡献者的提交，也不要提交构建产物、Token 或本机绝对路径。

## 实现原则

- Markdown、Assets 与 `tensornote.yaml` 始终是可移植知识源。
- UI 依赖 Provider capability，不对 Local/Built-in/GitHub 实现写分叉业务逻辑。
- 新执行路径必须显式授权；普通代码块永远不能自动执行。
- 新设置要声明持久化位置、默认值、迁移与 Secret 分类。
- v1 公共接口从 `src/platform/index.ts` 导出；破坏兼容需要新的主版本计划。
- 修复应覆盖根因，并为关键状态转换补充回归测试。

## 验证

应用源码或配置变更至少运行：

```bash
pnpm check
git diff --check
```

性能、索引、Assets 或加载路径变更还要运行：

```bash
pnpm test:performance
```

Release、部署或平台候选还要运行：

```bash
pnpm audit --prod --audit-level high

VITE_TENSORNOTE_DEPLOYMENT=static \
VITE_BASE_PATH=/tensornote/ \
pnpm build
```

修改知识内容或 Agent Skill 时运行：

```bash
node skills/tensornote-knowledge-workspace/scripts/validate-workspace.mjs .
node skills/tensornote-knowledge-workspace/scripts/validate-workspace.mjs \
  skills/tensornote-knowledge-workspace/assets/workspace-template --strict
```

## Pull Request 清单

- 说明解决的问题、用户可见变化和未覆盖范围。
- 列出实际运行的验证命令与结果。
- UI 变化附前后截图；交互变化说明手工走过的路径。
- Schema/API/设置/Executable Markdown 变化同步代码、测试、平台文档与迁移说明。
- 不创建 Tag、GitHub Release 或自动部署，除非维护者明确安排发布任务。

维护者可能要求缩小范围、拆分提交或补充迁移与安全说明。合并并不保证立即发布。
