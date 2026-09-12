# TensorNote 2.0 实施计划

状态：进行中。权威产品规范见 [V2_CORE_SIDECAR_PRODUCT_SPEC.md](V2_CORE_SIDECAR_PRODUCT_SPEC.md)。

## 不变边界

- Markdown、附件与 `tensornote.yaml` 继续是可迁移事实来源。
- 保留 Workspace Provider、Compute Provider、WikiLink、Heading、Search、Recovery 与 Jupyter 核心。
- 正式产品只表达 Desktop Host 与 Web Host；开发服务器不作为 Local Web Edition。
- Sidecar 仅有 `derivation` 与 `jupyter` 两种内建类型，不开放插件注册机制。
- 删除 Git Workspace，但保留 GitHub Workspace Provider。
- v1 Markdown 与旧 Lab 在迁移期保持可读，并通过 legacy adapter 转入 Jupyter Sidecar。

## 阶段

| 阶段 | 目标 | 主要验收 |
| --- | --- | --- |
| 0 | 固化规范、真实依赖图、基线 | 当前测试通过；计划与日志入库 |
| 1 | Host / Web deployment 契约 | UI 能力只由 web/desktop Host 决定；路由与 basePath 留在 Web config |
| 2 | 核心收缩 | Command Palette、Extension Platform、Database、Graph UI、Git Workspace、Project Experiment 及专用原生能力移除 |
| 3 | 单笔记 Workbench | 单主笔记、Tabs、Files、Search；移除 secondary pane、split controls 与滚动同步 |
| 4 | Sidecar 内容契约 | directive parser、类型、store、legacy Lab adapter 与错误降级 |
| 5 | 统一 SidePanel | 可调整宽度、切笔记关闭、正文位置保持；Derivation/Jupyter 共用一栏 |
| 6 | 编辑与文档迁移 | 编辑器插入/更新 Sidecar；Properties 折叠区；Outline Popover；示例与 Skill 对齐 |
| 7 | 双宿主产品收口 | Desktop 创作运行；Web 阅读分享；移除 Local Web 发行包与 Git Bridge 宣传/流水线 |
| 8 | 稳定门与迁移说明 | 全量前端/Rust/性能/Static/桌面构建；双语文档、迁移与回滚说明 |

每阶段完成后更新 `docs/V2_IMPLEMENTATION_LOG.md` 并独立提交。2.0 正式 Tag 与公开 Release 只在全部阶段完成并核对发行资产后创建。
