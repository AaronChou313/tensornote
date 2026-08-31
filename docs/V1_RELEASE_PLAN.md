# TensorNote v1.0.0 发布计划

状态：源码候选已完成，等待最终试用确认

目标：首个稳定平台版本

范围依据：《TensorNote 长期架构与版本路线图》v1.0.0 Stable Platform

## 1. 完成定义

TensorNote v1.0.0 完成时，应当同时满足：

1. 六项核心契约具备明确版本、代码导出、兼容边界和文档。
2. 本地创作、Web 阅读、Web 可执行阅读和 Self-hosted 四条主流程都有实现与验证依据。
3. 用户内容仍只保存在 Markdown、Assets 与 Workspace 配置中；浏览器状态和 Secret 不混入知识库。
4. 版本号、About、PWA 缓存、Git Bridge、README、架构与 Release Notes 一致。
5. 完整 Release Gate 通过，工作树干净，候选提交已推送到 `origin/main`。
6. 智能体可以通过仓库内置 Skill 按同一 v1 契约撰写、配置、运行和校验 Workspace。

## 2. 核心契约清单

| 契约 | v1 保证 | 兼容策略 |
| --- | --- | --- |
| Workspace Schema | Schema v1 字段与安全默认值 | 旧配置内存迁移；未来配置保留阅读并关闭写入/执行 |
| WorkspaceProvider | 文件、目录、资产、能力和可选写入方法 | UI 只依赖接口与 capability，不识别具体 Provider 实现细节 |
| ComputeProvider | 连接、Kernel、Session、执行、诊断、控制 | Jupyter 是首个实现；UI 通过 Runtime 和接口调用 |
| Extension API | API v1 贡献点与权限 | 旧扩展默认 v1；未来主版本明确拒绝 |
| Executable Markdown | Python Fence 元数据 v1 | 普通 Renderer 仍显示 Python 源码；未知属性安全忽略 |
| Settings / Secret | 内容、偏好、恢复状态、Secret 分类 | 持久设置有迁移；Token/Secret 仅在会话存储 |

## 3. 实施阶段

### A. 契约与版本一致性

- 建立统一平台导出入口和契约版本常量。
- 从软件版本生成 About 与 Service Worker 缓存版本，消除手动漂移。
- 将 Git Bridge 健康信息与首发版本统一。

### B. 首发体验收尾

- 复核 Home → Workspace → Note → Edit/Lab/Settings 的无死路导航。
- 保证空状态、只读状态、权限提示、错误恢复和窄屏布局明确。
- 不对稳定 Workbench 进行结构重写，只处理首发阻塞和一致性问题。

### C. 文档与分发

- 发布 Platform Contracts、安装配置、架构、限制和升级承诺。
- 验证 Local、Static、Self-hosted 构建面和 PWA 更新策略。
- 准备 `docs/releases/v1.0.0.md`；在源码候选验收前不创建 Tag 或 Release。
- 提供 Agent Interface、可复制模板与无网络依赖的 Workspace 校验器。

## 4. 自动化 Release Gate

```bash
pnpm check
pnpm test:performance
pnpm audit --prod --audit-level high

VITE_TENSORNOTE_DEPLOYMENT=static \
VITE_BASE_PATH=/tensornote/ \
pnpm build

git diff --check
```

如果 Docker 可用，再执行：

```bash
docker compose config --quiet
docker build -t tensornote:v1.0.0 .
```

## 5. 人工浏览器矩阵

- Home：三个 Workspace 入口、Recent Workspace、GitHub 表单。
- Workbench：侧栏收起/恢复、搜索、命令、设置、Pane/Tab、空窗格。
- Authoring：正文/Properties、格式工具、实验插入、保存与 Dirty State。
- Compute：执行授权、Profile、诊断、Lab 打开、多个 Cell、运行控制。
- Views：Overview、Knowledge、Database、Git 可用/不可用状态。
- Theme/Viewport：浅色、深色、桌面、分栏、390px 窄屏。

## 6. 发布决策

- 本轮先提交并推送 v1.0.0 源码候选。
- 不自动创建 GitHub Release 或 Tag。
- 候选由用户完成最终试用确认后，再执行 `v1.0.0` Tag 与 GitHub Release。

## 7. 候选验收结果

- `pnpm check`：30 个测试文件、102 项测试，ESLint 与 Local 生产构建通过。
- `pnpm test:performance`：3 项性能预算通过。
- `pnpm audit --prod --audit-level high`：无已知漏洞。
- Static `/tensornote/` Base Path 生产构建与 `git diff --check` 通过。
- 当前机器未安装 Docker，未执行 Compose 与镜像构建；这不改变 Web 源码候选状态，正式容器发布环境仍应复核。
- 浏览器已确认 Home、Workspace、双 Pane、Lab、Command Palette、Settings About、浅色与深色主题；About 显示 v1.0.0 和六项稳定契约。
- `tensornote-knowledge-workspace` Skill 通过结构校验；新 Workspace 模板严格模式零错误零警告；当前内置知识库无阻塞错误。
