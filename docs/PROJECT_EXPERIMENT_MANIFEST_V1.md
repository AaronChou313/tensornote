# Project Experiment Manifest v1

Project Experiment 为多文件 Python、Notebook 与训练任务提供可移植声明。它补充 Inline Lab，不改变 Workspace Schema v1 或 Executable Markdown Syntax v1。

## 引用

笔记通过声明式 Fence 引用实验：

````markdown
```tensornote-experiment
manifest: ./code/tensornote.experiment.yaml
preset: smoke
```
````

`manifest` 相对于笔记目录解析；`preset` 可省略并回退到 `defaultPreset`。路径必须留在 Workspace 内。Fence 不得包含命令、Secret 或 URL 凭据。

## 清单结构

清单推荐命名为 `tensornote.experiment.yaml`，并遵循 [JSON Schema](../schemas/tensornote-experiment-v1.schema.json)。顶层必须包含 `schemaVersion: 1`、`experiment`、`environments`、`presets`、`defaultPreset` 和 `steps`；可包含强类型 `parameters`、资源提示 `resources`、`artifacts` 与只读下载说明 `downloads`。

ID 使用小写 kebab-case。路径使用正斜线和 Workspace 相对形式；禁止绝对路径、`~`、盘符、UNC 路径、空字节和父目录逃逸。解析符号链接后仍必须位于 Workspace 内。

环境可通过 `extends` 继承一个父环境，继承图不得成环。v1 识别 `requirements*.txt`、`pyproject.toml`、`uv.lock` 和 `environment.yml`。检测不安装；安装必须生成绑定依赖摘要、目标环境、平台和 GitHub Revision 的计划，并由用户确认。

## Runner 与步骤

v1 只允许 `python`、`python-module`、`notebook` 和 `torchrun`。不得提供裸 `command`、Shell 命令字符串或内嵌脚本。参数作为 argv 元素传递，不经过 Shell。

`torchrun` 使用结构化拓扑字段 `processes`（必填，1–64）、`nodes`、`nodeRank`、`masterAddress` 与 `masterPort`。TensorNote 通过所选环境的 Python 启动 `torch.distributed.run`。`notebook` 保留源文件，桌面版把执行副本写入应用数据目录，并把它记录为运行产物。

`downloads` 仅记录无凭据 HTTPS 来源、预计大小、Workspace 相对缓存位置、许可与可选 SHA-256。TensorNote 不根据该字段自动联网或下载。

`dependsOn` 必须形成有向无环图。预设只引用存在的环境、步骤和参数。v1 串行执行拓扑排序后的步骤；步骤失败后，其依赖项标为 `blocked`。

参数支持 `string`、`integer`、`number`、`boolean`、`enum` 与 `path`。Secret 只能通过应用 Secret Store 中的引用名提供，不能写入清单。

## 兼容和状态

未识别 Fence 的 Markdown 阅读器仍显示普通代码块。未来 `schemaVersion` 只允许只读诊断，不得执行或改写。运行继续要求 Workspace execution permission；GitHub 来源还要求当前完整 commit SHA 的 Revision trust。

环境、Job、日志、缓存、Secret 和批准记录保存在应用数据目录或会话存储中。只有清单、脚本、依赖文件和作者明确选择的产物属于 Workspace 可移植内容。
