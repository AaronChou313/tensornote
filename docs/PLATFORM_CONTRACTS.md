# TensorNote Platform Contracts v1

TensorNote v1.0.0 冻结首个可长期兼容的平台基线。应用内实现仍可演进，但 1.x 不改变这里已经公开的字段含义、安全默认值和数据归属。TypeScript 集成应从 `src/platform/index.ts` 导入稳定 API，避免依赖内部目录。

## 1. 版本与兼容规则

| 契约 | 当前版本 | 稳定保证 |
| --- | --- | --- |
| Workspace Repository Schema | v1 | 已知字段、安全默认值与兼容降级 |
| WorkspaceProvider API | v1 | 文件、资产、能力与冲突边界 |
| ComputeProvider API | v1 | 连接、Session、执行、控制与诊断 |
| ComputeConnector API | v1 | 获取标准 Compute Endpoint、生命周期、进度与清理 |
| Extension API | v1 | Manifest、权限、生命周期与贡献点 |
| Executable Markdown Syntax | v1 | 可移植 Python Fence 元数据 |
| Settings / Secret Model | v1 | 内容、偏好、恢复状态与 Secret 分类 |

1.x 可以增加可选字段、可选方法、新 Provider 或新贡献点。既有调用者无法安全忽略的字段删除、重命名、类型变化或行为变化属于破坏性变更，必须进入新的主版本并提供迁移说明。

## 2. Workspace Repository Schema v1

Workspace 根目录可选包含 `tensornote.yaml`：

```yaml
schemaVersion: 1
workspace:
  name: My Workspace
  description: Portable Markdown notes
content:
  root: notes
assets:
  root: assets
navigation:
  mode: filesystem
features:
  executable: false
environment:
  files:
    - requirements.txt
extensions: {}
```

- 没有配置文件时仍可作为普通 Markdown Workspace 打开，默认禁止执行。
- 未声明版本的旧配置只在内存中迁移，不自动改写用户文件。
- 高于当前版本的配置只读取已知字段，并强制关闭写入、Git 与执行。
- 未知字段安全忽略；扩展数据放在 `extensions`。Token、密码和云端密钥不得写入配置。

## 3. WorkspaceProvider API v1

Provider 负责列目录、读取文本和二进制、报告文件状态与来源能力；可写 Provider 还可以实现写入、创建目录、移动、复制、删除与监听。UI 只能根据 `WorkspaceCapabilities` 决定入口，不通过来源类型绕过 Provider。

写入必须支持预期文件状态；基线不匹配时抛出 `WorkspaceConflictError`，由用户选择重新载入或明确覆盖。新增 Provider 可以只实现读取能力，但不得伪造写入、Git 或执行能力。

## 4. ComputeProvider API v1

ComputeProvider 接受不含知识内容的连接配置与执行上下文，建立可关闭的 Session，并提供 Kernel 查询、代码执行、Interrupt、Restart 和连接诊断。`ComputeRuntime` 根据 per-note、per-workspace 或 manual scope 管理 Session 生命周期。

Jupyter 是首个 Provider，但不是 UI 的固定依赖。新增 Provider 必须保持输出事件、错误、取消和关闭语义，不得静默安装环境或绕过 Workspace 执行授权。

### 4.1 ComputeConnector API v1（v1.5.0）

ComputeConnector 位于 Profile 与 ComputeProvider 之间，只负责把 Generic Jupyter、JupyterHub 或 BinderHub 解析为临时的标准 `ComputeConnectionConfig`。它不读取 Markdown，不直接执行代码，也不改变 ComputeProvider v1。

- `direct` 校验现有 Jupyter URL；TensorNote 只关闭自己创建的 Kernel，不停止外部 Server。
- `jupyterhub` 用当前用户的有限权限 Token 读取身份和 Server 状态；可连接已有 Server，或启动并只清理本次由 TensorNote 创建的 Server。
- `binderhub` 只接受公开 GitHub `owner/repository` 与完整 40 位 commit SHA；build/launch 返回的 Token 只存在运行时 Lease，断开后请求释放临时 Server。
- Connector 必须报告 checking、spawning/building、ready、stopping 或 error 等进度，并声明外部/TensorNote 所有权与 persistent/provider-managed/temporary 持久性。
- Connector Profile 可以作为浏览器偏好保存，但 Hub API Token、Binder 临时 Token、已解析 Server URL 与 Lease 不得持久化或写入 Workspace。

远程 URL 在非 Loopback 场景必须使用 HTTPS。公开 Workspace 的执行仍需同时通过 Workspace execution permission 与固定 GitHub Revision trust；连接成功不能隐式授予执行权。

## 5. Extension API v1

Extension API v1 包含 Command、View、Sidebar、Markdown Processor、CodeMirror Extension、Settings、Status Bar Item、Workspace Provider 与 Compute Provider 贡献。Manifest 声明 `apiVersion`、最低 TensorNote 版本和所需权限。

省略 `apiVersion` 的旧扩展按 v1 兼容；声明未来主版本时 Runtime 明确拒绝。扩展停用必须清理所有贡献。高风险能力继续受 `workspace:write`、`network`、`compute` 与 `secret` 等权限约束。

## 6. Executable Markdown Syntax v1

普通 Python Fence 只展示源码。只有带 `exec` 的 Fence 才进入 Lab：

````markdown
```python exec lab="linear-regression" cell="1" title="Create data" difficulty="basic"
import numpy as np
x = np.arange(8)
```

```python exec lab="linear-regression" cell="2" title="Fit" difficulty="basic"
print(x.mean())
```
````

- `lab` 标识同一实验；`cell` 是从 1 开始的排序号。
- `title` 是 Cell 标题；`difficulty` 支持 `basic`、`medium`、`heavy`。
- 同一 `lab` 的多个 Fence 合并成一张 Lab Card。未知属性安全忽略。
- 不支持在 Cell 内嵌套 Markdown Fence。脱离 TensorNote 时内容仍是普通可读 Python 代码块。

## 7. Settings / Secret Model v1

| 数据 | 位置 | 生命周期 |
| --- | --- | --- |
| Markdown、Assets、`tensornote.yaml` | Workspace 文件 | 可移植、可 Git 管理 |
| 主题、编辑器、Compute Profile、Workspace 执行授权 | 浏览器持久存储 | 当前浏览器，具备版本迁移 |
| Dirty 草稿恢复 | IndexedDB，失败时 localStorage | Workspace/路径隔离，默认 30 天过期 |
| Jupyter / JupyterHub Token 与扩展 Secret | `sessionStorage` 或运行时内存 | 当前浏览器会话，关闭后清除 |
| BinderHub 临时 Token 与 Connector Lease | 运行时内存 | 断开或关闭应用时清除 |
| Pane、Dialog、活动 Lab 等短期 UI | 运行时状态 | 刷新或切换 Workspace 时清理 |

本机执行授权不会改写 `tensornote.yaml`，也不会替代 GitHub 固定 Revision 的信任检查。诊断信息不得包含 Markdown 正文或未脱敏 Secret。

## 公开发布投影（v1.4.0）

Workspace Schema v1 允许新增可选 `publishing` 块，其中只有 `title`、`description`、Workspace 相对 `logo`、六位十六进制 `accent` 与稳定 `defaultNote` ID。该块是向后兼容的展示元数据，不改变 WorkspaceProvider API v1、执行权限、GitHub Revision trust 或 Settings/Secret 分类。

公开分享 URL 必须绑定 GitHub Provider 实际解析的完整 commit SHA；分支名只能用于首次发现。Repository-owned Pages 仍实例化既有 GitHubWorkspaceProvider，不复制或提升来源能力。Desktop 深链只允许同一固定 GitHub 来源格式，不接受本地路径、Shell、Token、Compute Profile 或授权状态。

## 8. 发布承诺

v1.0.0 Release Gate 包含全量测试、Lint、Local/Static 构建、性能门、生产依赖审计、PWA 版本一致性和关键浏览器流程。最终试用确认后以 Apache License 2.0 创建 Git Tag 与 GitHub Release；后续 1.x 必须保持这些契约向后兼容。

## 9. 智能体接口

`skills/tensornote-knowledge-workspace/` 将本页的运行时契约转换为智能体可执行的撰写、配置、运行和校验流程。Skill 不另定义内容格式：它必须继续使用 Workspace Schema v1、Executable Markdown Syntax v1 和 Settings / Secret Model v1。

仓库级 `AGENTS.md` 负责自动路由；Skill 的 references 提供按需规格，assets 提供可复制模板，`validate-workspace.mjs` 提供确定性检查。完整安装与调用方式见[智能体接口与 Skill 使用说明](AGENT_INTEGRATION.md)。
