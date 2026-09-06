# TensorNote 接管审计与当前开发计划

> **2026-09-06 最新发行决定（优先于下方历史快照）：** 用户明确授权直接发布 GitHub 社区版，先保证在线/本地 Web 与 Desktop 可用，不以付费平台证书或应用商店发行作为前提。Tag 内 `release-policy.json` 固定 `github-community` 渠道：平台签名可选、Updater 签名必须。旧文中“缺 Apple/Windows 证书禁止所有 Tag”的门仅适用于未来 `trusted-desktop` 渠道，不阻止本次社区发行。发布执行、真实平台覆盖和回滚以 [RELEASE_MATRIX](RELEASE_MATRIX.md) 为准；公开状态须实时查询 GitHub。新版中英文用户手册见 [中文](zh-CN/USER_GUIDE.md) / [English](en/USER_GUIDE.md)。

更新：2026-09-06。审计基线：`31135e12c91aaf4e83b961c6b650d12d681bcb9f`。

本文把交接遗留项、历史编辑器待办和本次白绿简洁样式需求整理为可执行队列。它是当前工作的入口；历史阶段记录仍见 [Roadmap](ROADMAP.md)，公共契约仍以 [Platform Contracts](PLATFORM_CONTRACTS.md) 为准，发行操作仍以 [Release Matrix](RELEASE_MATRIX.md) 为准。本文中的“计划”不表示功能已实现或版本已发布。

## 最新交付：v1.6.1 GitHub 社区版

2026-09-06 已公开 [v1.6.1](https://github.com/AaronChou313/tensornote/releases/tag/v1.6.1)，Pages 同步部署。已完成本次白绿交互与共享侧栏修复、首次使用分版引导、Local Web 独立启动包、Git Bridge 路径修复、中英文 README/主手册、最新真实快照与 Agent Skill 分发。正式 Tag 为 `0c6bba3`；CI/Release、20 项资产哈希、7 个更新签名与 11 个更新目标验收通过，详情见 [交接说明](AGENT_HANDOFF.md)。

R1 付费平台证书不属于本次社区发行前置；R2 私钥备份恢复不因签名通过而自动完成。干净平台安装、公共 Binder 完整执行、下一公开 Patch 的真实升级闭环及后续编辑/Git Remote Sync 候选继续保留，不宣称已完成。`v1.6.0` 为已撤回 Draft 的不可变候选 Tag，不公开。

以下审计表、任务编号和设计提案保留当时状态；遇到发行状态冲突，以本节和当前交接说明为准。

## 1. 初始阶段与核验结果（历史审计）

项目已完成稳定 Web 平台和 Desktop 首发候选的主要源码建设，处于 **v1.6 发行收尾与产品体验打磨阶段**。当前应完成可信分发、真实安装验证和使用体验闭环；没有需要立即启动 v2 的证据。

| 项目 | 本次核验结果 | 意义 |
| --- | --- | --- |
| 本地与 GitHub main | 均为 `31135e1`；审计开始时工作树干净 | 交接基线一致 |
| 源码版本 | `1.6.0` | 候选源码版本，不代表公开安装版 |
| 最新公开稳定版 | `v1.0.0` | 不补造 v1.1～v1.5 的历史 Tag |
| 最新 main CI | [34010250744](https://github.com/AaronChou313/tensornote/actions/runs/34010250744)，成功 | 新于旧交接文档中的 CI 快照 |
| 最新成功发布演练 | [34007677666](https://github.com/AaronChou313/tensornote/actions/runs/34007677666)，成功 | 无 Tag Artifacts，不等于正式 Release |
| 打开的 Issue / PR | 均为 0 | 文档待办尚未形成外部工单 |
| GitHub Secrets 名称 | 仅两个 `TAURI_SIGNING_*` 项 | Apple / Windows 正式签名门仍阻塞 |

只检查了 Secret 名称和更新时间，没有读取值；证书申请状态、离线备份可恢复性和干净机器安装结果未在本次确认。

### 本次本地检查

| 检查 | 结果 |
| --- | --- |
| `pnpm check` | 42 个测试文件、143 项测试通过；ESLint、TypeScript、Local Build 通过 |
| `pnpm test:performance` | 3 项性能测试通过 |
| `pnpm audit --prod --audit-level high` | 未发现已知漏洞，以当次审计数据库为准 |
| `pnpm build:web` | 通过，Static 产物无 Tauri IPC |
| `pnpm check:desktop` | 本机 Rust fmt / clippy / tests 通过 |
| `pnpm validate:release -- --tag v1.6.0` | 通过；这是结构校验，不会创建 Tag，也不证明签名资格齐备 |
| 浏览器抽查 | 当前 Local Web 的 Home、Built-in Workspace、Self-Attention 阅读页 |

构建仍提示部分压缩后 Chunk 超过 500 kB，涉及笔记渲染、Mermaid 等依赖。记录为性能分析项，不能仅凭该警告认定运行缓慢，也不能通过提高警告阈值冒充优化。

本轮是关键链路和代表性实现审计，不是逐行安全审计；未重新执行完整 Desktop 安装矩阵、真实远程 Cell 执行或全部明暗/窄屏交互验收。

## 2. 已理解的代码结构与维护边界

| 领域 | 实现入口 | 后续修改原则 |
| --- | --- | --- |
| 路由与宿主 | `src/App.tsx`、`src/host/`、`src-tauri/src/` | 同一 React 核心；原生操作通过受限 HostAdapter |
| Workspace | `src/workspace/`、`src/store/useWorkspaceStore.ts` | Provider 负责真实文件 I/O；未来 Schema 只读降级 |
| 知识索引 | `src/content/` | Markdown、Assets、Manifest 是事实来源，索引可重建 |
| 编辑与恢复 | `NoteEditor.tsx`、`src/commands/`、`src/recovery/` | 保留 Frontmatter、单次 Undo、预期 Stat 与冲突保护 |
| 多窗格 | `AppShell.tsx`、`src/workbench/` | 焦点 Pane 决定命令上下文；切换前保护未保存内容 |
| 计算 | `src/compute/`、`src/jupyter/` | Connector 获得 Lease，Provider 管理 Kernel；权限和 Revision trust 独立于连接成功 |
| 扩展 | `src/extensions/` | 复用注册和清理机制，不把本地 JS 描述成沙箱 |
| 分发 | `.github/workflows/release.yml`、`scripts/*release*` | 同 Tag、同提交、签名失败关闭、Draft 验收后公开 |
| 样式 | `src/styles.css`、`src/components/ui/`、各页面组件 | 先整理已有规则和 Token，避免继续在文件末尾叠加覆盖 |

核心实现与交接描述基本一致：已有懒加载、Provider 能力门、执行策略、Revision trust、Owned Runtime 和跨平台流水线。新 UI 不需要修改公共契约，也不需要更改 Workspace 格式。

## 3. 执行顺序

```text
接管审计完成
  ├─ R：签名资格与发行准备 → v1.6.0 Draft → 安装验收 → 公开发行
  │                                              └─ V：v1.6.1 更新闭环
  └─ U：白绿设计提案 → 基础控件 → 工作台 → 阅读/编辑/计算体验
                                                  └─ E：编辑增强
发行与更新闭环 + 用户任务证据 → 后续 v1.x 立项；必要时才做 v2 RFC
```

证书等待期间可以推进 U 系列。若 UI 修改进入 v1.6 候选，必须以修改后的新提交重新跑全部发行门和矩阵演练；旧演练不能覆盖新代码。若保持 v1.6 候选冻结，则 UI 作为后续兼容 v1.x 独立变更交付，不预先承诺版本号。

### R：v1.6 正式发行，P0

| ID | 工作与责任 | 依赖 | 完成标准 |
| --- | --- | --- | --- |
| R1 | 维护者取得 Apple Developer ID / 公证资格、Windows 受信签名证书，并安全配置 7 个平台 Secret | 外部账户与证书 | Secret 名称齐全，签名实际有效；不得将证书或密码写入文档 |
| R2 | 维护者确认 Updater 私钥及密码有离线加密备份并验证恢复；开发者核对公钥配置 | 安全存储 | 留存不含密钥的恢复验证结论；不轮换现有公钥绕过问题 |
| R3 | 开发者冻结候选，执行共享、性能、审计、Static、Rust 和 Release validator；重跑跨平台 dry run | 候选提交确定 | 每项结果绑定 commit/run；失败项处理后重验 |
| R4 | 创建 annotated Tag，检查 Workflow Draft、Manifest、SHA256SUMS、Updater JSON/签名 | R1～R3，正式发布授权 | 所有资产绑定同一 Tag/commit，版本一致 |
| R5 | 平台测试者验证安装与主流程；维护者公开 Draft | R4 | 按 RELEASE_MATRIX 验证签名、公证、安装、启动、Workspace、Lab、About、更新入口 |
| R6 | 开发者同步稳定版 Badge、Release Note、路线状态和真实 Desktop 截图 | R5 | 文档只对已验收版本写“正式发布” |

发行失败时保留候选与失败证据，按递增 Patch 修复；不移动已公开 Tag。当前 R1/R2 尚不能标记完成。

### V：验证债务与维护闭环，P1

| ID | 工作 | 完成标准 |
| --- | --- | --- |
| V1 | 干净 Apple Silicon、Intel macOS、Windows x64、Linux x64 安装矩阵 | 安装、卸载、重装；Linux AppImage/Deb/RPM 对应支持环境；记录 OS、架构、资产校验、结果 |
| V2 | Native Workspace / Git | 打开、新建、保存、外部冲突、草稿恢复、拖放、文件关联、Reveal、Stage/Commit；使用临时测试 Workspace |
| V3 | Runtime Assistant | 无环境→计划审核→创建最小环境→启动→连续两个 Cell→停止/退出；覆盖 uv/venv/Conda 支持路径及取消/失败清理 |
| V4 | 独立公开 Workspace 发布 | v1.6 Tag 可用后验证模板、Pages、默认笔记、Badge、固定 Revision、Fork/下载和 Desktop 深链 |
| V5 | BinderHub 真实闭环 | 固定 Revision→ready→Kernel WebSocket→多 Cell→Lease 清理；容量不足记阻塞，不记成功 |
| V6 | v1.6.0→v1.6.1 自动更新 | 第二个签名版本验证下载、校验、安装、重启和用户内容不变；“无更新”不等于升级成功 |
| V7 | 工单、版本索引与支持入口 | 将队列转成可追踪 Issue/Milestone，建立聚合 Changelog；每项有证据和版本归属 |

证据表至少包含：任务 ID、commit/tag、平台、测试数据、前置条件、步骤、预期、实际、通过/失败/阻塞、日志或截图位置。失败发现应回流修复任务，不能仅在文档中勾选。

## 4. 白色主调、淡绿色点缀：设计优化提案

状态：首批 Home / Workspace 优化已实现，其他区域仍为待实施提案；具体进度见文末。服务于长期阅读、写作和运行实验的桌面工作场景；工作台以操作效率为主，笔记以阅读理解为主。沿用现有品牌和 Logo，强化白色留白、轻边界、淡绿选中态与稳定的文字层级。

### 当前问题与改进落点

| 观察证据 | 优化方案 | 验收重点 |
| --- | --- | --- |
| Home 大标题、Logo 与留白让部分入口落到首屏下方 | 缩短启动页品牌区；打开本地 Workspace 为主操作，示例和 GitHub 为次操作；最近 Workspace 前移 | 1280×720 下无需滚动即可找到主要来源入口与最近列表起始项 |
| Workspace 概览重复品牌展示，标题和统计占较大高度 | Workspace 名称、说明、来源组成紧凑页头；统计改为轻量横排，阅读入口上移 | 首屏可直接选择至少 3 篇笔记；保留来源和只读状态 |
| 阅读页标题区占比较高，正文很晚开始 | 标题、摘要、标签压缩为清晰文档头；正文保留舒适行高和适宜行宽 | 1280×720 下能看到第一节完整短段落；长标题不裁切 |
| `styles.css` 5,102 行且多处覆盖同类选择器 | 建立 Token→控件→Shell→内容→功能区样式组织，按区域迁移并删除确认无效的旧规则 | 不新增末尾补丁层；每次迁移有前后截图，暗色不回归 |
| 导航和操作中英混排、图标入口依赖 Tooltip | 确立中文界面术语表，保留 Workspace / Python / Git 等必要专名；统一 Label/Tooltip/快捷键 | 相同动作同名；关键错误给出具体恢复动作 |
| 命令面板代码使用自建 dialog，未见焦点圈定及方向键选择逻辑 | 专项核验键盘行为，复用已有 Dialog 基础设施补齐焦点、返回位置和选择状态 | Tab 不逃逸；Esc 关闭并返回触发点；方向键选择、Enter 执行；IME 不误触 |

### 色彩、排版与控件规则

- 白色 `#FFFFFF` 为阅读和工作区主表面；浅中性灰作为侧栏、输入框与代码周边的辅助表面。淡绿只用于选中、Hover、轻提示和局部品牌标识，避免大面积绿色背景。
- 沿用已有 `--accent: #4F8061` 作为按钮/链接深绿，`--accent-soft: #E4F1E7` 和 `--accent-pale: #F1F8F2` 作为淡绿底色；正文沿用 `--ink: #202923`。候选色值需在真实组件组合中测量对比度后定稿。
- 浅绿不是正文文字色。普通文字对比度目标至少 4.5:1，主要控件边界和焦点指示至少 3:1；错误、警告、运行中分别保持独立语义并有文字或图标说明。
- 系统字体栈优先，支持中英文和离线；界面主文字建议 14px，辅助信息 12～13px，正文 16～17px、行高 1.7～1.8，文档标题 32～40px。缩放 200% 时保持内容可用。
- 以 4/8px 间距节奏统一密度；普通控件圆角 8px、面板 12px、对话框 16px。边框分区为主，阴影集中用于浮层，不让每一层都成为卡片。
- 主操作采用深绿实心按钮；次操作用轻边框或文字；图标按钮统一尺寸与命名，触屏命中区目标 44px。运行、停止、保存不能仅靠颜色区分。
- 动效限于展开、切换和状态反馈，约 120～180ms；尊重 reduced-motion；避免 Hover 缩放造成工作台跳动。
- 浅色作为本次设计主验收面；保留现有暗色设置与用户偏好，所有 Token 都提供暗色映射。

### 页面与交互安排

| 页面/区域 | 改动范围 | 必须保留的行为 |
| --- | --- | --- |
| Home | 紧凑欢迎区、来源选择、最近打开；GitHub Ref 放入次级选项 | 宿主 capability 决定入口，加载/取消/错误可见 |
| Shell / Sidebar | 统一导航行高、活动项、收起入口；来源信息集中显示 | 文件树、搜索、最近笔记、扩展；未保存状态保护 |
| Tabs / Split | 淡绿活动 Tab，明确焦点 Pane，稳定关闭/拆分命中区 | 独立历史、滚动和焦点上下文；不开第二套状态 |
| Note / Editor | 更紧凑文档头、轻量属性区、稳定工具栏、可读代码与输出 | 原始 Markdown、Frontmatter、撤销和保存冲突语义 |
| Settings / Runtime | 分组表单、清晰连接状态、分步环境计划与进度 | Secret 分离、计划审核、确认短语、Owned 清理 |
| Lab | 固定运行工具条，Cell/输出分层，失败就近显示恢复动作 | 执行权限、Revision trust、取消、Restart/Interrupt |
| Knowledge / Database / Git | 减少重复卡片，采用适合扫描的列表/表格密度 | 只读视图、查询语义、Diff 与 Stage/Commit 显式操作 |
| 窄屏 | 侧栏抽屉，编辑工具收进溢出菜单；双 Pane 的活动内容可切换 | 状态不丢失、不静默关闭 Pane；表格/代码局部滚动 |

### U：建议拆分的实施批次

| ID | 范围 | 依赖 | 验收 |
| --- | --- | --- | --- |
| U1 | 记录正式 DESIGN.md；提取颜色、排版、间距与控件 Token | 设计方向定稿 | 样式基线、明暗状态表和 Button/Input/Dialog/Tooltip 一致 |
| U2 | Home + Workspace 概览 | U1 | 首屏来源与阅读入口可达，空/忙/错状态完整 |
| U3 | Sidebar、TopBar、Tab、Split、命令面板键盘行为 | U1 | 全键盘操作、未保存保护、双 Pane 状态与窄屏无回归 |
| U4 | Note、Editor、Properties、Lab | U3 | 中英文长内容、公式、Mermaid、表格、长代码、输出可读 |
| U5 | Settings、Runtime、Remote Compute、分享、Knowledge/Database/Git | U1、U3 | 权限说明可理解，进度/失败/重试完整，Secret 不泄漏 |
| U6 | 清理迁移后的旧 CSS、浏览器回归、真实截图与发布说明 | U2～U5 | Home/Workspace/Note/Editor/Split/Settings/Lab 明暗及 390/768/1280/1440px 通过 |

每批单独形成可审查变更。先样式基础与低耦合页面，再进入状态复杂的编辑器和计算界面；不把样式重构与 Provider/Runtime 逻辑重写混在一起。

## 5. 历史待办与后续 v1.x 功能

旧路线中的 `v0.5.x/v0.6.x/v0.7+` 编辑增强属于历史愿景，不能继续当作当前版本承诺。现有 Editor Extension 注册能力已经存在，不重复实现；补全源、工具栏贡献等具体增强需要逐项界定。

| 优先顺序 | 候选 | 最小交付范围与验收 | 排期状态 |
| --- | --- | --- | --- |
| E1 | Slash Commands、最近命令 | 复用 CommandRegistry；当前 Pane 上下文；中文输入法、键盘选择、只读禁用、单次 Undo | U3 后优先候选 |
| E2 | WikiLink / Tag 补全、笔记模板插入 | 复用知识索引与现有格式；处理别名歧义、链接转义、Frontmatter 保留 | E1 后候选 |
| E3 | 可配置工具栏、选区工具条、智能粘贴 | 先验证用户高频动作；偏好存 Settings，粘贴仍生成 Markdown | 未排期 |
| E4 | Live Preview | 保持 Source Mode 完整可用，验证复杂 Markdown 与选区映射 | 未排期，独立提案 |
| F1 | 原生文件事件监听 | 类型化 watcher，事件合并、退出清理、Symlink、外部冲突；保留合理降级 | 发行闭环后候选 |
| F2 | 依赖向导 / GPU 预设 | 展示依赖计划、锁文件和平台范围；显式授权安装及失败恢复 | 先做 ADR，不承诺自动 CUDA |
| F3 | Git Remote Sync | 凭据安全存储、Fetch/Pull/Push、分支/冲突/恢复；禁止任意 Shell | 先做 ADR 与最小安全模型 |
| F4 | 持久化实验输出 | 定义可移植结果、环境指纹、来源和冲突；只读来源结果另存 | 先做格式提案 |
| F5 | Server-mounted Workspace | 新 Provider/Server Adapter、认证、目录权限和隔离 | 未排期 |
| F6 | Extension 分发 / 公共知识目录 | 分别定义签名隔离撤回与元数据审核；目录不托管内容或 Token | 未排期，两项独立立项 |
| F7 | 更多 Remote Connector | 依据失败样本扩展 OAuth/CORS/WebSocket 矩阵与 Lease 所有权 | 未排期 |

暂不建设自营 GPU、中心化内容托管、共享作者 Token、默认远程执行、完整 Python/ML 安装包或第二套 Desktop UI。v2 只有在兼容 v1 的可选扩展无法解决真实问题时才通过 RFC、ADR、迁移/回滚和兼容矩阵启动。

## 6. 工程债务与完成定义

- 文档维护：`ARCHITECTURE.md` 开头仍称覆盖到 v1.0，但正文已包含 v1.6；PRODUCT.md 的能力摘要偏旧。按已实现能力同步当前摘要，保留历史段落的时间语境；不得把“当时未支持”误写成“现在未支持”。
- 性能：先测冷启动、首次笔记、Mermaid/Lab 首开与大 Workspace 刷新，区分下载/解析/渲染耗时，再决定拆包或延迟加载；沿用当前 1,000/10,000 笔记预算。
- 自动化：当前测试和三平台 CI 是基础；增补能捕获真实任务失败的浏览器回归，不为颜色、边距或实现细节堆单元测试。
- 所有应用改动运行 `pnpm check` 和 `git diff --check`；加载/索引改动加性能门；Host/Desktop 改动增加 Rust、Desktop Build 与 Static 边界；候选发行执行完整矩阵。
- 每项交付同时说明改了什么、用户行为如何改变、验证证据、未覆盖环境，以及是否 commit/push/tag/release。不能把计划文档、源码通过或 dry run 成功视为正式发行完成。

### 2026-09-06：首批样式实现

- U1 基础部分完成：建立根目录 `DESIGN.md`，将现有明暗主题提取到 `src/styles/tokens.css`；增加 on-accent，修正共享主按钮暗色文字对比度。Input/Dialog/Tooltip 的完整统一仍待后续批次。
- U2 首批完成：Home 改为紧凑白底启动页、最近入口前移；Workspace 概览改为紧凑身份区、横排统计、连续文档列表，保留发布者 Logo、来源和只读语义。主要入口文案统一为中文。
- `pnpm check`：42 个测试文件、143 项测试、Lint、TypeScript / Local Build 通过；`pnpm build:web` 与 Static IPC 检查通过。构建仍有原有的大 Chunk 警告。
- 浏览器验证：Home 的 390/768/1280/1440px 布局；概览的桌面/390px 布局；Home/概览明暗主题，阅读页深色回归，设置主题切换；无效 GitHub 输入提示、表单 Tab 焦点与示例打开正常。未执行本地目录写入或真实 Jupyter。
- 文字/主按钮正常与 Hover 色组合的脚本对比度测量均达到 4.5:1；暗色主按钮实际 computed style 已核验。该结论不代表所有历史组件已完成可访问性审计。
- 设计检测已执行：旧全局 CSS 仍有两处粗侧边线、历史圆角与新规范不一致等提示，留给 U3～U6 逐区处理，不以扩张规范掩盖问题。
- 尚未 commit / push / tag / release；原有接管文档改动保留。下一工作包为 U3 导航、标签、分栏与命令面板；外部 R1/R2 依赖仍未解除。

### 2026-09-06：U3 交互稳定性首批

- 浏览器复现命令面板 Shift+Tab 将焦点移到背景扩展按钮；命令面板与设置统一接入 Radix Dialog，支持焦点圈定、Esc、背景隔离和关闭后焦点恢复。
- 命令面板新增方向键选择、Enter 执行、组合输入保护、空结果提示和键盘说明；关闭完成后才执行命令，避免打开下一个弹窗时抢夺焦点。
- 复现设置打开时 Cmd/Ctrl+P 在背后叠加命令面板；移除 AppShell 重复注册的快捷键，并阻止搜索/命令快捷键穿透当前弹窗。
- 多标签保持稳定宽度与长标题省略；打开/切换标签和侧栏改变宽度时，将活动标签定位在标签条内，不滚动阅读正文。
- 分栏新增当前窗格选择器；阅读区域小于等于 800px 时只显示活动窗格，通过选择器切回另一个窗格；侧栏折叠恢复足够宽度后重新显示双栏，保留内容。
- 窄屏顶栏分组换行，命令面板按可用视口高度滚动；Settings Dialog 高度与外层边距一致。
- 验证：147 项测试通过，其中新增 4 项命令面板交互回归；Lint、TypeScript、Local Build、Static Build 和 IPC 边界检查通过。浏览器走查覆盖多标签、双栏、侧栏开关、390px 窄屏、390×320 矮窗口、1024/1280px 窗口，以及弹窗快捷键衔接。
- 仍待后续：全局旧 CSS 的分区迁移、文件操作菜单、上下文栏与 Lab/Editor 的完整交互矩阵；本批不代表所有界面问题已清零。尚未 commit / push / tag / release。

### 2026-09-06：用户注释修复

- 三组侧栏标题统一为 SidebarSection，清理重复样式和 Files 预留宽度；创建按钮使用正常文档流。
- 标签栏统一垂直居中。浏览器实测三个控件中心均为 92.5px，三组箭头右边缘均为 256px。
- 导航选中状态使用成对 selection 主题变量；深色采用浅薄荷底、深绿文字。已检查截图及 Files 开合。
- 文件操作增加外部点击关闭、Esc 返回焦点、Tab 离开收起及中文标签。只读示例无法验收写入菜单；可写工作区菜单、滚动边缘裁切、上下文栏与 Lab/Editor 仍待推进。
- 未 commit / push / tag / release。

### 2026-09-06：文件菜单、文件弹窗与上下文目录

- 文件操作改用 Radix Dropdown Menu，与现有 Radix 弹窗体系一致；Portal 脱离文件树滚动裁切，自动边缘避让，统一方向键、Esc、焦点返回与菜单到弹窗的交接。移除 TreeItem 中临时的菜单监听逻辑。
- 文件弹窗接入 ModalSurface；写入期间防重复提交和误关闭，Enter 尊重组合输入，错误可被辅助技术读取，重试保留输入，提交时重新检查只读能力。短窗口弹窗允许内部滚动。
- 上下文栏只保留外层视图切换；图谱不再重复，目录不再混入图谱，属性中的 false/0 不再误显示为缺省值。视图按钮提供 aria-pressed 并复用深浅主题选中颜色。
- 浏览器复现目录目标不存在：React 严格渲染期间标题计数递增导致全部锚点意外添加 -1。改为 Markdown AST 阶段确定标题 ID，与索引的 ATX 标题规则一致；覆盖重复标题、代码块、中文、格式文本与重新渲染。
- 验证：155 项测试通过（本批新增 8 项），Lint、TypeScript、Local Build、Static Build 与 IPC 边界检查通过；git diff --check 通过。浏览器在隔离组件页面验证底边菜单向上翻转和弹窗焦点交接，并在实际笔记验证单份图谱、纯目录和目录点击定位。临时验证 HTML 已删除。
- 待续：真实可写 Workspace 的文件操作端到端验收；上下文栏窄屏关闭/焦点以及分栏同篇笔记锚点定位；Lab/Editor 完整交互矩阵。隔离菜单验证不等同于真实文件写入验收。
- 未 commit / push / tag / release；保留原有未提交改动。

### 2026-09-06：稳定候选与 Agent Interface 收尾

- 固定 v1.6.0 兼容范围，补充 HOST_FEATURE_MATRIX，区分浏览器目录、原生目录/Git/Runtime/Updater 和远程 Compute。
- 原生桌面实测发现新建文件失败：系统缺失错误不满足共享层旧文本判断。新增可选 WorkspaceNotFoundError 和原生错误码，保留旧 v1 Provider 兼容，并通过原生 UI 新建、编辑保存、重命名复验。
- 上下文宽屏停靠、窄屏模态抽屉，活动 Pane 目录/源码定位；同篇笔记双栏不再滚错位置或隐藏右侧目录。
- Skill 新增已有知识库维护协议、可合并的 AGENTS 模板、版本化 JSON schema、真实 YAML/路径/链接/前置关系验证和独立安装锁文件。Release 同时打包 Agent Skill，不引入另一套内容格式或通用远程 Shell。
- 本机 Desktop 完成 Owned Jupyter 发现/启动/诊断、双 Cell、重复运行、Restart & Run All 和退出端口清理。
- 详细验收与仍未完成的发行条件见 STABLE_CANDIDATE_VERIFICATION.md。正式签名配置仍缺失，禁止降级签名门或称为已经发布。
- 候选 `1293bb8` 已提交并推送，通过 CI `34019694837` 和完整无 Tag Release 演练 `34019696142`；Chrome 原生目录授权、新建、编辑保存及移动单独验收通过。实际分发 Skill 包在仓库外安装后两套模板严格验证通过。
- 收尾阻塞是正式签名、公证和发行安装矩阵；E/F 后续功能不在本次稳定候选中提前承诺。未创建 Tag 或公开 Release。
