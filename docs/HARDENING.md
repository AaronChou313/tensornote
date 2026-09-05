# TensorNote v0.9.0 Distribution & Hardening

v0.9.0 的目标不是扩展功能数量，而是让 TensorNote 在升级、异常、部署和大 Workspace 中保持可预测。

## 兼容与迁移

- 当前 Workspace Schema 是 v1。缺少版本的 Manifest 在内存中迁移，不自动改写用户文件。
- 未来 Schema 仍读取已知 Markdown 和字段，但 Session 强制只读，并禁用 Git 与执行。
- App、Workspace、Extension、Compute 与 Git 设置分别声明持久化版本；迁移只保留类型正确的已知字段。
- Extension API 主版本是 v1。旧 Manifest 省略 `apiVersion` 时继续兼容，请求未来主版本时明确拒绝。

## 数据与恢复边界

- Markdown 文件始终是内容 Source of Truth。
- IndexedDB/localStorage 草稿只是 30 天有效的恢复状态；不会自动覆盖文件，也不进入 Workspace 或 Git。
- 文件保存继续比较修改时间与大小。恢复草稿不会绕过外部修改冲突。
- React Crash Report 不记录 Markdown、Token、Secret 或 Git 凭据。

## 安全边界

- Git Bridge 只属于 Local Web；Static/Self-hosted Runtime 不显示入口。Bridge 仍限制 loopback、Origin、固定仓库根目录和非 Shell 子进程。
- Jupyter/JupyterHub Token 与 Extension Secret 仅在 sessionStorage；BinderHub 临时 Token 和动态 Server URL 只在运行时 Lease；诊断会清理 Token、URL Query 与密码文本。
- Remote Compute 非 Loopback URL 必须使用 HTTPS；Binder 必须固定完整 Git commit；JupyterHub 只停止 TensorNote 本次启动的用户 Server，不停止已有实例。
- Desktop Updater 只接受内置 minisign 公钥验证的 HTTPS Release；Updater 私钥与 OS 代码签名证书不得进入源码、Workspace、日志或普通构建环境。
- GitHub Workspace 执行信任绑定精确 Revision。
- PWA 只缓存同源 GET 与访问过的应用资源，不批量缓存 Workspace、GitHub 或 Jupyter 内容。
- Nginx 默认提供 `nosniff`、Referrer Policy 与受限 Permissions Policy。
- v0.9.0 发布候选运行生产依赖 Audit；发现高危漏洞时不发布。

## 性能策略

- Workspace 目录递归并发上限 8，文档读取/解析并发上限 16。
- 同一 Provider 刷新按 Revision、mtime 与 size 复用解析文档，移除的路径同步清出缓存。
- Knowledge Search 在建索引时预计算小写字段；链接与标签使用原位集合/数组构建。
- 同级文件树每批最多渲染 200 项。
- Home、AppShell、Workspace Views、Built-in Workspace、NoteEditor、Jupyter 与图形依赖按需加载。

`pnpm test:performance` 包含 1,000/10,000 笔记、超过 2MB Markdown 和大 Asset 列表回归。阈值是数量级回归门，不是跨硬件 SLA。

## 支持的分发面

| Runtime | 支持范围 |
| --- | --- |
| Local Web | Local/GitHub/Built-in Workspace、读写、Jupyter、可选 Git Bridge |
| Static Web | Hash Router、PWA、GitHub/Built-in、浏览器允许的 Local/Jupyter；无 Git Bridge |
| Self-hosted Web | Docker/Nginx 中的同一浏览器 Runtime；当前无 Server-mounted Workspace |

Tauri Desktop 可在未来作为 Runtime Adapter 实验，但 v0.9.0 不提供桌面安装包，也不维护另一套业务逻辑。

v1.6.0 的正式 Tag 流水线在缺少 macOS Developer ID/公证、Windows 受信代码签名或 Updater Secret 时失败关闭。候选资产先进入 Draft Release，并附带 SHA-256 与机器可读清单；详细门见 [Release Matrix](RELEASE_MATRIX.md)。

## Release Gate

```bash
pnpm check
pnpm test:performance
pnpm audit --prod --audit-level high

VITE_TENSORNOTE_DEPLOYMENT=static \
VITE_BASE_PATH=/tensornote/ \
pnpm build

git diff --check
```

浏览器回归至少覆盖 Home、Built-in Workspace、笔记路由、Workspace Views、侧栏收起/恢复、明暗主题和 390px 抽屉。可写 Local Workspace 的草稿恢复需结合自动测试与人工文件冲突场景验证。
