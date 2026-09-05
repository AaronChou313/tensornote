# TensorNote Release Matrix

本文是 v1.6.0 分发验收的事实来源。所有正式 Desktop 资产必须由同一 `vX.Y.Z` Tag 构建；Web、安装包、Updater 清单、校验值和 About 版本不得来自不同提交。

## 交付矩阵

| 交付面 | 目标 | 资产或部署 | 发布门 |
| --- | --- | --- | --- |
| Static Web | GitHub Pages | `/tensornote/` Hash Router + PWA | `pnpm build:web`、Static IPC 边界、固定 Tag |
| Web archive | 任意静态服务器 | `TensorNote-web-X.Y.Z.tar.gz` | 与 Pages 相同构建，列入 `SHA256SUMS` |
| macOS | Apple Silicon | `.dmg`、`.app.tar.gz`、Updater signature | Developer ID Application 签名、公证、Staple、Updater 签名 |
| macOS | Intel | `.dmg`、`.app.tar.gz`、Updater signature | Developer ID Application 签名、公证、Staple、Updater 签名 |
| Windows | x86_64 | NSIS、MSI、Updater signature | 受信代码签名证书、SHA-256、HTTPS timestamp、Updater 签名 |
| Linux | x86_64 | AppImage、Deb、RPM、Updater signature | CI 隔离构建、Updater 签名、SHA-256 |
| Container | linux/amd64 | Nginx image build proof | Compose 校验、非特权端口、生产依赖审计 |

`release.yml` 的手动运行用于无 Tag 的矩阵演练，只产生 GitHub Actions Artifacts。正式 Tag 运行必须先通过签名 Secret 门，随后创建 Draft Release、部署 Pages、上传安装资产、`latest.json`、`SHA256SUMS` 和 `release-manifest.json`。Draft 只有在人工验证签名与安装主流程后才能公开。

## 安装资产验证

1. 从 GitHub Release 下载目标安装包、`SHA256SUMS` 与 `release-manifest.json`。
2. 计算 SHA-256，并与清单中相对路径对应的值比较。
3. macOS 使用 `codesign --verify --deep --strict`、`spctl --assess` 与 `stapler validate` 检查签名和公证。
4. Windows 在文件属性或 PowerShell `Get-AuthenticodeSignature` 中确认状态为 `Valid`，签名者与 Release 文档一致。
5. 安装后在 Settings → About 确认版本，并检查更新；应用只接受由内置 Updater 公钥验证的 HTTPS 资产。

校验值用于发现下载损坏或资产替换，不能替代平台代码签名。Updater minisign 私钥、Apple `.p12`、Windows `.pfx` 与密码只存在维护者安全存储和 GitHub Secrets，永远不进入 Repository 或 Workspace。

## 端到端抽查

每个正式候选至少完成：Home → 打开 Built-in → 打开本地 Workspace（Desktop）→ 编辑保存 → 启动/连接 Jupyter → 运行两个 Cell → 分栏 → Settings → 检查更新。Static Web 另验证 GitHub Workspace、固定 Revision 分享和 Remote Compute；Desktop 另验证拖放、文件关联、Native Git、Runtime Assistant 与深链。

## 回滚

- Release 仍为 Draft：修复原提交，重新创建新 Tag；不移动或覆盖已经公开的 Tag。
- 已公开但安装资产有问题：立即把 Release 标为 prerelease、从 `latest` 更新通道撤下 `latest.json`，并发布递增 Patch 版本。不要让 Updater 指向旧版本伪装回滚。
- Web 回归：GitHub Pages 可以重新部署最后一个已知安全 Tag；公开 Workspace 仍固定自己的内容 Revision。
- 用户数据不需要迁移回滚：Markdown、Assets 与 `tensornote.yaml` 始终独立于应用版本。若新版写入语义发生风险，应先用旧版只读打开并备份 Workspace。

正式发布的不可变记录由 Git Tag、GitHub Release、Actions run、`release-manifest.json` 和签名证书共同组成。
