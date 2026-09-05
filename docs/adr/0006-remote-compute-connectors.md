# ADR 0006: Remote Compute Connectors

- Status: Accepted for v1.5.0
- Date: 2026-09-05

## Context

TensorNote 已有稳定的 ComputeProvider API v1 和 Jupyter 实现，但在线读者面对三种不同入口：已有 HTTPS Jupyter、需要身份与 Server 生命周期的 JupyterHub、需要从 Repository 构建临时环境的 BinderHub。把这些流程直接塞进 Jupyter Provider 会混合“获得环境”和“在环境中执行代码”，也会让临时 Token、远程所有权和 Workspace 来源进入错误边界。

## Decision

增加向后兼容的 ComputeConnector API v1。Connector 接收 Profile、会话 Secret 和最小 ComputeContext，返回标准 Jupyter `ComputeConnectionConfig` 与可释放 Lease。ComputeProvider 不感知 Hub 或 Binder。

1. 没有 `connector` 的旧 Profile 等价于 `direct`。
2. JupyterHub Connector 只使用当前用户 Token。它先读取 `/hub/api/user`，复用就绪 Server；否则启动默认或命名 Server，并消费 Progress EventStream或轮询用户模型。
3. 只有成功由本次连接启动的 Hub Server 才标记为 TensorNote-owned；已有、并发启动或冲突 Server 均不自动停止。
4. BinderHub Connector 只使用公开 GitHub `owner/repository` 和完整 40 位 commit SHA。`ready` 事件返回的 URL/Token 直接放入 Lease，不进入持久 Profile。
5. 远程非 Loopback Endpoint 必须使用 HTTPS。CORS、认证、Kernel 与 WebSocket 仍逐层诊断。
6. Workspace execution permission 与 GitHub revision trust 在 Connector 之外继续生效；成功连接从不等价于授权执行。
7. 断开顺序为 Kernel Session → ComputeProvider → Connector Lease。清理错误必须可见，不得伪装为已完全关闭。

## Consequences

- Web、Pages 与 Desktop 复用同一连接器和 Jupyter Provider，不增加服务端代理或第二套 Lab 协议。
- Hub 管理者仍需配置适当 CORS、Token scopes、Spawner 与可选 named servers；TensorNote 不持有管理员 Token。
- Binder 冷启动、配额、闲置回收和临时文件丢失属于 Provider 约束，必须在 UI 明示。
- 浏览器直连意味着某些不支持第三方 Origin 或 WebSocket 的托管 Notebook 产品仍不兼容；不得通过隐藏代理绕过其安全模型。
- 未来 Connector 可以增加 OAuth 或其他标准启动器，但必须继续返回相同 Lease，不得把 Workspace 内容格式绑定到计算平台。
