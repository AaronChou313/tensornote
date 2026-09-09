# Project Experiment 使用与创作指南

Project Experiment 适合一个课程实验包含多个脚本、Notebook、分组依赖、训练步骤或产物的情况。短小且只属于一篇笔记的代码继续使用 Inline Lab。

## 读者：从打开到清理

1. 打开包含 Experiment Card 的笔记，先查看难度、时间、资源和当前平台支持度。
2. 点击“打开实验”，选择最轻的 smoke Preset；第一次使用不要直接选择完整训练。
3. 在“环境”页核对 Python、依赖文件和下载说明。下载声明只是来源说明，不会自动下载。
4. Desktop 用户检查环境并审阅创建/更新计划；确认后才安装依赖。本地 Web 用户先连接能看到同一知识库路径的 Jupyter。
5. 在“运行”页核对脚本、参数、步骤、输入摘要和写入范围，然后明确确认并启动。
6. 运行中可查看当前步骤、最近日志和耗时，也可取消。失败后修复原因，再选择重试失败步骤或完整重跑。
7. 在“产物”页查看声明的文件；Desktop 可在文件管理器中定位。重要 Binder 产物应立即下载，因为临时环境不会自动回写 GitHub。
8. 在 Desktop 设置中清理不再使用的 Managed Environment 和本机运行历史。不要删除正在运行或仍需保留的产物。

## 三个平台

| | Desktop | 本地 Web | 在线 Web / Pages |
| --- | --- | --- | --- |
| 读取 Manifest | 完整 | 完整 | 完整 |
| 环境准备 | 审阅计划后创建隔离环境 | 自己维护 Jupyter 环境 | 由远程 Jupyter/Binder 管理 |
| Runner | Python、Module、Notebook、torchrun | 路径映射通过后的 Python、Module、Notebook | 阅读；兼容远程 Jupyter；固定 commit 的 Binder |
| 日志、取消、历史 | 完整本机 Job | 当前 Jupyter 会话 | 取决于远程服务 |
| 产物 | 声明式索引和本机定位 | 写入 Jupyter 可见路径 | Binder 内容临时且不回写仓库 |

Git Bridge 只处理本地 Web 的 Git，不参与实验执行。在线 HTTPS 页面不能连接浏览器所在电脑的普通 HTTP Jupyter。

## 没有合适运行条件

- **没有 Python：** 仍可阅读实验；Desktop 可审阅 Managed Environment 计划。
- **没有网络：** 已安装环境和本地文件可运行；首次安装依赖、GitHub、远程 Jupyter 和 Binder 不可用。
- **没有 GPU：** 选择 smoke/CPU Preset。不要强行运行明确要求 GPU 的完整训练。
- **磁盘不足：** 先查看环境、下载和产物预计大小，清理旧环境或换输出位置后重新生成计划。
- **依赖冲突：** 每个依赖组使用独立 Managed Environment；依赖文件变化后环境会标记过期，需要重新审阅。
- **取消或崩溃：** Desktop 会终止所属进程；应用重启后遗留运行标为 interrupted，可查看日志后重新运行。

## 作者：最小接入

1. 在脚本目录创建 `tensornote.experiment.yaml`，保持原脚本可从普通命令行使用。
2. 把依赖按用途拆分，并通过环境 `extends` 组合。避免固定跨平台 CUDA wheel。
3. 为重型训练提供确定性、CPU 安全且时间有界的 smoke Preset。
4. 在笔记中加入：

````markdown
```tensornote-experiment
manifest: ./code/tensornote.experiment.yaml
preset: smoke
```
````

5. 使用 Release 中的 Agent Skill 模板和严格 Validator。完整字段见[Manifest v1](../PROJECT_EXPERIMENT_MANIFEST_V1.md)，安全边界见[威胁模型](../PROJECT_EXPERIMENT_THREAT_MODEL.md)。

Manifest 不能包含 Shell 命令、Token、密码或私钥。路径必须留在 Workspace 内，参数必须是字符串数组；环境继承和步骤依赖必须无环。解析清单永远不等于授权安装、下载或执行。
