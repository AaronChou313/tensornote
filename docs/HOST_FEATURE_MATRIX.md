# Web 与 Desktop 功能边界

适用于 v1.6.0 候选源码。这里的“支持”表示实现边界，正式安装包状态仍以 Release Matrix 为准。四种部署共用 Markdown、Schema v1、索引、编辑器、Workbench 与 Compute 接口，入口按 Host 与 Workspace Provider 的能力共同决定。

| 能力 | Local Web | Static Web / Pages | Self-hosted Web | Desktop |
| --- | --- | --- | --- | --- |
| Built-in / GitHub 固定 Revision 只读阅读 | 支持 | 支持 | 支持 | 支持 |
| 本地 Markdown 读写 | 支持 File System Access API 的桌面 Chromium，需目录授权 | 同左，取决于浏览器与安全上下文 | 同左；不是服务器挂载目录 | 原生目录授权，不依赖浏览器目录 API |
| 编辑、属性、文件新建/移动/删除 | 可写 Provider 才显示 | 可写 Provider 才显示 | 可写 Provider 才显示 | 可写 Provider 才显示 |
| Notebook / Scratch 执行 | 连接用户 Jupyter | 连接兼容远程 Jupyter | 连接兼容远程 Jupyter | 连接用户或应用启动的 Jupyter |
| 环境发现、创建最小环境、启动/停止 Owned Jupyter | 不支持 | 不支持 | 不支持 | 支持；先审核计划，依赖安装不由知识库暗中触发 |
| 本地 Git 状态、Diff、Stage、Commit | 可选 loopback Git Bridge | 不支持 Bridge | 不支持 Bridge | 原生 Git，无需 Bridge |
| Git Push/Pull/远程凭据管理 | 未实现 | 未实现 | 未实现 | 未实现 |
| 系统文件关联、拖放/深链 | 受浏览器能力限制，无原生文件关联 | 同左 | 同左 | 原生支持 |
| 应用更新 | 更新 Web 部署；可选 PWA | 更新 Web 部署；可选 PWA | 更新服务镜像/部署 | 显式检查并验证签名的 Updater |
| 智能体维护知识文件与 JSON 校验 | 独立于应用；需要文件访问与 Node.js | 同左 | 同左 | 同左 |

JupyterHub、BinderHub、Direct Jupyter 均走 Compute Connector 能力检查；HTTPS、CORS、WebSocket、用户认证和网络条件仍需满足。HTTPS 页面不能承诺连接任意 HTTP Jupyter。TensorNote 不托管公共 GPU，也不共享作者 Token。

执行与读写是独立权限。启用可写 Workspace 不等于允许执行；GitHub 执行额外要求当前 commit 的 Revision trust；未来 Schema 强制只读、关闭 Git 与执行。Static 构建必须通过 `scripts/verify-static-boundary.mjs`，不能打包 Tauri IPC、Native Runtime 或 Updater。

发布验收分别记录浏览器读写与 Desktop 原生文件流程，不用一方的通过结果代替另一方。人工安装、证书、公证及完整平台矩阵见 [RELEASE_MATRIX.md](RELEASE_MATRIX.md)。
