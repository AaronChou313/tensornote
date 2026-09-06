# TensorNote Release Matrix

本次按用户明确要求发布 GitHub 社区版，不提交应用商店，不以购买 Apple/Windows 开发者证书为前提。发行策略由 Tag 内的 `release-policy.json` 固定；旧文档中“所有 Tag 必须等待平台证书”的规则已被本节替代。公开状态以 GitHub Release 为准。

## 两种渠道

| 渠道 | 操作系统签名 | Updater 签名 | 使用范围 |
| --- | --- | --- | --- |
| `github-community`（当前） | 可选；当前未配置 Apple Developer ID / Windows 证书 | 必须 | GitHub 直接分发，说明未签名/未公证和首次打开提示 |
| `trusted-desktop`（未来可选） | 必须；缺凭据失败关闭 | 必须 | Developer ID、公证、Windows 受信任发布者发行 |

社区版不是绕过应用权限或关闭更新校验。发行门始终检查代码、版本、依赖、模板和资产；不接受未知渠道，也不允许 Updater 签名降级。证书配置只读名称，不打印值。发布说明不得把社区包称作已公证安装包。

## 资产矩阵

| 交付 | 资产 | 检查 |
| --- | --- | --- |
| 在线 Web | GitHub Pages `/tensornote/` | Static 构建、Hash Router、IPC 边界、真实侧栏走查 |
| Static archive | `TensorNote-web-X.Y.Z.tar.gz` | Pages 同构建，部署路径明确 |
| 本地 Web | `TensorNote-local-web-X.Y.Z.tar.gz` | 已编译 Local 模式、Node.js 22 启动、Loopback、SPA 路由、路径边界测试、Git Bridge 与双语手册 |
| Agent Skill | `TensorNote-agent-skill-X.Y.Z.tar.gz` | 同版本、完整引用、锁文件、模板与独立校验 |
| macOS arm64 / x64 | DMG、app archive、Updater signature | CI 构建、SHA-256、Updater；社区版无 Developer ID 公证 |
| Windows x64 | NSIS、MSI、Updater signature | CI 构建、SHA-256、Updater；社区版无受信发布者签名 |
| Linux x64 | AppImage、Deb、RPM、Updater signature | CI 构建、SHA-256、Updater |
| Container | Compose 和镜像构建验证 | 不等于已发布容器镜像 |

所有资产来自同一不可变 Tag/commit。手动 Workflow 是 dry run，只产生临时 Actions Artifacts；Tag Workflow 创建 Draft、部署 Pages、附加资产、生成 `SHA256SUMS` 和含 distribution 策略的 `release-manifest.json`。成功构建不等于每个平台都完成了真实安装。

## 公开前验收

1. 检查完整 CI 与 Release jobs 通过，包括新本地 Web 包。
2. 下载 Draft 资产，核对完整清单、版本、commit、SHA-256；核验 `latest.json` 目标和签名对应真实附件。
3. 在可用机器实际验证安装/启动、About、本地目录、保存、侧栏展开折叠、Jupyter 主流程。明确记录可用平台与未实测平台。
4. 新本地 Web 在源码目录外解压运行，验证路由刷新与 Git Bridge。Static Web 单独验证，避免把开发服务器截图当作线上构建通过。
5. 补齐中英文说明、真实截图和社区版首次安装提示后公开 Draft。用户本次已授权 GitHub 发布，不另设商店资格门。

若未来采用 `trusted-desktop`，额外检查 macOS `codesign --verify --deep --strict`、`spctl --assess`、`stapler validate`，Windows `Get-AuthenticodeSignature` 为 `Valid`，签名身份匹配。SHA-256、Updater 签名与操作系统签名各有用途，不能互相替代。

## 已知验证债务

干净 Windows/Linux/Intel macOS 的安装/卸载、公共 Binder ready 后完整 Cell 执行，以及真正的 `1.6.0 → 下一 Patch` 自动升级闭环尚需对应环境。公开说明保留这些限制，不伪称通过。它们不再因缺少付费证书阻止此次 GitHub 社区发行。

## 回滚

不要移动已经公开的 Tag。安装资产回归应停止 latest 推广、移除错误更新清单并发布递增 Patch；Pages 可重新部署已知安全 Tag。用户先保存和备份知识库，应用与内容目录保持分离。修复不应改变 Workspace Schema v1。
