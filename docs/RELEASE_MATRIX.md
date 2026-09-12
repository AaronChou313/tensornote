# TensorNote 2.0 Release Matrix

| 资产 | 验收 |
| --- | --- |
| Web static archive | `pnpm build:web`、静态边界、Pages base path |
| Desktop installers | Web frontend、Rust fmt/clippy/test、各平台 Tauri build |
| Self-host image proof | Compose 配置与容器构建 |
| Agent Skill archive | quick validation、模板 strict、仓库 Workspace validation |
| Source/metadata | 版本一致、发行说明、迁移说明、SHA256SUMS |

Web 与 Desktop 必须共享 Workspace/Sidecar/Compute 契约，同时遵守各自 Host 能力。正式 Release 前在干净目录验证 Web 归档，在至少当前 macOS 主机验证桌面启动与本地 Workspace。
