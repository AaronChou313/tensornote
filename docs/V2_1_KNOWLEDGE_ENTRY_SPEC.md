# TensorNote v2.1.0 开发任务

仓库：

`https://github.com/AaronChou313/tensornote`

目标版本：

`v2.1.0`

---

# 一、任务背景

TensorNote 已完成 v2.0.0 核心收缩。

当前产品核心已经明确为：

> Markdown 主体笔记 + Sidecar 扩展内容 + Jupyter Runtime。

本次 v2.1.0 **不要继续重构 Sidecar、Markdown Parser、Jupyter Runtime 或 2.0 核心架构**。

本版本重点完善：

> **知识库的进入、创建、打开、远程读取和分享体验。**

主要解决当前以下问题：

1. 首页仍然存在内置示例知识库 `AI Learning Notes`；
2. 首页入口较散，没有形成清楚的知识库操作中心；
3. “新建 Workspace”实际上只是重新选择目录，并没有真正创建知识库；
4. 在线知识库目前只支持 GitHub；
5. GitHub Workspace 仍过度依赖匿名 REST API，可能遇到 60 次/小时/IP 的限额；
6. 当前分享弹窗内容过多，不符合 v2.0 精简后的产品定位；
7. Web / Desktop 当前宿主标识位置不够自然；
8. 用户界面仍存在较多 `Workspace` 文案，需要逐步统一为用户更容易理解的“知识库”。

---

# 二、实施前要求

开始修改前，请先阅读最新代码，至少检查：

```text
src/pages/HomePage.tsx
src/pages/GitHubOpenPage.tsx

src/components/AppShell.tsx
src/components/Sidebar.tsx
src/components/TopBar.tsx
src/components/GettingStarted.tsx
src/components/publishing/PublishDialog.tsx

src/workspace/types.ts
src/workspace/loadWorkspace.ts

src/workspace/providers/GitHubWorkspaceProvider.ts
src/workspace/providers/LocalWorkspaceProvider.ts
src/workspace/providers/NativeLocalWorkspaceProvider.ts

src/store/useWorkspaceStore.ts

src/host/types.ts
src/host/WebHostAdapter.ts
src/host/TauriHostAdapter.ts

src-tauri/src/native_workspace.rs

src/publishing/links.ts

src/deployment/
```

并检查相关 CSS、测试和当前路由。

**以真实最新代码为准，不机械依照本文文件路径删除。**

---

# 三、本版本非目标

v2.1.0 不要重新引入或新增：

```text
Plugin Platform
Command Palette
Database
Knowledge Graph
Git Client
Project Experiment
Terminal
Shell
AI Chat
用户账号
云同步
后端服务
PAT 管理
OAuth 登录
私有远程仓库
```

GitHub / GitLab / Gitee 本版本只支持：

> **公开、只读在线知识库。**

不要为了支持私有仓库引入 Token、账号、认证系统。

---

# 四、首页整体重构

当前首页内容比较分散。

v2.1.0 将首页明确重构成：

> **知识库入口页**

主要布局：

```text
┌───────────────────────────────────────────────────────┐
│ TensorNote   [Desktop]  使用说明 ↗                   │
├───────────────────────────────────────────────────────┤
│                                                       │
│            打开知识库，继续你的工作。                 │
│                                                       │
│  ┌──────────────────────┐  ┌──────────────────────┐  │
│  │ 最近打开的知识库       │  │ 开始                 │  │
│  │                      │  │                      │  │
│  │ Transformer Notes    │  │ 打开本地知识库        │  │
│  │ Deep Learning        │  │ 新建本地知识库        │  │
│  │ Research Notes       │  │ 打开在线知识库        │  │
│  │ ...                  │  │                      │  │
│  └──────────────────────┘  └──────────────────────┘  │
│                                                       │
└───────────────────────────────────────────────────────┘
```

Desktop 和大屏 Web 使用左右布局。

建议比例：

```text
最近打开：55%～60%
操作面板：40%～45%
```

窄屏自动改为：

```text
操作面板
↓
最近打开
```

或者：

```text
最近打开
↓
操作面板
```

根据视觉效果选择更自然的一种。

不要使用巨型卡片或复杂 Dashboard。

继续保持 TensorNote 当前：

* 白色主体；
* 淡绿色点缀；
* 克制圆角；
* 简洁边框；
* 少阴影；
* 信息密度适中；

的视觉体系。

---

# 五、删除 AI Learning Notes

彻底删除首页：

```text
AI Learning Notes
```

入口。

删除：

```text
openBundled()
```

及首页相关 Bundled Workspace 逻辑。

同时检查：

```text
BundledWorkspaceProvider
notes/
内置示例知识库资源
```

如果这些代码和内容仅服务内置示例知识库：

应真实删除。

如果测试依赖示例内容：

把测试需要的数据迁移到：

```text
fixtures/
test-data/
```

不要为了测试继续把 AI Learning Notes 当作产品内容保留。

---

# 六、删除 AppShell 的 Bundled 自动 fallback

当前 AppShell 在：

```text
没有 Session
+
直接进入 /notes
```

时仍可能自动打开 `BundledWorkspaceProvider`。

v2.1.0 删除这条逻辑。

没有知识库 Session 时访问：

```text
/notes
/notes/:noteId
/workspace
```

应返回：

```text
/
```

知识库首页。

TensorNote 不再偷偷打开示例知识库。

---

# 七、移除首页 GettingStarted 大块内容

当前首页的：

```text
GettingStarted
```

不再需要占据主要空间。

首页只服务：

```text
最近知识库
+
三个核心操作
```

如果 `GettingStarted.tsx` 没有其他用途：

删除组件及对应 CSS。

使用说明统一通过顶部：

```text
使用说明 ↗
```

进入。

---

# 八、顶部产品标识重新设计

当前 Web / Desktop 标识不要单独漂在页面另一侧。

改成：

```text
TensorNote   [Desktop]   使用说明 ↗
```

Web：

```text
TensorNote   [Web]   使用说明 ↗
```

其中：

### TensorNote

产品 Logo + 名称。

### Desktop / Web

紧凑 Tag。

建议：

```text
Desktop
Web
```

或中文版：

```text
桌面版
Web版
```

不要做成大按钮。

### 使用说明

紧邻 Tag。

使用类似：

```text
使用说明 ↗
```

的小型 Ghost Button。

---

# 九、Host 标识组件化

建议做一个轻量共用组件，例如：

```text
HostBadge
```

或者：

```text
ProductIdentity
```

负责：

```text
TensorNote
Host Tag
使用说明
```

不要在多个组件里分别硬编码：

```text
Desktop
Web
```

Host 来源继续使用当前：

```text
getHostAdapter()
```

不要重新建立 Deployment Edition 系统。

---

# 十、使用说明链接

把用户说明链接集中在单一配置位置，例如：

```text
src/config/links.ts
```

定义：

```ts
USER_GUIDE_URL
```

避免多个组件写死 URL。

当前可以指向仓库：

```text
docs/zh-CN/USER_GUIDE.md
```

对应在线 GitHub 页面。

Web：

在新标签页打开。

Desktop：

优先使用当前已有安全外链机制。

如果目前没有专门的外链 API，可以采用最轻量、最安全的方案，但不要为了一个帮助按钮引入通用 Shell 权限。

必须实际测试 Desktop 行为。

---

# 十一、首页左侧：最近打开的知识库

将 Recent Workspaces 提升为首页主要区域。

标题：

```text
最近打开
```

每行建议显示：

```text
知识库名称

路径 / Repository
                     [来源 Tag]
```

来源 Tag：

```text
本地
GitHub
GitLab
Gitee
```

不要继续显示：

```text
Built-in
```

---

# 十二、最近知识库操作

保留：

```text
点击重新打开
单项移除
清空记录
```

可以继续限制最多：

```text
8～10 个
```

最近打开按：

```text
openedAt desc
```

排序。

---

# 十三、清理旧 Bundled Recent 数据

旧版本用户的 LocalStorage 中可能仍然存在：

```text
type: bundled
AI Learning Notes
```

v2.1.0 migration 时：

自动过滤这些旧记录。

不要让升级到 2.1 后首页还出现无法打开的 AI Learning Notes。

---

# 十四、最近知识库 Empty State

如果没有最近记录：

左侧显示轻量 Empty State：

```text
还没有最近打开的知识库

从右侧打开或创建一个知识库开始。
```

不要放巨大插画。

---

# 十五、右侧操作面板

只保留三个入口：

```text
打开本地知识库
新建本地知识库
打开在线知识库
```

统一设计为紧凑操作项。

例如：

```text
📂 打开本地知识库
   选择已有 Markdown 知识库

＋ 新建本地知识库
   创建一个新的 TensorNote 知识库

☁ 打开在线知识库
   从 GitHub、GitLab 或 Gitee 打开
```

---

# 十六、不同 Host 的主操作强调

Desktop：

优先强调：

```text
打开本地知识库
```

Web：

优先强调：

```text
打开在线知识库
```

但三个入口都保留。

对于不支持 File System Access API 的 Web 浏览器：

```text
打开本地知识库
新建本地知识库
```

仍可显示，但应明确 disabled，并提示：

> 当前浏览器不支持本地目录读写，请使用最新版 Chrome / Edge 或 TensorNote Desktop。

不要直接隐藏，让用户不知道为什么功能不存在。

---

# 十七、“打开本地知识库”

保留现有成熟流程。

Desktop：

```text
Native directory picker
→ NativeLocalWorkspaceProvider
```

Web：

```text
File System Access API
→ LocalWorkspaceProvider
```

本次不要无必要重写这条稳定链路。

用户界面文字统一改成：

```text
打开本地知识库
```

内部类型仍可继续叫：

```text
Workspace
```

**不要为了改用户文案，重命名所有 Workspace 类型和 API。**

---

# 十八、“新建本地知识库”必须真正创建知识库

当前实现中“新建 Workspace”本质上仍是选择目录。

v2.1.0 必须补充真正的创建流程。

点击：

```text
新建本地知识库
```

打开 Modal。

---

# 十九、新建知识库弹窗

建议布局：

```text
新建本地知识库
────────────────────────

知识库名称

[ Transformer Notes              ]

存放位置

[ ~/Documents                    ] [选择…]

知识库将被创建为：

~/Documents/Transformer Notes

────────────────────────

                   [取消] [创建知识库]
```

---

# 二十、知识库名称

字段：

```text
知识库名称
```

不要使用：

```text
Repository Name
```

用户层统一使用：

```text
知识库
```

---

# 二十一、名称验证

不要静默修改用户名称。

发现非法名称时直接提示。

至少处理：

* 空字符串；
* `.`；
* `..`；
* `/`；
* `\`；
* 平台非法字符；
* Windows 保留文件名；
* 尾随空格；
* 明显路径穿越。

错误显示在输入框下。

---

# 二十二、选择存放位置

Desktop：

点击：

```text
选择…
```

选择：

> **父目录**

而不是直接选择最终 Workspace。

例如用户选择：

```text
~/Documents
```

输入：

```text
Transformer Notes
```

最终创建：

```text
~/Documents/Transformer Notes
```

---

# 二十三、Desktop 创建目录的安全边界

当前 Desktop Host 只有：

```text
selectWorkspaceDirectory
restoreWorkspaceDirectory
```

需要补充真正的创建能力。

不要允许 WebView 直接提交任意绝对路径：

```text
createDirectory("/whatever/user/passes")
```

继续沿用当前 Native Workspace 的安全模型。

推荐流程：

```text
Rust directory picker
       ↓
返回 opaque parent directory id
       ↓
WebView 只提交：
parentId + knowledgeBaseName
       ↓
Rust 创建子目录
       ↓
注册 Native Workspace
       ↓
返回 HostDirectorySelection
```

可以新增类似：

```ts
HostParentDirectorySelection
```

以及：

```ts
selectWorkspaceParentDirectory()
createWorkspaceDirectory(parentId, name)
```

具体命名根据当前 Host 架构调整。

核心要求：

> 不允许前端获得“可以随意创建任意系统路径”的通用 IPC。

---

# 二十四、Web 创建知识库

支持 File System Access API 时：

```text
showDirectoryPicker()
```

选择父目录。

然后：

```text
parent.getDirectoryHandle(name, { create: true })
```

创建知识库。

创建前先检查同名目录。

如果已经存在：

提示：

```text
该位置已经存在同名目录。
```

不要默认把已有目录当成新知识库覆盖。

---

# 二十五、路径预览

必须在弹窗中实时显示：

```text
知识库将被创建为：
xxx
```

Desktop：

如果可以安全获得 display path：

显示真实可读路径。

Web：

File System Access API 无法可靠获得完整操作系统绝对路径时：

不要伪造路径。

显示：

```text
Documents / Transformer Notes
```

这样的逻辑路径即可。

---

# 二十六、新知识库默认结构

创建完成后初始化最小 TensorNote 结构。

建议：

```text
Transformer Notes/
├── notes/
├── assets/
└── tensornote.yaml
```

不要再生成：

```text
AI Learning Notes
示例课程
示例 Note
Getting Started Note
```

知识库保持真正空白。

---

# 二十七、tensornote.yaml

使用**当前最新 Workspace Schema**生成。

不要复制历史字段。

建议语义：

```yaml
schemaVersion: 1

workspace:
  name: Transformer Notes

content:
  root: notes

assets:
  root: assets

navigation:
  mode: filesystem

features:
  executable: false

environment:
  files: []
```

如果当前 Schema 还有必要默认字段：

使用现有 Schema/default helper 生成。

不要在 UI 组件里手写两套不同 Manifest 规则。

---

# 二十八、创建完成后的行为

点击：

```text
创建知识库
```

成功后：

1. 创建目录；
2. 初始化结构；
3. 注册 Workspace；
4. 自动打开；
5. 加入 Recent；
6. 进入知识库页面。

空知识库应该自然显示：

```text
还没有笔记

[新建第一篇笔记]
```

不要因为没有 Markdown 文件报错。

---

# 二十九、“打开在线知识库”

首页不要再直接放：

```text
GitHub URL
Ref
打开
```

表单。

改成统一入口：

```text
打开在线知识库
```

点击后打开 Modal。

---

# 三十、在线知识库弹窗

建议：

```text
打开在线知识库
────────────────────────

来源

[ GitHub ] [ GitLab ] [ Gitee ]

Repository URL

[ https://github.com/...              ]

分支 / Ref（可选）

[ main                               ]

留空时使用仓库默认分支。

当前仅支持公开仓库，无需登录或 Token。

────────────────────────

                          [取消] [打开]
```

---

# 三十一、第一阶段只支持三个官方公网平台

支持：

```text
github.com
gitlab.com
gitee.com
```

暂时不支持：

```text
GitHub Enterprise
Self-hosted GitLab
私有 Gitee
任意 Git Server
```

不要把 URL 输入变成任意网络 URL fetch。

---

# 三十二、URL 安全验证

根据选中的 Provider 验证 Host。

GitHub：

```text
https://github.com/<owner>/<repo>
```

GitLab：

```text
https://gitlab.com/<group>/<project>
```

必须支持 GitLab：

```text
group/subgroup/project
```

多级 group。

Gitee：

```text
https://gitee.com/<owner>/<repo>
```

统一：

* 去除尾 `/`；
* 去除 `.git`；
* 拒绝非 HTTPS；
* 拒绝选中 Provider 之外的 Host；
* 不允许 `javascript:` 等异常 scheme。

---

# 三十三、Provider 自动识别

可以根据输入 URL 自动识别：

```text
github.com → GitHub
gitlab.com → GitLab
gitee.com → Gitee
```

如果用户已经选择 Provider，但 URL 与 Provider 不一致：

优先给出明显提示，或者自动切换 Provider。

不要无提示使用错误 API。

---

# 三十四、在线知识库 Provider 架构

当前只有：

```text
GitHubWorkspaceProvider
```

v2.1.0 增加：

```text
GitLabWorkspaceProvider
GiteeWorkspaceProvider
```

三者都实现现有：

```text
WorkspaceProvider
```

不要为远程仓库另造第二套 Workspace 系统。

---

# 三十五、允许少量共享 Remote Repository 基础代码

可以抽取：

```text
RemoteRepositoryLocation
RemoteRepositoryCache
URL parser
tree → WorkspaceEntry helper
```

但不要重新建设：

```text
Remote Provider Plugin Platform
Universal Git Provider Runtime
Generic SCM Marketplace
```

只解决：

```text
GitHub
GitLab
Gitee
```

三个明确平台。

---

# 三十六、WorkspaceSourceType

将当前远程来源显式支持：

```text
github
gitlab
gitee
```

Recent Workspace 必须能够保存：

```text
provider
project path
canonical repository URL
ref
```

并正常重新打开。

---

# 三十七、远程 Workspace 都是只读

能力：

```text
read = true
write = false
watch = false
binary = true
authentication = false
```

本版本不支持在线编辑远程 Repository。

---

# 三十八、远程执行信任需要泛化

当前部分代码仍将：

```text
GitHub
```

写死为“远程不可信来源”。

v2.1.0 改成：

> 任何具有 `descriptor.trustKey` 的远程知识库，在执行代码前都必须显式 Trust。

不要写：

```ts
descriptor.type === 'github'
```

来判断是否需要信任。

应基于：

```text
trustKey
```

或通用 remote repository 判断。

---

# 三十九、Trust UI 泛化

当前 TopBar 的：

```text
Trusted
Trust to run
```

不要只对 GitHub 显示。

GitLab / Gitee 在线知识库也遵循同一执行安全规则。

---

# 四十、GitHub API 限额问题必须在 v2.1.0 修复

当前 `GitHubWorkspaceProvider.open()` 会匿名调用：

```text
Repository
Commit
Recursive Tree
```

并且使用：

```text
cache: no-store
```

容易反复消耗匿名 REST API quota。

v2.1.0 必须至少完成：

### 1. Remote Metadata Cache

缓存：

```text
default branch
resolved revision
repository tree
```

Cache key：

```text
provider
project
ref
```

不要用户来回打开同一个知识库就重新完整请求 API。

---

# 四十一、远程 Cache 策略

建议：

对可变分支：

```text
短 TTL
```

例如数分钟。

对明确 commit：

可以长时间缓存。

不要求建立复杂数据库。

可以使用：

```text
sessionStorage
IndexedDB
```

或当前项目已有合适缓存层。

重点是：

> 明显减少重复 API 请求。

---

# 四十二、GitHub Rate Limit 提示

当前：

```text
GitHub API 匿名访问额度已用完，请稍后重试
```

改进。

读取：

```text
X-RateLimit-Remaining
X-RateLimit-Reset
```

用户提示类似：

```text
GitHub 匿名访问额度已用完。

预计 13:42 后恢复。
```

如果能确定恢复时间，就不要只写：

```text
稍后重试
```

---

# 四十三、不要通过 PAT 解决 GitHub 限额

v2.1.0 不增加：

```text
GitHub Token
GitLab Token
Gitee Token
OAuth
账号登录
```

公开知识库 Reader 不应该要求用户配置 Token 才正常使用。

---

# 四十四、可选的静态索引增强

如果实现非常干净，可以支持优先读取：

```text
.tensornote/index.json
```

作为已发布 TensorNote 知识库的快速索引。

流程：

```text
尝试读取静态 index
        ↓
存在 → 直接使用
        ↓
不存在 → Provider API fallback
```

这样可以进一步降低 GitHub / GitLab / Gitee API 请求量。

但是：

> 这是增强项。

如果需要大规模重新设计 Publishing Pipeline，不要让它阻塞 v2.1.0。

v2.1.0 必须优先完成：

```text
缓存
重复请求控制
限额提示
```

---

# 四十五、GitLab Provider

使用 GitLab 官方公开 Repository API。

需要正确处理：

```text
recursive tree
pagination
default branch
ref
raw files
binary assets
```

公开 Repository 不要求用户 Token。

注意 GitLab Group 可能多层嵌套。

项目 ID / path 必须正确 URL encode。

---

# 四十六、Gitee Provider

使用 Gitee 公共 Repository API。

需要支持：

```text
repository metadata
branch/ref
recursive tree
blob/content
binary assets
```

同样不要求用户配置 Token。

开发时必须实际验证：

* 浏览器 CORS；
* API 返回结构；
* 分页；
* recursive tree；
* Unicode 路径；
* 中文文件名。

如果某个 raw endpoint 存在浏览器 CORS 问题：

使用该平台官方公开 API 的可行路径。

不要通过第三方代理绕过。

---

# 四十七、远程错误提示统一

用户不需要看到：

```text
403
404
422
CORS
JSON parse
```

这样的裸错误。

统一映射：

```text
仓库不存在或不是公开仓库
分支 / Ref 不存在
平台访问额度已用完
当前网络无法访问 GitLab
无法读取仓库文件树
Repository 文件树过大
```

同时保留开发日志中的真实错误。

---

# 四十八、GitHubOpenPage 重构

当前：

```text
GitHubOpenPage
```

已经不够通用。

建议重构为：

```text
RemoteWorkspaceOpenPage
```

或类似名称。

支持：

```text
GitHub
GitLab
Gitee
```

---

# 四十九、分享 URL 采用通用 Remote Route

新分享 URL 不要只编码 GitHub owner/repo。

建议：

```text
/open/remote
```

携带：

```text
provider
repository/project
ref
note
revision（可选）
```

例如语义：

```text
provider=gitlab
project=group/subgroup/project
ref=main
note=self-attention
```

必须 URL encode。

---

# 五十、旧 GitHub 分享链接兼容

当前已有类似：

```text
/open/github/:owner/:repo
```

的链接不能直接全部失效。

保留旧路由。

内部转换为新的：

```text
RemoteRepositoryLocation
```

再走新 Provider。

这样旧分享链接继续能打开。

---

# 五十一、分享界面大幅精简

当前：

```text
PublishDialog
```

内容明显过多。

v2.1.0 用户界面改名为：

```text
分享知识库
```

代码如果合适可以同步：

```text
PublishDialog
→ ShareDialog
```

但不要为了名字进行不必要的大范围重构。

---

# 五十二、在线知识库分享界面

默认只需要：

```text
分享知识库

GitHub · Aaron/Notes

分享链接

[ https://...                        ] [复制链接]

当前链接将打开：
Self Attention

                         [打开链接]
```

复制按钮必须是视觉主操作。

---

# 五十三、分享当前笔记

如果用户当前位于：

```text
/notes/:noteId
```

默认生成：

> 当前笔记分享链接。

如果位于知识库 Overview：

默认生成：

> 知识库入口分享链接。

---

# 五十四、默认分享链接跟随当前 Ref

默认链接：

```text
provider
repository
ref
note
```

这样仓库后续更新后：

同一个链接仍然展示该分支最新内容。

这应该是普通用户默认行为。

---

# 五十五、固定版本放到“更多选项”

保留可复现分享的价值。

但不要再同时在主界面展示两大块链接。

在：

```text
更多选项
```

中提供：

```text
□ 固定到当前版本
```

开启后：

分享链接加入当前：

```text
revision / commit
```

如果 Provider 无法获得可靠 revision：

隐藏此选项。

---

# 五十六、删除旧分享弹窗内容

从主分享 UI 删除：

```text
Fork
Download
Open in Desktop
Open in TensorNote Badge
Compatibility Badge
Readiness
环境说明
执行信任检查列表
Publication Workflow 提示
```

这些不应该阻塞用户：

> 复制一个链接。

---

# 五十七、本地知识库分享

本地知识库不能凭空生成公网链接。

打开分享弹窗时显示简单说明：

```text
这是一个本地知识库。

TensorNote 不会自动上传你的文件。

如果需要分享，请先将知识库托管到
GitHub、GitLab 或 Gitee，
再通过“打开在线知识库”打开并复制分享链接。
```

不要重新增加：

```text
自动 Git 上传
账号绑定
发布向导
```

---

# 五十八、最近打开支持三个远程平台

Recent Workspace 重新打开逻辑必须支持：

```text
local
github
gitlab
gitee
```

删除：

```text
bundled
```

产品路径。

---

# 五十九、Sidebar 来源标识同步更新

当前 Sidebar 仍存在：

```text
Built-in
GitHub
Local
```

这样的硬编码。

改成统一 helper：

```text
formatWorkspaceSource()
```

输出：

```text
本地
GitHub
GitLab
Gitee
```

不要多个组件各自写一套：

```ts
type === 'github' ? ...
```

---

# 六十、用户界面逐步使用“知识库”

v2.1.0 用户可见文案优先使用：

```text
知识库
```

例如：

```text
打开知识库
新建知识库
切换知识库
最近打开的知识库
分享知识库
正在打开知识库
```

内部：

```text
WorkspaceProvider
WorkspaceSession
WorkspaceStore
```

继续保留。

不要为了中文文案重命名整个工程 API。

---

# 六十一、首页不需要大段产品介绍

首页顶部可以保留一句轻量说明：

```text
打开知识库，继续你的工作。
```

或者：

```text
Markdown 主体笔记，推导与实验按需展开。
```

不要重新加入大面积 Marketing Hero。

用户打开桌面软件首先要：

> 找到自己的知识库。

---

# 六十二、视觉要求

首页和 Modal 延续 v2.0 风格。

要求：

* 不使用强渐变；
* 不使用大面积阴影；
* 不做 SaaS Dashboard；
* 不堆砌卡片；
* 操作层级清晰；
* 左右区域对齐；
* 表单标签清楚；
* 提示文字轻量；
* Button 高度统一；
* Modal 最大宽度合理；
* 键盘焦点可见；
* Light / Dark 均正常。

---

# 六十三、Modal 统一

优先复用当前：

```text
ModalSurface
Button
```

等已有 UI 基础组件。

不要为：

```text
新建知识库
打开在线知识库
分享
```

分别实现三套完全不同的 Modal 机制。

---

# 六十四、Loading

以下操作需要清楚 Loading：

```text
打开本地知识库
创建知识库
打开在线知识库
重新打开 Recent
```

例如：

```text
正在创建知识库…
正在读取 GitLab 知识库…
```

Loading 时：

防止重复提交。

---

# 六十五、错误位置

Modal 内产生的错误：

尽量显示在 Modal 内。

不要所有错误都跑到首页顶部全局 Alert。

例如：

```text
该目录已经存在
GitHub Repository URL 无效
指定分支不存在
```

直接显示在对应操作附近。

---

# 六十六、新建知识库测试

至少覆盖：

```text
合法名称
空名称
非法字符
已有同名目录
选择父目录后路径预览
取消 picker
成功创建
Manifest 创建
notes 创建
assets 创建
创建后自动打开
Recent 记录
```

Desktop 和 Web 分开测试能力边界。

---

# 六十七、在线 URL Parser 测试

至少：

GitHub：

```text
https://github.com/foo/bar
https://github.com/foo/bar.git
```

GitLab：

```text
https://gitlab.com/foo/bar
https://gitlab.com/foo/group/bar
https://gitlab.com/foo/group/bar.git
```

Gitee：

```text
https://gitee.com/foo/bar
https://gitee.com/foo/bar.git
```

以及：

```text
错误 Host
http
空 URL
非 Repository URL
```

---

# 六十八、Remote Provider 测试

使用 Mock Fetch。

不要让单元测试依赖真实公网。

覆盖：

```text
default branch
custom ref
repository tree
Markdown
binary asset
404
invalid ref
rate limit
pagination
Unicode path
cache hit
cache miss
```

---

# 六十九、GitHub Rate Limit 测试

模拟：

```text
403
X-RateLimit-Remaining: 0
X-RateLimit-Reset: ...
```

验证最终用户文案包含：

> 明确恢复时间。

同时验证：

重复打开同一个仓库时：

不会无条件再次发送全部 metadata/tree 请求。

---

# 七十、分享测试

覆盖：

```text
GitHub Workspace
GitLab Workspace
Gitee Workspace
local Workspace

当前 Note
Overview
默认 branch link
固定 revision link
copy success
clipboard fallback
```

---

# 七十一、Host Badge 测试

Desktop：

```text
Desktop / 桌面版
```

Web：

```text
Web / Web版
```

并验证：

```text
使用说明
```

链接正确。

---

# 七十二、Responsive 验收

宽屏首页：

```text
Recent | Actions
```

中等宽度：

合理压缩。

手机：

单列。

在线知识库 Provider 选择在窄屏不能溢出。

路径预览长路径必须：

```text
wrap
或
ellipsis + title
```

不能撑破 Modal。

---

# 七十三、版本更新

本任务最终版本：

```text
2.1.0
```

检查并同步所有真实版本来源，例如：

```text
package.json
src/version.ts
Tauri config
Cargo metadata
Release validation
```

以当前实际结构为准。

---

# 七十四、文档更新

更新：

```text
README.md
README.en.md
docs/zh-CN/USER_GUIDE.md
docs/en/USER_GUIDE.md
```

重点更新：

```text
首页知识库入口
新建本地知识库
打开在线知识库
GitHub / GitLab / Gitee
Web / Desktop 标识
分享链接
```

删除：

```text
AI Learning Notes
```

说明。

---

# 七十五、Release Notes

新增：

```text
docs/releases/v2.1.0.md
```

如项目保持双语 Release Notes：

同时增加英文版。

内容重点：

```text
Redesigned knowledge base home
Create local knowledge base
GitHub / GitLab / Gitee support
Simplified sharing
Remote repository cache
Improved GitHub rate-limit handling
Host identity badge
Removed built-in AI Learning Notes
```

---

# 七十六、不要创建正式 Release

完成开发后：

可以更新版本文件。

但不要自动：

```text
git tag v2.1.0
GitHub Release
Updater release
正式部署 Pages
```

除非用户后续明确要求。

---

# 七十七、构建检查

每个较大阶段完成后运行：

```bash
pnpm test
pnpm lint
pnpm build
pnpm build:web
```

涉及 Desktop Host / Rust：

运行：

```bash
pnpm check:desktop
```

必要时：

```bash
pnpm build:desktop:web
```

实际 script 以最新 `package.json` 为准。

---

# 七十八、推荐实施顺序

不要一次性修改所有模块。

建议：

## Phase 1

首页布局重构：

```text
删除 AI Learning Notes
删除 GettingStarted
Recent + Actions 左右布局
Host Tag + 使用说明
```

确保已有本地/GitHub打开仍正常。

---

## Phase 2

真正实现：

```text
新建本地知识库
```

包括：

```text
Web
Desktop
Manifest
目录初始化
自动打开
```

---

## Phase 3

在线知识库统一入口：

```text
OpenOnlineWorkspaceDialog
GitHub
GitLab
Gitee
```

加入 Provider 和 URL Parser。

---

## Phase 4

远程知识库可靠性：

```text
cache
rate limit
recent reopen
remote trust
```

---

## Phase 5

分享弹窗精简：

```text
ShareDialog
通用三平台分享链接
固定版本高级选项
```

---

## Phase 6

文案、CSS、测试和文档清理。

---

# 七十九、最终首页验收效果

Desktop：

```text
TensorNote   [Desktop]   使用说明 ↗


打开知识库，继续你的工作。


最近打开                         开始

Transformer Notes               打开本地知识库
~/Documents/...                  选择已有 Markdown 知识库
                        本地
                                新建本地知识库
Deep Learning                   创建一个新的 TensorNote 知识库
github.com/...
                      GitHub    打开在线知识库
                                从 GitHub、GitLab 或 Gitee 打开
Research Notes
gitlab.com/...
                      GitLab
```

Web：

```text
TensorNote   [Web]   使用说明 ↗
```

同样结构。

但视觉主操作可以偏向：

```text
打开在线知识库
```

---

# 八十、最终产品流程

### 本地已有知识库

```text
首页
↓
打开本地知识库
↓
选择目录
↓
进入 TensorNote
```

### 新知识库

```text
首页
↓
新建本地知识库
↓
名称
↓
选择父目录
↓
路径预览
↓
创建
↓
自动打开
```

### 在线知识库

```text
首页
↓
打开在线知识库
↓
GitHub / GitLab / Gitee
↓
Repository URL
↓
可选 Ref
↓
打开
```

### 分享

```text
知识库
↓
分享
↓
复制分享链接
```

用户不应该需要理解：

```text
Provider
Deployment
Publication
Revision Trust Model
Runtime Lease
```

这些属于内部实现。

---

# 八十一、本版本最终判断标准

v2.1.0 完成后，应满足：

* 首页不再存在 AI Learning Notes；
* 首页第一眼能看到最近知识库；
* 三个核心知识库入口明确；
* “新建”真的创建一个知识库；
* GitHub / GitLab / Gitee 都可打开公开知识库；
* GitHub 重复打开不会持续浪费匿名 API quota；
* API quota 用尽时能显示恢复时间；
* 最近记录支持本地和三种在线来源；
* 分享窗口第一眼只有一个清晰的“复制链接”主操作；
* Web / Desktop 标识紧邻 TensorNote 品牌；
* 使用说明入口清楚；
* 不重新增加 2.0 已删除的大型平台功能；
* Sidecar 和 Jupyter 核心行为没有回归。

---

# 八十二、核心原则

v2.1.0 的关键词不是：

> 更多功能。

而是：

> **让用户从启动 TensorNote 到进入自己的知识库这条路径变得完整、自然、可靠。**

2.0 解决：

> TensorNote 到底是什么。

2.1 应解决：

> 用户怎样最自然地开始使用它、打开自己的内容，并把内容分享给别人。

请严格围绕这个范围实施。
