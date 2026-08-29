# TensorNote 架构说明

本文记录 `v0.1.0 — Workspace Foundation` 与 `v0.2.0 — Authoring` 已落地的稳定边界。长期路线图仍是产品决策的上位文档；后续版本必须在这些边界上增量演进。

## 产品定义

TensorNote 是一个本地优先、Markdown 优先、可执行但不强制执行的知识 Workspace。Markdown 与资源文件是可移植的事实来源；Jupyter 只是按需连接的执行后端。

## Workspace 加载链路

```text
URL / Home action
        │
        ▼
WorkspaceProvider ── capabilities / descriptor
        │
        ▼
loadWorkspace ── tensornote.yaml / safe defaults
        │
        ├── Markdown parse + Lab extraction
        ├── filesystem navigation index
        └── document/search index
        │
        ▼
WorkspaceSession ── UI / search / reader / lab
```

UI 读取 `WorkspaceSession.capabilities` 和通用 descriptor，不直接依赖本地目录或 GitHub API 的实现细节。

## v0.1 Providers

| Provider | 读取 | 写入 | Binary | Git | 说明 |
| --- | --- | --- | --- | --- | --- |
| Bundled | 是 | 否 | 是 | 否 | 内置 AI Learning Notes 示例 |
| Local | 是 | 是 | 是 | 否 | File System Access API，提供日常创作与文件操作 |
| GitHub | 是 | 否 | 是 | 是 | 公开 Repository，内容固定到解析出的 commit SHA |

`WorkspaceProvider` 统一暴露读取方法。写入 Provider 通过 `writeText`、`writeBinary`、`createDirectory`、`removeEntry`、`copyEntry`、`moveEntry` 和 `watch` 扩展；UI 只读取 capability，不绕过 Provider。

## v0.2 Authoring Pipeline

```text
Local file + source stat
        │
        ▼
Markdown draft ── CodeMirror history / dirty state
        │                         │
        ├── live parse ───────────┴── Preview
        ├── Frontmatter UI ────────── raw Markdown
        ├── Asset insert ──────────── assets/
        └── Save(expected stat)
                    │
          conflict ─┴─ write + re-index
```

- 保存携带打开时的 `modifiedAt` 与 `size`，外部变化时抛出 `WorkspaceConflictError`，避免静默覆盖。
- Local Provider 使用轮询检测外部文件变化；用户可以重新载入，或明确选择保留当前内容并覆盖。
- 新建、复制和属性编辑都会生成或保留普通 YAML Frontmatter；不建立内容数据库。
- Lab Drawer 使用 executable Fence 的 `lab` 与 `cell` 标识，把编辑后的 Python 精确写回原 Markdown。
- 资源粘贴、拖放与上传统一写入 manifest 的 `assets.root`，正文只插入相对 Markdown 链接。

## `tensornote.yaml` v1

```yaml
schemaVersion: 1
workspace:
  name: My Workspace
  description: Optional description
content:
  root: notes
assets:
  root: assets
navigation:
  mode: filesystem
features:
  executable: false
```

- 未提供配置时仍可打开普通 Markdown 文件夹。
- 无配置的 Workspace 默认 `executable: false`。
- 未知顶层字段被忽略；扩展元数据放在 `extensions`。
- 文档 `id` 必须在 Workspace 内唯一。

## 信任与凭据边界

- GitHub Workspace 默认只读、未受信任，信任键固定到 `owner/repo@commitSHA`；Repository 更新后必须重新信任。
- 只有 `features.executable: true` 且当前 Revision 已受信任时，远程 Workspace 才能触发 Jupyter 执行。
- Jupyter Token 只写入 `sessionStorage`，关闭浏览器会话后清除；长期配置只保存 Server URL 与 Kernel Name。
- Workspace 配置不得包含 Token、密码或云端密钥。

## v0.2 当前明确不做

v0.2 不提供反向链接/图谱、插件市场、AI 辅助或多人协同。这些能力分别属于后续 Knowledge System、Extensibility 与 Collaboration 阶段。

## 版本更新规则

每个版本至少同步更新：

1. `package.json` 版本号与 Release notes。
2. Schema、Provider capability 或安全边界的文档。
3. 单元测试、浅/深主题浏览器验收和生产构建。
4. Git commit、push；正式版本再创建对应 `vX.Y.Z` Tag/Release。
