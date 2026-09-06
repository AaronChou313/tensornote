# v1.6.0 稳定候选验收

日期：2026-09-06。此记录描述候选源码与本机验证，不表示正式 Release 已发布。正式签名、干净系统安装与完整跨平台安装矩阵仍以 RELEASE_MATRIX 为准。

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
