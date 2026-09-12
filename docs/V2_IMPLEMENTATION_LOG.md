# TensorNote 2.0 实施日志

## 当前状态

- 当前阶段：2
- 最后完成：1 Host 契约
- 当前工作：核心收缩与依赖切割
- 分支：`codex/v2-core-sidecar`
- 基线：v1.18.0 发布后主线 `fcdfcc2`

## 阶段状态

| 阶段 | 状态 | Commit |
| --- | --- | --- |
| 0 规范与基线 | DONE | `2b5688a` |
| 1 Host 契约 | DONE | 待提交 |
| 2 核心收缩 | TODO | |
| 3 单笔记 Workbench | TODO | |
| 4 Sidecar 契约 | TODO | |
| 5 统一 SidePanel | TODO | |
| 6 编辑与迁移 | TODO | |
| 7 双宿主收口 | TODO | |
| 8 稳定与发行 | TODO | |

## 2026-09-12 接手记录

- 工作树开始时 clean，HEAD 为 `fcdfcc2`。
- 已读取 v1.18.0 交接、用户提供的 2.0 总规范、现有 routes、AppShell、platform public boundary 与 feature references。
- 初步确认 Git Workspace 与 GitHub Workspace Provider 分离；KnowledgeIndex 同时服务 WikiLink/Heading/Search，不能整体删除；Binder 目前位于 Project Experiment 域，是否保留需在阶段 2 按 Jupyter Sidecar 实际依赖判断。
- 基线 `pnpm check` 通过：63 个测试文件、226 项测试，以及 Lint、TypeScript 和生产构建。

## 阶段 0 — 规范与基线

状态：DONE

- 将用户提供的总规范原样纳入仓库，作为 2.0 产品和架构决策来源。
- 建立 0～8 阶段计划与跨会话实施日志。
- 依据当前源码核对 App routes、AppShell、Host、Deployment、Workspace/Compute Provider，以及待删除系统的直接引用。
- 确认阶段 2 必须做依赖切割，不能按目录直接批量删除。

## 阶段 1 — Host / Web deployment 契约

状态：DONE

- 正式配置只表达 `web` 与 `desktop` Host；static、self-hosted、development 成为 Web deployment metadata。
- 路由、basePath 与 PWA 收入 `WebDeploymentConfig`，不再提供产品能力矩阵。
- Compute 默认 Profile 与能力完全由 Host 决定；Web 不再因本地开发地址获得 localhost Jupyter 产品能力。
- 浏览器目录能力继续属于 Workspace Provider，不由 deployment target 冒充原生 Host 能力。
- 4 个相关测试文件、11 项测试、Lint 与 TypeScript 通过。
