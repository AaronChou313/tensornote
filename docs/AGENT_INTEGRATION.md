# TensorNote 智能体接口与 Skill 使用说明

TensorNote 提供一套可版本管理、可复制安装、可由不同智能体读取的知识库操作接口。它同时服务两类场景：让智能体按统一规格撰写知识库，以及让智能体正确安装、配置、启动、校验和维护 TensorNote。

## 1. 接口组成

| 层 | 文件 | 作用 |
| --- | --- | --- |
| 仓库级指令 | `AGENTS.md` | 智能体进入 TensorNote 仓库时自动获得的硬约束和验证入口 |
| 可安装 Skill | `skills/tensornote-knowledge-workspace/SKILL.md` | 任务识别、标准工作流、参考资料路由和完成条件 |
| 知识规格 | `references/knowledge-authoring.md` | Frontmatter、目录、章节、链接、Assets、公式、Mermaid、Callout 与质量门 |
| Workspace 规格 | `references/workspace-configuration.md` | `tensornote.yaml` v1、目录、能力、环境文件、信任和 Secret 边界 |
| Lab 规格 | `references/executable-labs.md` | Executable Markdown v1、多 Cell 设计、难度、运行条件和安全规则 |
| 运行手册 | `references/runtime-operations.md` | pnpm、Conda/venv/uv、Jupyter、Kernel、Git Bridge、部署和排障 |
| 确定性工具 | `scripts/validate-workspace.mjs` | 检查 Schema、路径、Frontmatter、ID、WikiLink、Assets 与 Lab 元数据 |
| 输出模板 | `assets/` | 通用 Workspace、课程 Workspace、概念笔记、多 Cell 实验笔记和固定版本的 GitHub Pages Workflow 模板 |

TypeScript 集成仍通过 [`src/platform/index.ts`](../src/platform/index.ts) 使用六项稳定 v1 契约；Skill 是面向智能体的操作协议，不替代运行时 API。

## 2. 安装到 Codex

仓库内调用时可以直接要求智能体读取该 Skill。若希望它出现在个人 Skill 列表中，可复制到 Codex Skill 目录：

```bash
mkdir -p ~/.codex/skills
cp -R skills/tensornote-knowledge-workspace ~/.codex/skills/
```

在开发期间希望仓库更新立即生效，也可以使用符号链接：

```bash
ln -s "$(pwd)/skills/tensornote-knowledge-workspace" ~/.codex/skills/tensornote-knowledge-workspace
```

如果目标已经存在，先检查它是普通目录还是符号链接，不要直接覆盖个人修改。安装或更新后开启一个新任务，让 Codex 重新发现 Skill。

其他支持 Markdown Skill 的智能体可以加载整个 `skills/tensornote-knowledge-workspace/` 目录；不支持 Skill 发现时，按 `SKILL.md → 与任务相关的 references → validator` 的顺序提供上下文。

## 3. 调用方式

显式调用：

```text
使用 $tensornote-knowledge-workspace，在 /path/to/workspace 中创建一个机器学习知识库，包含学习地图、三篇概念笔记和一个两 Cell 的可执行实验。先给出结构，再创建文件并严格校验。
```

维护已有知识库：

```text
使用 $tensornote-knowledge-workspace，检查当前知识库的 Frontmatter、内部链接、Assets 和可执行 Lab。保留未知属性，只修复可证明的问题。
```

安装与运行：

```text
使用 $tensornote-knowledge-workspace，根据我的 macOS 环境选择 uv，完成 TensorNote、Jupyter Kernel 和每日启动配置。不要关闭 Token，也不要使用 allow_origin=*。
```

新增实验：

```text
使用 $tensornote-knowledge-workspace，把选中的概念改成可重复运行的三 Cell Python Lab，声明依赖，限制 CPU/内存，并验证 Restart & Run All 的状态依赖。
```

## 4. 智能体应遵循的交付流程

1. 确认 Workspace 根目录，不把 TensorNote 软件仓库和用户知识库混为一谈。
2. 读取 Manifest 和代表性笔记，复用现有命名、目录与属性约定。
3. 只加载当前任务需要的参考文件，避免将完整手册反复塞入上下文。
4. 使用模板创建新内容，替换全部占位符并保持 ID 唯一。
5. 运行普通校验；全新 Workspace 或发布候选使用 `--strict`。
6. 人工复核渲染、链接和 Lab，再检查 Git Diff。
7. 清楚报告需要启动的终端、执行授权、GitHub Revision 信任及尚未完成的环境动作。

## 5. 校验命令

从 TensorNote 软件仓库运行：

```bash
node skills/tensornote-knowledge-workspace/scripts/validate-workspace.mjs /path/to/workspace
```

严格模式：

```bash
node skills/tensornote-knowledge-workspace/scripts/validate-workspace.mjs /path/to/workspace --strict
```

CI 或智能体解析：

```bash
node skills/tensornote-knowledge-workspace/scripts/validate-workspace.mjs /path/to/workspace --json
```

退出码 `0` 表示无阻塞错误；严格模式下 Warning 也会返回非零。旧笔记缺少显式 `difficulty` 时只产生兼容性 Info，因为 TensorNote v1 会安全回退为 `basic`；智能体新建的 Lab 仍必须写完整元数据。

公开发布候选还必须运行：

```bash
pnpm validate:publication -- --workspace /path/to/workspace --owner owner --repo repository --revision <full-commit-sha>
```

它在严格 Workspace 规则之外检查 `publishing` 展示配置、首页 ID、License、声明的环境文件和明显凭据文件。复制 `assets/publish-tensornote.yml` 后，知识库仍需由人确认公开内容和许可证。

课程型知识库优先从 `assets/course-workspace-template` 开始；它展示学习首页、模块前置关系、复习问题与共享状态的多 Cell Lab，但不会替作者选择内容 License。

## 6. 安全边界

- 知识内容只进入 Markdown、Assets 和 Workspace 配置，不建立智能体私有数据库。
- Jupyter Token 和扩展 Secret 不进入 Workspace、Prompt 模板、日志或 Git。
- `features.executable: true` 不是自动执行授权；运行仍需要用户连接 Compute Profile，GitHub 来源还需信任当前 Revision。
- 智能体不得静默安装依赖、启动公网 Jupyter、运行大训练、修改 Git 历史或推送远端。
- 未来 Workspace Schema 必须保持只读和禁用执行，不能用本机偏好绕过。

## 7. 更新 Skill

TensorNote 平台契约、Executable Markdown 或环境启动方式发生变化时，应在同一个提交中同步：

1. Skill 主流程和对应 reference。
2. 模板与校验脚本。
3. `docs/PLATFORM_CONTRACTS.md` 和用户文档。
4. Skill 验证、模板严格验证及项目 Release Gate。

这样智能体接口与应用真实能力保持同版本，不会形成另一套过期规范。
