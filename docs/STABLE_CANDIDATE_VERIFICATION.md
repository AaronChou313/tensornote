# v1.6 稳定候选与发行验收记录

更新：2026-09-08。下方分节保留每个候选当时的验收与失败记录，不合并为虚假的同一产物。最新 v1.6.2 已公开，最终结果见文末；平台签名与干净安装覆盖仍以 RELEASE_MATRIX 为准。

## 已执行的本机门

| 验证 | 结果 |
| --- | --- |
| pnpm check | 169 项测试、Lint、TypeScript、Local build 通过 |
| 性能门 | 1,000 / 10,000 笔记预算测试通过 |
| 生产依赖审计 | 无已知漏洞 |
| Rust fmt / clippy / test | 14 项 Rust 测试通过，含原生缺失文件错误回归 |
| Static build | 通过；未打包 Tauri IPC、Native Runtime、Updater |
| Desktop app build | 本机 Apple Silicon `.app` 构建通过；这是开发验收包，不是已公证分发包 |
| Release contracts | v1.6.0 版本、Updater、Workflow、模板一致性通过 |
| Skill quick_validate.py | 通过；隔离 Python 环境提供 PyYAML |
| 两套 Skill 模板 | strict：零错误、零警告 |
| 独立 Skill 安装 | 解压到应用仓库之外，npm ci 安装锁定依赖，课程模板 JSON 验证 ok:true |
| 内置示例 Workspace | strict：零错误、零警告；线性代数和微积分作为 background 保留，库内 prerequisites 均可解析；旧 Lab 缺少 difficulty 为兼容 Info |

## 实际交互证据

- Browser：统一三组侧栏箭头，标签栏控件中心一致，明暗选中态；命令面板键盘与模态焦点；390px 窄屏和矮窗口；Settings 与快捷键互斥；多标签与分栏切换。
- Browser：文件菜单在隔离滚动容器底边自动翻转且不裁切；菜单关闭后再将焦点交给文件弹窗。正式文件写入使用 Desktop 原生 Provider 验收，不把隔离菜单展示冒充写入测试。
- Chrome Local Web：通过系统目录选择器和浏览器读写授权打开隔离课程；新建、编辑、保存、跨目录移动均通过，磁盘内容核对一致。这是独立于 Desktop 的 File System Access API 验收。
- Browser：右上下文栏宽屏停靠不遮盖正文，390×844 窄屏为模态抽屉；Esc 返回原按钮；目录选择后关闭抽屉并显示章节；同篇笔记双栏时只滚动活动栏。修复了旧分栏 CSS 误隐藏右侧目录的问题。
- Desktop：通过原生目录选择器打开隔离课程；新建 Markdown，编辑并用 ⌘S 保存，读取磁盘核对内容；重命名保留文档 ID 和打开标签。
- Desktop：发现现有 Python/Jupyter，启动应用拥有的 loopback Server；Browser access、HTTP、CORS、认证、Kernel 与 WebSocket 诊断通过。
- Desktop：标准库两个 Cell 依次执行，结果 samples 为固定种子序列、mean 为 0.3331；再次运行计数 3/4，Restart & Run All 恢复 1/2，结果一致。退出应用后验收 Server 端口无监听。

## 仍需外部条件与发行验收

- 只检查 GitHub Secret 名称：当前仅有 TAURI_SIGNING 两项，缺少 Apple Developer ID / 公证及 Windows 受信代码签名配置。未读取 Secret 值。
- Updater 私钥可恢复备份须维护者确认；第二个签名 Desktop 版本才能验证真正的跨版本升级。
- 本机开发 `.app` 不代替 macOS Intel、Windows、Linux 干净系统的签名安装、卸载、拖放、文件关联、深链与真实更新矩阵。
- Chrome 的本地目录授权写入已单独通过；公共 Binder 容量、独立公开知识库 Pages 和其他浏览器/操作系统权限流程仍不由该结果替代。
- U/E/F 中未纳入稳定性修复的 Live Preview、Slash/WikiLink 补全、GPU 向导、Git Remote Sync、公共扩展市场仍是后续候选，不在 v1.6.0 作功能承诺。

## 同一候选的远端验证

候选源码与构建配置：`1293bb82f566186287828494793a2342945ca1c3`。后续仅补充验收文档的提交不改变此产物来源。

- [CI 34019694837](https://github.com/AaronChou313/tensornote/actions/runs/34019694837)：verify、macOS/Windows/Linux Desktop build、container 全部成功。
- [Release 演练 34019696142](https://github.com/AaronChou313/tensornote/actions/runs/34019696142)：release-gate、Static Web、container、macOS Apple Silicon/Intel、Windows x64、Linux x64 和 finalize 全部成功；无 Tag，Pages 部署跳过，没有发布 GitHub Release。
- 清单包含 18 个资产，覆盖 Web、Agent Skill、桌面安装包及 Updater 签名。Actions Artifacts 会过期，不能当成永久 Release 链接。
- 从上述流水线下载实际 Skill 包，在仓库外安装锁定 YAML 依赖，两套模板 strict JSON 均为 ok:true、零错误和警告。
- 初次 CI 暴露三处已有悬空 prerequisites；保留为 background 后严格校验通过，Release gate 同步开启 strict。没有降低校验标准。

最新公开稳定版仍是 `v1.0.0`；`v1.6.0` 尚未创建 Tag 或公开 Release。

## 后续桌面视觉回归修复

用户实测发现上述候选的 macOS 侧栏空白：可访问性树包含目录，但实际画面不可见。此前原生 UI 操作通过不能证明该区域视觉正常，`1293bb8` 的旧安装资产不包含此修复。

移除 Sidebar 的 Tailwind translate 工具类与叠加覆盖，统一由组件 CSS 的 transform 管理宽屏显示、主动收起和窄屏抽屉状态。重新构建本机 `.app` 后，使用真实 macOS 截图验证本地 Workspace 的 Overview、笔记页、收起与重新展开；未修改知识内容。169 项测试、Lint、TypeScript 和桌面应用构建通过。新的正式候选必须从包含此修复的提交重新构建，不能沿用旧资产。

## 2026-09-06 GitHub 社区发行与首次使用收尾

本节新增验收对应 `codex/github-community-release` 的后续候选，不回写旧 `1293bb8` 资产。用户已授权 GitHub 直接发布；平台开发者签名不再阻塞社区渠道，Updater 签名仍为必须。

- 新增 Node.js 22 Local Web 独立启动包，包含编译产物、Git Bridge 和中英文手册；启动器限制 loopback Host、GET/HEAD 和应用目录，覆盖路径逃逸、符号链接、错误编码及 SPA 路由测试。
- 首页、Compute、Git 入口按能力提供可折叠指引，阅读/写作不强制配置计算或 Git；用户取消目录选择不再显示失败。
- `pnpm check`：50 文件、173 测试通过，lint 与 Local 构建通过；性能 3 测试通过，生产审计无已知漏洞。
- 本机新版 `.app` 构建通过。Static 构建结果、实际 UI、独立下载包和 GitHub 发布证据在完成后追加。
- README 与主使用说明完成中英文拆分，默认中文；旧专题文档增加新版入口，旧发行证书门标为历史规则。

- Static 生产构建通过并确认无 Tauri IPC；真实 390px 目录抽屉打开/关闭、1280px 侧栏隐藏/恢复可用，宽屏 transform/translate 均为 none。
- 独立 Local Web 包在源码外解压运行，无 node_modules；打开内置 Workspace 成功。概览刷新按现有产品行为返回首页，非服务器 404，手册明确重新打开步骤。
- 同包 Git Bridge 对独立临时 Git 仓库启动、health/status 读取通过；默认 Web Origin 获准。
- Rust fmt/clippy/test 通过；最新本机 app 构建通过。新版 Desktop Overview 与阅读截图实际侧栏可见，不再仅用 AX 元素存在性作为视觉验收。
- 在线首次默认 Profile 改为留空的远程 Jupyter 地址，保留已有配置和旧 Token/Profile 迁移绑定；新增自动测试。

- 独立包实测发现并修复 macOS 路径别名导致 Bridge 根目录误判，新增别名接受/嵌套目录拒绝测试；修复后独立 Bridge health/status 与笔记变更识别实测通过。

## v1.6.1 external-link release correction

- Candidate b53d1e2 passed CI 34026645381 and release dry run 34026646957. All 19 downloaded asset hashes and 7 updater signatures were independently verified against the embedded public key.
- The actual CI macOS app failed to open the help link. The v1.6.0 tag workflow was cancelled and its draft marked superseded. The tag remains unchanged; do not publish that draft.
- v1.6.1 initializes the existing Opener plugin and permits only HTTP(S) URLs with the default application. No file-path or shell permission was added. A real desktop click opened the Chinese guide in Chrome.
- Local checks: 173 tests, lint, Local build, Rust fmt/clippy/14 tests, Desktop app, Static boundary, performance, production audit, skill quick validation, both strict templates, strict bundled workspace validation, and matching-version skill packaging passed.
- Web and Desktop screenshots were recaptured from 1.6.1. Pages retains its main-branch policy and allows the exact v1.6.1 tag; the withdrawn v1.6.0 deployment permission was removed.

## v1.6.1 正式公开验收

- 不可变 Tag：`v1.6.1` → `0c6bba3d9dd6f65faa9debe4ff6f7fd3fbc56000`；[公开 Release](https://github.com/AaronChou313/tensornote/releases/tag/v1.6.1) 于 2026-09-06 13:04 UTC 发布，非 Draft、非预发布、latest。
- [CI 34033833521](https://github.com/AaronChou313/tensornote/actions/runs/34033833521) 和 [Tag Release 34033836481](https://github.com/AaronChou313/tensornote/actions/runs/34033836481) 全部通过。四个桌面架构、Web、Local Web、容器、finalize 和 Pages 部署完成。
- 下载 Draft 全部资产：20 项 SHA-256 与 SHA256SUMS 一致；7 个 Minisign/Updater 签名使用应用内置公钥独立验证通过；11 个 latest.json 平台目标指向该 Release 的准确 GitHub asset API ID，内联签名与对应附件一致。另有两份元数据，公开附件合计 22 项。
- 下载的 Apple Silicon app 实际启动，About 为 v1.6.1；Overview、阅读页的目录真实可见；计算帮助链接打开系统 Chrome。两张 Desktop 文档截图改为这份正式资产的实际画面，来源记录随图更新。
- Chrome 保留的旧 Pages 页面先复现空白侧栏，再普通刷新到新版（无需删除站点数据）；打开示例的 Overview/阅读均恢复目录，收起和重新展开通过。后台窗口截图会滞后，前置窗口后检查实际最终画面。
- 线上 index.html、入口 JS 和 CSS 与此 Tag 的 Static Web archive 逐字节/哈希一致，不能用本地开发截图替代这项部署证据。
- 保留限制：无平台受信开发者签名/公证；非本机平台仅构建覆盖；公共 Binder 完整执行和跨版本升级未冒充通过。首次社区发行不再以付费证书阻塞。
- 发布后匿名访问 latest.json 为 1.6.1，Updater 的 GitHub asset API 在 application/octet-stream 下返回真实 gzip 资产；下载的 1.6.1 桌面包点击检查更新，实际显示“当前已是最新版本”。这证明当前查询入口可用，不等于跨版本安装升级已验证。

## v1.6.2：2026-09-08 已公开

- 不可变 Tag：`v1.6.2` → `cc11a3fa35878a6d72bab2308af5cb9ea4b63b01`；公开时间 02:43:46 UTC，GitHub Latest 为 v1.6.2。
- CI `34179375641`、dry run `34179377924` 通过；正式 Release `34180140822` 全部通过。初次 Pages 部署因精确 Tag 名单不包含 v1.6.2 被拒绝；新增该 Tag 策略、仅重跑失败部署后成功，既有保护保留。
- 本地最终 180 项 JavaScript 测试、3 项性能测试、生产审计、Static 边界、Rust fmt/clippy 与 14 项测试通过。Skill quick validation、两套 strict 模板及仓库 strict 校验通过。
- 下载 22 个附件，20 项 SHA-256 与 manifest 版本/Tag/commit/渠道一致；独立 Ed25519/minisign 验证 7 个更新签名及 trusted comment，并用篡改消息确认验签拒绝；latest.json 的 11 个平台目标均映射到真实附件和相同签名。
- 正式 macOS arm64 应用在 `.release/v1.6.2-installed/TensorNote.app` 解压启动，Info.plist 为 1.6.2，示例侧栏、阅读页和右侧目录可见。仍是无 Developer ID 的社区包，不宣称通过操作系统发行者签名验收。
- dry-run 本地 Web 包在源码目录外解压，用原始 `node start.mjs` 启动，页面及 SPA 深路径正常。正式 local-web 归档解压后逐文件 SHA-256 与这份实测包完全相同。Safari 仅检查启动页；本地目录读写仍推荐 Chrome/Edge。
- 正式 Skill 包在独立目录安装锁定依赖并校验两套模板，通过。
- 已部署 Pages 入口资源为 `index-Djc0EP28.js` / `index-BTTnOq_V.css`，与正式 Static archive 一致。完整公开仓库分享 URL 在 Chrome/Safari 均能自动打开 Workspace；更新后只读复查用户公开课程仓库，中文章节名称和 Images 文件夹显示正确。
- 截图只含内置/公开示例和无用户数据的启动页，见 [v1.6.2 来源说明](images/v1.6.2/PROVENANCE.md)。用户知识库未改写或公开到文档截图。
- 干净 Windows/Linux/Intel macOS 安装、公共 Binder 完整执行和跨版本安装更新依然不冒充已实测。

## v1.16.0 Project Experiment 稳定候选

- 阶段 0～8 的不可变版本 `v1.7.0`、`v1.8.2`、`v1.9.0`、`v1.10.0`、`v1.11.0`、`v1.12.0`、`v1.13.0`、`v1.14.0`、`v1.15.0` 已逐阶段发布；v1.15.0 工作流 `34306637311` 全部成功，22 个附件齐全后公开。
- 当前源码在 Local Web 打开 `AaronChou313/happy-llm-tensornote` 的完整 commit `6bacf82c34d3d4e4e735f09eb2ac1e3956c91248`，视觉确认物理文件系统目录、Experiments 数量、笔记内 Project Experiment Card 与无 Focus 遮挡；截图及来源见 `docs/images/v1.16.0/`。
- 实际打开实验详情页，确认 Local Web 平台标签、CPU/内存/磁盘提示、Manifest v1、环境继承、固定 Revision、未信任禁止执行及 Binder 配置不足的准确降级说明。没有将可访问性元素存在当成像素可见的唯一证据。
- Happy-LLM 第 5、6 章 Manifest、分组依赖、CPU 检查、结构化脚本入口与 Skill 严格 Validator 已在 v1.15.0 候选中通过。公共 Binder 完整 Notebook 执行、跨版本自动升级、干净 Windows/Linux/Intel macOS 安装仍保留为外部验证债务。

## v1.17.0 环境管理与依赖安装正式发行

- `pnpm check` 通过：61 个测试文件、214 项测试，以及 Lint、TypeScript 和 Local 生产构建均成功。
- Rust fmt、clippy 和 18 项原生测试通过；Apple Silicon `.app` 与 `TensorNote_1.17.0_aarch64.dmg` 本机构建成功。
- Static Web 生产构建通过，并确认没有打包 Tauri IPC；3 项性能测试通过，生产依赖无已知高危漏洞，v1.17.0 Release Contract 通过。
- Skill quick validation、三套 strict Workspace 模板、仓库 Validator、出版检查和同版本 Skill 打包通过。
- 本机 Conda 为 `/opt/anaconda3/bin/conda`，即使 Finder 启动不读取 Shell 初始化，也属于原生探测的常见位置。
- 实际界面走查覆盖 Desktop 设置弹窗和在线 Web。Desktop 显示本地/远程切换、本地便捷连接及手动连接；在线 Web 只显示远程入口，并在旧存储仅有本地 Profile 时自动创建远程 Profile，没有暴露本地环境管理。
- 本机没有中断用户当前运行中的正式 TensorNote，因此未用同 bundle id 的候选覆盖启动。Conda 实际创建 Python 3.11 与干净 Windows/Linux 安装仍是外部实机验收项；不得把源码构建或 CI 构建表述为这些流程已实测。
- 不可变 Tag `v1.17.0` 指向 `35e2eafc425c211f17f2264ab19670e744f8e590`。[Release dry run 34338683125](https://github.com/AaronChou313/tensornote/actions/runs/34338683125) 和 [正式 Tag Release 34357042729](https://github.com/AaronChou313/tensornote/actions/runs/34357042729) 全部通过。
- 草稿全部 22 个附件在公开前下载到隔离目录；`SHA256SUMS` 覆盖的 20 项全部复核通过。Manifest 的版本、Tag 和 commit 一致，`latest.json` 包含 11 个平台映射和 11 份签名。
- 正式 Apple Silicon 归档中 `Info.plist` 的短版本、构建版本均为 `1.17.0`，bundle id 为 `io.github.aaronchou313.tensornote`。未覆盖启动正在使用的同 bundle id 应用。
- [公开 Release](https://github.com/AaronChou313/tensornote/releases/tag/v1.17.0) 于 2026-09-09 14:00 UTC 发布，非 Draft、非预发布并设为 Latest。Pages 部署入口脚本为 `index-Bk-Sz3Ce.js`，线上资源包含 `1.17.0`。

## v1.18.0 Compute 与 Jupyter 体验正式发行

- Desktop 采用环境优先的本地计算界面，Kernel 和 Owned Server 归入环境详情；Local Web 提供手动连接引导，在线 Web 只暴露远程连接。Remote 连接成功后自动发现 Kernel。
- 最终 `pnpm check` 通过 63 个测试文件、226 项测试，以及 Lint、TypeScript 与 Local 生产构建；3 项性能测试、19 项 Rust 测试、Clippy、Static 边界、生产依赖审计和 Release validator 通过。
- Skill quick validation、两套 strict 模板及仓库校验通过；本机 Apple Silicon 应用与 DMG 构建成功。
- [Release dry run 34387736823](https://github.com/AaronChou313/tensornote/actions/runs/34387736823) 和 [正式 Tag Release 34388925373](https://github.com/AaronChou313/tensornote/actions/runs/34388925373) 全部成功。
- 不可变 Tag `v1.18.0` 指向 `fe3d70698539f742a64e92757cb63ad6f8af4432`。公开前下载全部 22 个附件，SHA256SUMS 覆盖的 20 项全部复核通过；Manifest、latest.json 和正式 Apple Silicon 应用版本一致。
- [公开 Release](https://github.com/AaronChou313/tensornote/releases/tag/v1.18.0) 于 2026-09-09 18:40 UTC 发布，非 Draft、非预发布并设为 Latest。Pages 已部署并确认入口资源包含 1.18.0。
- GitHub Community 发行仍无 Apple Developer ID 公证与 Windows 商业签名；Updater 密码学签名保留。非本机平台由构建矩阵覆盖，不宣称完成物理设备安装验收。
