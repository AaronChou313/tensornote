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
- Browser：右上下文栏宽屏停靠不遮盖正文，390×844 窄屏为模态抽屉；Esc 返回原按钮；目录选择后关闭抽屉并显示章节；同篇笔记双栏时只滚动活动栏。修复了旧分栏 CSS 误隐藏右侧目录的问题。
- Desktop：通过原生目录选择器打开隔离课程；新建 Markdown，编辑并用 ⌘S 保存，读取磁盘核对内容；重命名保留文档 ID 和打开标签。
- Desktop：发现现有 Python/Jupyter，启动应用拥有的 loopback Server；Browser access、HTTP、CORS、认证、Kernel 与 WebSocket 诊断通过。
- Desktop：标准库两个 Cell 依次执行，结果 samples 为固定种子序列、mean 为 0.3331；再次运行计数 3/4，Restart & Run All 恢复 1/2，结果一致。退出应用后验收 Server 端口无监听。

## 仍需外部条件与发行验收

- 只检查 GitHub Secret 名称：当前仅有 TAURI_SIGNING 两项，缺少 Apple Developer ID / 公证及 Windows 受信代码签名配置。未读取 Secret 值。
- Updater 私钥可恢复备份须维护者确认；第二个签名 Desktop 版本才能验证真正的跨版本升级。
- 本机开发 `.app` 不代替 macOS Intel、Windows、Linux 干净系统的签名安装、卸载、拖放、文件关联、深链与真实更新矩阵。
- 真实浏览器文件授权写入流程、公共 Binder 容量与独立公开知识库 Pages 流程不由本机原生测试替代。
- U/E/F 中未纳入稳定性修复的 Live Preview、Slash/WikiLink 补全、GPU 向导、Git Remote Sync、公共扩展市场仍是后续候选，不在 v1.6.0 作功能承诺。

同一候选提交的 CI 与无 Tag Release 演练结果在运行完成后补录；不得把旧提交的成功状态复用于新的候选。
