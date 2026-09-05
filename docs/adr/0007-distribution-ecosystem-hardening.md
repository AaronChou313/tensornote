# ADR 0007: Distribution and Ecosystem Hardening

- Status: Accepted for v1.6.0
- Date: 2026-09-05

## Context

TensorNote 的 Web、Tauri Desktop、公开 Workspace Reader 和 Remote Compute 已共享同一业务核心，但源码能跨平台编译不等于用户可以验证安装包来源。公开分发还需要不可变版本、平台签名、公证、Updater 签名、校验值、模板固定 Runtime 与明确回滚路径。

## Decision

1. 正式分发只由匹配应用版本的 `vX.Y.Z` Tag 触发。package、Cargo、Tauri、About、Release notes 和 Tag 必须一致。
2. Tag 流水线先验证全部共享门和模板，再构建 Static Web、macOS arm64/x64、Windows x64、Linux x64 与容器证明。
3. macOS 正式资产必须使用 Developer ID Application 签名并公证；Windows 正式资产必须使用受信证书和时间戳。缺少任何签名 Secret 时 Tag 流水线失败关闭，不降级发布未签名资产。
4. Tauri Updater 使用独立 minisign 密钥。公钥进入应用；私钥与密码只存在维护者安全备份和 GitHub Secrets。应用不会接受无签名、签名错误或 HTTP 更新。
5. 每次构建生成机器可读 `release-manifest.json` 和 `SHA256SUMS`。Release 先保持 Draft，完成平台签名与主流程抽查后人工公开。
6. Workspace 发布模板固定到 TensorNote Release Tag。课程模板仍使用 Workspace Schema v1 和 Executable Markdown v1，不创造专有课程格式。
7. 可选公开目录本阶段只完成边界评估：未来目录最多索引作者主动提交的标题、描述、License、Repository、Tag 和兼容性元数据，不托管 Markdown、Token、账号或计算资源。

## Consequences

- 普通开发构建不要求签名私钥；Updater artifacts 只在 Release 配置中生成。
- 自动更新只属于 Desktop HostAdapter，Static/Local Web 仍由部署渠道和 PWA Cache 更新。
- Apple 与 Windows 证书是外部发布资格，不能由源码或 CI 安全伪造；它们是正式 v1.6.0 Release 的显式门，而不是可以跳过的测试警告。
- 已公开 Tag 不移动。问题版本通过新的 Patch Release 和更新通道撤回处理，Workspace 内容不随应用回滚。
