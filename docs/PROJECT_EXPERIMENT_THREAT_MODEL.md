# Project Experiment 威胁模型

Markdown、Manifest、依赖文件、脚本、Notebook、URL、包名、参数默认值和 GitHub 仓库均视为不受信任输入。Renderer 无权启动进程。Desktop 原生层只执行已校验并由用户确认的结构化计划。

| 威胁 | 强制控制 |
| --- | --- |
| 路径穿越、符号链接逃逸 | 规范化路径、真实路径边界检查、拒绝绝对路径和父目录 |
| Shell / 参数注入 | 固定 Runner、argv 数组、禁止命令字符串、启动时再次校验 |
| 审核后内容被替换 | 确认绑定 Manifest、依赖、脚本、参数、环境、平台和 Revision 摘要 |
| 分支移动后沿用信任 | GitHub 运行绑定完整 commit SHA |
| 静默依赖安装或下载 | 只读检测与变更计划分离；用户明确确认 |
| Secret 泄露 | Secret Store 引用、日志脱敏、禁止写入 Workspace 和 URL |
| 无限输出与磁盘耗尽 | 日志限流轮换、配额提示、产物按需读取 |
| 进程逃逸 | 进程树归属、取消升级、应用退出清理或 interrupted 记录 |
| 在线页面连接本机服务 | 显式 Profile、连接诊断、用户启动 |
| 资源滥用 | 资源声明、预检、重型任务二次确认、默认 smoke preset |

安全不变量：解析和索引无副作用；写权限不等于执行权限；环境批准不等于任务批准；旧批准不能跨内容摘要或 Revision；不支持能力不显示可运行；未来 Manifest 只读；失败不得降级为 Shell 或跳过边界检查。

新 Runner、远程文件同步、Shell Script、容器或集群支持必须单独提交 RFC 和威胁模型增量。
