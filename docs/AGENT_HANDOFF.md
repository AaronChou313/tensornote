# TensorNote v1 → v2 接管说明

> **2026-09-06 最新发行决定（优先于下方历史快照）：** 用户明确授权直接发布 GitHub 社区版，先保证在线/本地 Web 与 Desktop 可用，不以付费平台证书或应用商店发行作为前提。Tag 内 `release-policy.json` 固定 `github-community` 渠道：平台签名可选、Updater 签名必须。旧文中“缺 Apple/Windows 证书禁止所有 Tag”的门仅适用于未来 `trusted-desktop` 渠道，不阻止本次社区发行。发布执行、真实平台覆盖和回滚以 [RELEASE_MATRIX](RELEASE_MATRIX.md) 为准；公开状态须实时查询 GitHub。新版中英文用户手册见 [中文](zh-CN/USER_GUIDE.md) / [English](en/USER_GUIDE.md)。

状态快照：2026-09-06  
仓库：`AaronChou313/tensornote`  
默认分支：`main`  
功能基线提交：`10dd9d1372a85ff85065ec032db5adb39c88309d`  
源码版本：`1.6.0`  
最新公开稳定版本：`v1.0.0`

本文是新维护者或智能体接管 TensorNote 时的首要状态说明。它区分“规划”“源码阶段完成”“自动化验收通过”和“正式发布”，避免仅根据 `package.json` 版本或一篇 Release Note 误判交付状态。外部 GitHub、证书和 Runner 状态会变化，接管时必须重新查询。

2026-09-06 后续接管已核验 `31135e1` 与最新 CI，当前任务拆分、验证记录及白绿样式提案见[当前开发计划](ACTIVE_DEVELOPMENT_PLAN.md)。下文仍保留原交接快照，不替代实时状态。

2026-09-06 稳定性收尾：候选 `1293bb8` 已通过 [CI 34019694837](https://github.com/AaronChou313/tensornote/actions/runs/34019694837) 与 [Release 演练 34019696142](https://github.com/AaronChou313/tensornote/actions/runs/34019696142)。新增工作台交互修复、Web/Desktop 实际目录写入验收、Owned Jupyter 实测，以及独立分发的 Agent Skill 与版本化 JSON 校验接口。详见[候选验收](STABLE_CANDIDATE_VERIFICATION.md)、[宿主功能边界](HOST_FEATURE_MATRIX.md)和[智能体接口](AGENT_INTEGRATION.md)。同日再次检查 Secret 名称，仍只有两项 Updater 密钥配置；正式平台签名、干净机器安装矩阵及公开 Release 尚未完成。

## 1. 结论

**v1 到 v2 的所有工作尚未全部完成。** 当前真实状态是：

- `v1.0.0` 已完成稳定契约、正式 Tag 和公开 GitHub Release。
- `v1.1.0`～`v1.5.0` 已作为连续源码阶段合入 `main`，但没有各自创建 Tag 或 Release。
- `v1.6.0` 的源码、文档、模板、Updater 和跨平台发布流水线已经完成，并通过无 Tag 的完整矩阵演练；正式 Tag、公开 Release 和签名安装包仍被 Apple/Windows 外部签名资格阻塞。
- `v2.0.0` 没有已批准的产品范围、里程碑或实施计划，也没有开始实现。现有文档只规定：无法保持 v1 公共契约兼容的变化才有资格进入 v2。

因此，下一位接管者的第一目标不是直接开发 v2，而是完成 `v1.6.0` 的可信正式发行和发行后验证，再根据真实用户反馈判断是否需要 `v1.7+` 或 v2。

## 2. 状态词定义

| 状态 | 含义 |
| --- | --- |
| 规划 | 只有目标或设计说明，不能声称已经交付 |
| 源码阶段完成 | 功能、测试和文档已合入 `main`，但不等于用户可下载正式版本 |
| 候选验收通过 | CI 或手动 Workflow 已成功构建候选资产；无 Tag 产物会过期，也不是 Release |
| 正式发布 | 不可变 Tag、GitHub Release、所需签名和用户安装验证全部完成 |
| 已发布 | 本文只对满足上一行的版本使用该词 |

## 3. v1 版本状态矩阵

| 版本 | 主题 | 代码状态 | 发布状态 | 主要证据 | 尚需处理 |
| --- | --- | --- | --- | --- | --- |
| `v1.0.0` | Stable Platform | 完成 | **已正式发布** | Tag `v1.0.0`、GitHub Release、`91b43f0` | 只做兼容维护，不回写破坏性语义 |
| `v1.1.0` | Dual Host Foundation | 完成 | 未单独发布 | `048c9a9`、ADR 0001/0002、三平台 compile smoke | 能力已被后续阶段吸收，不补历史 Tag |
| `v1.2.0` | Native Local Workspace | 完成 | 未单独发布 | `16e2dbb`、ADR 0003、Native Workspace/Git 测试 | 正式安装包上的跨平台人工主流程仍随 v1.6 验收 |
| `v1.3.0` | Local Runtime Assistant | 完成 | 未单独发布 | `780de0c`、ADR 0004、Rust 状态机和桌面 UI 走查 | 需要在干净 Windows/Linux/macOS 用户环境继续积累实测 |
| `v1.4.0` | Publish & Read Anywhere | 完成 | 未单独发布 | `8778cb7`、ADR 0005、发布检查器和 Pages Workflow | 模板固定 `v1.6.0`，正式 Tag 存在后再做第三方仓库端到端验证 |
| `v1.5.0` | Remote Compute Connectors | 完成 | 未单独发布 | `c1060e0`、ADR 0006、JupyterHub 实测和 Binder 协议测试 | 公共 Binder 当次未到 ready；真实公共 Cell 执行不能标为已验证 |
| `v1.6.0` | Distribution & Ecosystem Hardening | 仓库内完成 | **尚未正式发布** | `9d20955`～`10dd9d1`、ADR 0007、Release run `34007677666` | Apple Developer ID、公证和 Windows 受信签名证书；Tag、Draft 验收、公开 Release |

不要为 `v1.1.0`～`v1.5.0` 补造历史 Tag。这些阶段是通向同一个 `v1.6.0` Desktop 首发候选的连续实现记录，补 Tag 会制造从未通过对应正式发行门的伪历史资产。

## 4. 已经落地的产品与架构边界

### 4.1 v1 公共契约

`src/platform/index.ts` 和 `docs/PLATFORM_CONTRACTS.md` 是 v1 公共边界，包含：

1. Workspace Repository Schema v1；
2. WorkspaceProvider API v1；
3. ComputeProvider / ComputeConnector API v1；
4. Extension API v1；
5. Executable Markdown Syntax v1；
6. Settings / Secret Model v1；
7. HostAdapter 的受限能力类型。

v1.x 可以增加可选字段、可选方法或新实现，但不能改变已有字段含义、放宽安全默认值或让用户内容依赖私有数据库。未来 Schema 必须继续只读降级并关闭写入、Git 与执行。

### 4.2 单仓库双宿主

- Web 与 Tauri Desktop 共用 `src/` 中的 React、Workspace、Knowledge、Workbench、Editor、Compute 与 Extension 核心。
- `src/host/` 只表达宿主能力；它不替代 WorkspaceProvider 或 ComputeProvider。
- `src-tauri/` 承载经过允许列表约束的原生目录、Native Git、环境发现、Owned Jupyter、Deep Link 和 Updater 能力。
- Static Web 通过构建期开关和 `scripts/verify-static-boundary.mjs` 拒绝 Tauri IPC、Native Workspace/Git、Local Runtime、Deep Link 和 Updater 实现泄漏。

### 4.3 双来源模型

Workspace 与 Compute 是两个独立维度：

- Workspace：本地可读写、Built-in 只读、GitHub 固定 Revision 只读；
- Compute：本地 Jupyter、Generic HTTPS Jupyter、当前用户 JupyterHub、固定 Revision BinderHub。

切换 Provider 或 Compute Profile 不修改 Markdown 语义。TensorNote 发现、配置、启动或连接 Jupyter，但不在应用内实现 Python Kernel。

### 4.4 Agent Interface

处理知识库时必须先完整阅读 `skills/tensornote-knowledge-workspace/SKILL.md`，使用它的模板和验证器。仓库根目录同时是应用源码与内置示例 Workspace；外部用户 Workspace 是浏览器或 Desktop 另行选择的目录，写入前必须确认目标。

## 5. 当前外部状态

本节是 2026-09-06 的快照，接管后重新执行命令确认。

- `main` 与 `origin/main` 在快照时一致，工作树干净。
- Git Tag 和公开 Release 只到 `v1.0.0`。
- GitHub 没有打开的 Issue 或 Pull Request。
- `package.json`、Cargo、Tauri 配置与 About 均为 `1.6.0`。
- GitHub Actions Secrets 已存在 `TAURI_SIGNING_PRIVATE_KEY` 和 `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`。
- Apple 和 Windows 正式签名 Secrets 尚未配置。
- 本机 Updater 私钥文件已验证存在于维护者工作区外的 `~/.config/tensornote/release/updater.key`；仓库文档记录密码存于 macOS Keychain。不得打印、提交或复制到 Workspace，正式发布前需要验证可恢复的离线备份。

最后一次有效验收：

- [CI `34007667046`](https://github.com/AaronChou313/tensornote/actions/runs/34007667046)：共享验证、容器、macOS/Windows/Linux Desktop 全部成功；
- [Release dry run `34007677666`](https://github.com/AaronChou313/tensornote/actions/runs/34007677666)：Web、容器、macOS arm64/x64、Windows x64、Linux x64 和 finalize 全部成功；
- 最终清单包含 17 个资产、17 条 SHA-256 和 7 个 Updater `.sig`；
- dry-run Artifacts 会按 GitHub 保留策略过期，不能当作长期发布凭证。

历史失败 run `34006746126` 暴露并验证修复了 AppImage 内部 `.DirIcon` 符号链接问题。最终修复策略是忽略 bundle 内部链接，只复制平台白名单中的普通发布文件。

## 6. 必须完成的工作

### P0：正式完成 v1.6.0 发行

这是当前唯一明确阻塞“v1 路线完成”的工作。

1. 获得 Apple Developer ID Application 证书和公证资格。
2. 获得可信 Windows 代码签名证书。
3. 以安全方式配置以下 GitHub Secrets，只检查名称和更新时间，不读取或输出值：
   - `APPLE_CERTIFICATE`
   - `APPLE_CERTIFICATE_PASSWORD`
   - `APPLE_ID`
   - `APPLE_PASSWORD`
   - `APPLE_TEAM_ID`
   - `WINDOWS_CERTIFICATE`
   - `WINDOWS_CERTIFICATE_PASSWORD`
   - 已有的两个 `TAURI_SIGNING_*` Secret
4. 确认 Updater 私钥和 Keychain 密码具有至少一份离线、加密、可恢复备份。丢失私钥将使已安装客户端无法信任后续更新。
5. 从准备发布的干净提交重新运行全部 Gate。若 `10dd9d1` 后又有任何修改，应以新 HEAD 为候选，不要移动旧 Tag。
6. 创建并推送 `v1.6.0` annotated Tag。Tag Workflow 缺少任一正式签名 Secret 时应失败关闭。
7. 检查 Workflow 创建的 Draft Release，逐平台验证签名、安装、启动、About 版本、Workspace/Jupyter 主流程和更新检查。
8. 验证 `SHA256SUMS`、`release-manifest.json`、Updater JSON/签名与同一个 Tag/commit 一致。
9. 只有全部通过后才把 Draft 公开；失败时保留证据，修复后发布递增 Patch，禁止移动已公开 Tag。
10. 发布后更新 README 的稳定版本 Badge/文字、`ROADMAP.md`、`NEXT_GENERATION_PLAN.md` 和 `docs/releases/v1.6.0.md` 状态。

平台人工检查以 `docs/RELEASE_MATRIX.md` 为准。macOS 必须检查 codesign、Gatekeeper 与 notarization/staple；Windows 必须检查 Authenticode 为 `Valid`；Linux 检查三种包至少在目标发行版上安装与启动。

### P1：首个 Desktop Release 后的验证债务

这些不是当前源码功能缺失，但不能在没有证据时宣称已经充分验证：

- 在干净的 Apple Silicon、Intel macOS、Windows x64 和至少一个受支持 Linux x64 环境执行真实安装/卸载/重装。
- 对 Native Workspace 执行打开、新建、编辑保存、外部修改冲突、拖放、文件关联、Reveal、Native Git Stage/Commit。
- 对 Runtime Assistant 执行“无现成环境 → 创建最小环境 → 启动 Owned Jupyter → 连续运行两个 Cell → 停止/退出清理”，并覆盖 uv、venv、Conda 中实际支持的路径。
- 用独立公开知识库仓库验证固定 `v1.6.0` 的 `publish-tensornote.yml`，确认 GitHub Pages、默认笔记、Badge、固定 Revision、Fork/下载和 Desktop 深链。
- 在可控 BinderHub 或公共容量允许时补一次 `ready → Kernel WebSocket → 多 Cell → Lease 清理` 实测。公共 mybinder.org 的容量失败不能归因于 TensorNote，也不能冒充成功。
- 自动更新的真正跨版本升级需要第二个 Desktop 版本。建议以 `v1.6.1` 做首个签名 Patch 演练，验证 `v1.6.0 → v1.6.1` 下载、签名校验、安装和重启，而不是仅验证“当前无更新”。

### P1：文档和项目管理收尾

- 当前 README 截图来自 v1.0.0 浏览器流程。正式 Desktop 发行后补充 v1.6 Desktop、Runtime Assistant、公开发布和 Remote Compute 的真实截图。
- `docs/DEVELOPMENT.md` 的早期手动 v1.0 发布示例只适合作为历史示例；后续正式 Desktop 发布必须以 `.github/workflows/release.yml` 与 Release Matrix 为准。
- Release 后建立 GitHub Milestone/Issue，把验证债务和后续功能变成可追踪工作。当前没有打开的 Issue/PR，不能把文档中的“未来”自动视为已排期。
- 如开始长期维护，增加面向用户的聚合 Changelog 或从 `docs/releases/` 自动生成版本索引；当前逐版本 Release Notes 是事实来源。

## 7. 可选的后续 v1.x 候选

下列事项来自已记录限制或生态愿景，但**尚未被批准为具体版本承诺**。只要能保持 v1 契约兼容，优先放在 `v1.7+`，不要为了营销版本号直接进入 v2：

| 候选 | 当前边界 | 进入实施前需要的决策 |
| --- | --- | --- |
| 原生文件事件监听 | v1.2 首版使用受限 `stat` 轮询 | 三平台 watcher 行为、事件合并、Symlink 和冲突测试 |
| Workspace 依赖向导/GPU 预设 | v1.3 只创建最小 CPU 环境，不自动安装 Workspace 依赖 | 供应链风险、计划审核、锁文件、CUDA 平台矩阵 |
| Git Remote Sync | 当前只有本地 Status/Diff/Stage/Commit | 凭据存储、Push/Pull、Branch、冲突和恢复 UX；不得开放任意 Shell |
| Server-mounted Workspace | Self-hosted 当前仍使用浏览器 Provider | 新 WorkspaceProvider/Host 或 Server Adapter、认证与多租户隔离 |
| Extension 分发 | 当前仅 Official/Local，且本地 JS 不是安全沙箱 | 签名、审核、隔离、更新、权限和撤回机制 |
| 持久化实验输出 | 当前输出、Binder 文件和 Kernel 状态不写回只读仓库 | 可移植格式、环境指纹、来源区分和冲突策略 |
| 公共知识目录 | v1.6 只冻结“元数据索引、不托管内容/Token”的边界 | 提交审核、垃圾内容、License、兼容性和撤回机制 |
| 更完整 Remote Connector | 当前为 Direct/JupyterHub/BinderHub | OAuth/CORS/WebSocket 兼容矩阵及 Lease 所有权 |

明确不在当前路线中的事项仍包括：TensorNote 自营公共 GPU、共享作者 Token、默认执行远程仓库、中心化托管 Markdown、复制一套 Desktop React UI，以及把完整 Python/ML 栈塞进所有安装包。

## 8. v2.0.0 的真实状态与启动条件

### 8.1 当前状态

没有 `V2_PLAN.md`，没有 v2 ADR，没有 v2 分支，没有迁移实现。`Search v2` 和依赖版本中的数字 `2` 也不代表 TensorNote 产品 v2。

### 8.2 什么时候才需要 v2

只有提案必须破坏以下至少一项兼容保证时，才开始 v2 RFC：

- 改变 `tensornote.yaml` 现有字段含义或取消未来 Schema 只读保护；
- 删除或破坏 WorkspaceProvider / ComputeProvider / ComputeConnector 的既有方法；
- 让现有 executable Markdown 不再可读或改变 Cell 语义；
- 破坏 Extension API v1 Manifest/贡献点兼容；
- 改变 Settings/Secret 的数据归属，或把 Secret 写入 Workspace；
- 让 Web 与 Desktop 形成两套不兼容核心；
- 需要不可自动迁移的持久状态或用户内容变化。

新增 Provider、可选 Manifest 字段、可选 Host capability、新 Connector 或 UI 改进通常都不需要 v2。

### 8.3 v2 启动 Gate

在编写 v2 代码前，至少完成：

1. 正式发布并稳定运行 v1.6，完成一个 Patch 更新闭环；
2. 汇总用户任务失败、兼容痛点和维护数据，而不是从功能清单倒推大版本；
3. 建立 `docs/V2_PLAN.md`，列出问题、非目标、替代方案和为何 v1 可选扩展无法解决；
4. 为每个破坏性契约创建 ADR，提供旧格式读取、备份、迁移、回滚和降级策略；
5. 设计 v1 Reader 对 v2 Workspace 的安全行为，以及 v2 Runtime 对 v1 Workspace/Extension 的兼容期；
6. 定义 Alpha/Beta/RC 和跨版本测试矩阵，再决定版本号与分支策略。

在这些证据形成前，新智能体不得把任意大型功能自行命名为 `v2.0.0`。

## 9. 新智能体接管顺序

### 9.1 首次读取顺序

1. `AGENTS.md`
2. 本文
3. `docs/PLATFORM_CONTRACTS.md`
4. `docs/ARCHITECTURE.md`
5. `docs/ROADMAP.md`
6. `docs/NEXT_GENERATION_PLAN.md`
7. 当前任务对应的 ADR、功能文档和 Release Note
8. 只有知识 Workspace 任务才完整读取 `skills/tensornote-knowledge-workspace/SKILL.md`

### 9.2 首次只读审计

```bash
git status -sb
git log -10 --oneline --decorate
git tag --sort=version:refname
gh release list --limit 30
gh issue list --state open
gh pr list --state open
gh run list --branch main --limit 10
node -p "require('./package.json').version"
gh secret list
```

`gh secret list` 只显示名称和更新时间。不要尝试读取、回显或写入任何 Secret；没有用户授权时也不要创建 Tag、Release、证书或外部服务资源。

### 9.3 代码导航

| 领域 | 入口 |
| --- | --- |
| 稳定公开契约 | `src/platform/index.ts`、`docs/PLATFORM_CONTRACTS.md` |
| Workspace | `src/workspace/`、`src/content/` |
| Compute/Connector | `src/compute/`、`src/jupyter/` |
| Host/Desktop bridge | `src/host/`、`src-tauri/src/`、`src-tauri/capabilities/` |
| Workbench/UI 状态 | `src/workbench/`、`src/store/` |
| 编辑器命令 | `src/commands/`、`src/components/NoteEditor.tsx` |
| Extension | `src/extensions/`、`src/components/extensions/` |
| 发布 | `.github/workflows/release.yml`、`scripts/*release*`、`docs/RELEASE_MATRIX.md` |
| Workspace 发布 | `.github/workflows/publish-workspace.yml`、`scripts/validate-publication.mjs` |
| Agent Skill | `skills/tensornote-knowledge-workspace/` |

## 10. 验证矩阵

### 10.1 所有应用源码变化

```bash
pnpm install --frozen-lockfile
pnpm check
git diff --check
```

涉及加载、索引、超大文件或目录时增加：

```bash
pnpm test:performance
```

### 10.2 Desktop 或 Host 变化

```bash
pnpm check:desktop
pnpm build:desktop:web
pnpm exec tauri build --no-bundle
pnpm build:web
```

必须同时检查 Tauri capability allowlist 和 Static boundary。禁止为了方便加入通用 Shell、前端可控绝对路径或任意 Git/Python 参数。

### 10.3 Knowledge Skill 或 Workspace 格式变化

```bash
node skills/tensornote-knowledge-workspace/scripts/validate-workspace.mjs .
node skills/tensornote-knowledge-workspace/scripts/validate-workspace.mjs \
  skills/tensornote-knowledge-workspace/assets/workspace-template --strict
node skills/tensornote-knowledge-workspace/scripts/validate-workspace.mjs \
  skills/tensornote-knowledge-workspace/assets/course-workspace-template --strict
```

如果新增了 `quick_validate.py` 或 Skill 自带脚本，也必须逐一执行；当前仓库没有该文件时不要伪造执行记录。

### 10.4 发布候选

```bash
pnpm check
pnpm test:performance
pnpm audit --prod --audit-level high
pnpm build:web
pnpm check:desktop
pnpm validate:release -- --tag v1.6.0
git diff --check
```

本地通过不替代 GitHub 的三平台 CI、容器构建和 Release dry run。界面变化必须真实走查 Home、Workspace、Note、Editor、Split、Settings、Lab、深浅主题和窄屏；Desktop 变化还要检查 Native Workspace、Runtime Assistant 与更新入口。

## 11. v1.6 正式发布运行手册

先阅读 `docs/RELEASE_MATRIX.md`，再执行。以下命令只应在用户明确批准正式发布、所有签名 Secret 已配置且工作区干净时使用：

```bash
git switch main
git pull --ff-only origin main
git status -sb
pnpm validate:release -- --tag v1.6.0
gh secret list
```

确认候选提交和全部 Gate 后：

```bash
git tag -a v1.6.0 -m "TensorNote v1.6.0"
git push origin v1.6.0
gh run list --workflow release.yml --limit 5
```

Tag Workflow 会构建 Pages、Web archive、macOS arm64/x64、Windows x64、Linux x64、Updater 资产、校验清单和 Draft Release。不要另行创建一个重复 Release，也不要在 Workflow 尚未完成时公开 Draft。

验收失败时不要移动或覆盖已经推送的 Tag。若 Tag 尚未公开但内容不正确，也应先评估删除未公开 Tag 的影响；公开后只能发布递增 Patch。

## 12. 接管者的禁止事项

- 不把“源码阶段完成”写成“已正式发布”。
- 不在缺少 Apple/Windows 可信签名时关闭 fail-closed Gate 或发布未签名正式资产。
- 不移动已公开 Tag，不用旧版本号覆盖新构建。
- 不把 Token、私钥、证书、Cookie、个人路径或 Compute Profile 写入 Markdown、Manifest、Fixture、日志或截图。
- 不让 UI 绕过 Provider capability、Workspace execution permission、GitHub Revision trust 或未来 Schema 只读保护。
- 不让共享 React 核心直接调用 Tauri IPC；通过 HostAdapter 和受审动态边界接入。
- 不用任意 Shell 代替类型化 Rust 命令，不扩大 Native Git/Runtime 的参数面。
- 不在不理解用户现有修改时清理工作树、重置或覆盖文件。
- 不把计划中的公共目录、Git Sync、Marketplace 或 v2 当作已获批准范围。

## 13. 建议的下一任务

如果外部证书尚未到位，下一位智能体应执行只读发行准备审计，整理证书申请和跨平台测试清单，不应创建 Tag。

如果证书已经到位，建议使用以下任务描述：

> 阅读 AGENTS.md、docs/AGENT_HANDOFF.md、docs/RELEASE_MATRIX.md 与 v1.6.0 Release Note。只读核对 main、版本、GitHub Secrets 名称和最近 CI；不要输出 Secret。运行完整 Release Gate。在我明确确认后创建 v1.6.0 Tag，等待 Tag Workflow，核验 Draft Release 的所有签名、校验清单和安装主流程。任一平台失败就停止公开发布并给出证据，不绕过 fail-closed Gate。

只有 v1.6 正式发行和 Patch 更新闭环完成后，才建议启动一次独立的 v2 产品发现任务。
