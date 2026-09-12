# TensorNote 2.0 平台契约

`src/platform/index.ts` 是公共 TypeScript 边界。Markdown、附件与 `tensornote.yaml` 是可迁移事实来源；设置、Secret、草稿和运行状态不属于 Workspace 内容。

## Host 与 Deployment

正式 Host 只有 `web` 与 `desktop`。Static、Self-hosted 和 Development 是 Web 的部署元数据，只决定 Router、base path 与 PWA，不授予产品能力。

- Web 以阅读和分享为主，可使用 GitHub Workspace Provider；浏览器明确授权时可读写本地目录。只能连接兼容的远程 HTTPS Compute。
- Desktop 负责本地创作与运行，可通过 Host 能力访问原生目录、发现/创建环境并启动本机 Jupyter，也可连接远程 Compute。

## Workspace Repository Schema v1

根目录可选包含：

```yaml
schemaVersion: 1
workspace:
  name: My Workspace
  description: Portable Markdown notes
content:
  root: notes
assets:
  root: assets
navigation:
  mode: filesystem
features:
  executable: false
environment:
  files: [requirements.txt]
publishing:
  title: My Workspace
  description: Public description
```

没有 Manifest 时仍可阅读，执行默认关闭。未来 Schema 只读且不可执行；未知字段保留。Token、密码、Cookie、私钥和 API Key 不得写入 Workspace。

## Workspace Provider v1

Provider 负责列目录、读文本/二进制、解析资源 URL，并声明写入、移动、复制、删除、监听等能力。UI 只根据 capability 显示操作。写入使用预期修改时间/大小检测冲突，不能把权限、越界或 I/O 错误伪装成不存在。

GitHub Provider 绑定解析后的完整 commit SHA。分享链接可以用分支发现最新 revision，但实际阅读与执行信任必须固定到 SHA。2.0 不含 Git Workspace 或 Git 操作 API。

## Compute Provider v1

Compute Provider 提供连接、Kernel 查询、Session、执行、Interrupt、Restart、诊断与关闭。Compute Connector 可将 Direct Jupyter、JupyterHub、BinderHub 解析成临时连接；Token 与 Lease 只存在会话/内存中。

执行需要同时满足：Workspace 显式许可、Provider 可用，以及 GitHub 来源对当前完整 revision 的信任。连接成功不能隐式授予执行权。Desktop 环境发现和启动属于 Host 能力，不属于 Workspace 或 Compute Provider。

## Sidecar Markdown v2

Sidecar 只有两种内建类型：`derivation` 与 `jupyter`。

```markdown
:::tensornote{type="derivation" id="attention-scale" title="完整推导"}
普通 Markdown 与公式。
:::
```

Jupyter Sidecar 的正文包含一个或多个 `python` Fence，可带 Cell `title`，并在一个 Kernel 中按顺序执行。指令必须具有笔记内唯一的稳定 `id`；无效或未知指令保留原文并报告诊断。

旧 `python exec lab="..."` Syntax v1 继续可读，通过 legacy adapter 映射成 Jupyter Sidecar。2.0 不开放 Sidecar Registry、第三方 Sidecar 类型或运行时插件。

## UI 与数据生命周期

- Workbench 同时只有一个活动笔记；Tabs 是打开记录与切换入口。
- SidePanel 同时只有一个活动 Sidecar；切换笔记关闭，宽度偏好可持久化。
- Outline 来自 Heading Index，以 TopBar Popover 展示；Properties 只在编辑态按需出现。
- 主题、编辑器和 Compute Profile 属于设备偏好；Token 只进 session storage/内存；Dirty 草稿进设备恢复存储；活动面板属于短期 UI。

## 智能体接口

`skills/tensornote-knowledge-workspace/` 使用同一 Schema 与 Sidecar 指令，不定义第二种知识库格式。模板和 Validator 可独立于应用运行；Skill 不授予安装依赖、执行代码、联网或改写 Git 历史的权限。
