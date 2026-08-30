# Structured Knowledge（v0.7.0）

TensorNote 的 Structured Knowledge 是面向 Markdown Workspace 的轻量属性浏览器。它从每篇笔记的 YAML Frontmatter 读取属性，在运行时建立索引，并在 Database 页面提供筛选和三种阅读视图。

Markdown 文件仍是唯一数据源：不会写入 SQL、云端表格或 TensorNote 专有数据库。把文件夹交给 Git、Obsidian、VS Code 或普通 Markdown 工具时，属性也会随文件一起携带。

## 进入 Database

打开一个 Workspace 后，使用侧栏的 **Database** 入口，或直接访问：

```text
/database
```

页面会显示当前 Workspace 中带 Frontmatter 属性的 Markdown 文档。每一行、卡片或列表项都可打开原始笔记；Database 本身只读取并组织内容，不会修改源文件。

如果页面显示 “No indexed properties yet”，请在至少一篇 Markdown 笔记开头加入 YAML Frontmatter，然后刷新 Workspace 索引。

## 建立属性

Frontmatter 位于 Markdown 文件第一行的 `---` 与结束的 `---` 之间。`title`、`aliases`、`tags` 和 `summary` 可继续作为普通 TensorNote 元数据使用；其余字段同样会进入属性索引。

```markdown
---
title: 注意力机制论文
type: paper
status: reading
year: 2017
authors: [Vaswani, Shazeer, Parmar]
tags: [transformer, attention]
favorite: true
rating: 5
doi: null
---

正文从这里开始。
```

建议对同类笔记使用稳定且一致的字段名，例如所有论文都使用 `status`，而不要混用 `state`、`readingStatus`。字段名的查询匹配不区分大小写，但原始写法会保留在文件中。

### 可索引的值类型

| 类型 | YAML 示例 | 查询含义 |
| --- | --- | --- |
| 字符串 | `status: reading` | 以文本精确匹配 |
| 数字 | `year: 2026` | 以数字匹配，不等同于引号中的文本 |
| 布尔值 | `favorite: true` | 使用 `true` 或 `false` |
| 空值 | `doi: null` | 使用 `null` |
| 数组 | `tags: [ml, paper]` | 任一数组成员命中即可 |

对象、日期等其他 YAML 值也会被保留在 Frontmatter 中并显示为未知类型，但当前查询语法不提供对象字段、范围、日期或全文匹配。

### 可直接使用的模板

下面的例子可以分别保存为 Markdown 文件，按自己的词汇替换属性和值。

#### 论文库

```markdown
---
title: Attention Is All You Need
type: paper
status: reading
year: 2017
venue: NeurIPS
tags: [transformer, attention, nlp]
favorite: true
---
```

#### 课程表

```markdown
---
title: 深度学习第 3 周
type: course
course: 深度学习
week: 3
status: scheduled
required: true
topics: [backpropagation, optimization]
---
```

#### 学习计划

```markdown
---
title: 完成 Transformer 学习路径
type: plan
area: transformer
status: active
priority: 1
target_date: 2026-09-15
milestones: [read, implement, review]
---
```

#### 实验记录

```markdown
---
title: Baseline LR Sweep 01
type: experiment
status: completed
model: baseline
learning_rate: 0.001
seed: 42
passed: false
tags: [ablation, cifar10]
---
```

#### 阅读列表

```markdown
---
title: Designing Data-Intensive Applications
type: book
status: queued
format: book
pages: 616
tags: [systems, data]
owned: true
---
```

#### 项目记录

```markdown
---
title: TensorNote v0.7 发布
type: project
project: tensornote
status: active
owner: aaron
priority: 2
areas: [documentation, frontend]
blocked: false
---
```

`target_date` 在上例中应按字符串使用（例如 `target_date = "2026-09-15"`）。若 YAML 解析器将未加引号的日期解析为日期对象，当前查询不会把它转换为可比较的日期。

## 查询

在 Database 顶部输入属性表达式。空查询显示所有索引文档。当前支持相等 `=`、不等 `!=`，以及用大写或小写 `AND` 连接的多个条件。

```text
status = reading
type = paper AND year = 2017
favorite = true AND rating != 1
tags = transformer
doi = null
```

每个条件都必须成立。键名不区分大小写，因此 `STATUS = reading` 与 `status = reading` 等价；字符串值保留大小写并作精确比较。

### 引号与特殊字符

没有空格或歧义的字符串可以不加引号：

```text
status = reading
```

值中包含空格、`AND`、等号或希望明确表达字符串时，请使用单引号或双引号：

```text
course = "深度学习"
venue = 'NeurIPS 2017'
title = "Research AND Practice"
```

引号内可用反斜杠转义同种引号或反斜杠：

```text
title = "A \"quoted\" result"
path = 'C:\\notes'
```

`AND` 只有在引号外、且两侧都有空白时才会被识别为连接词。因此 `title = Research AND Practice` 会被拆成两个条件；对此类文本应改为 `title = "Research AND Practice"`。

### 类型与数组

查询值会按下列顺序识别：带引号的内容为字符串；`true`/`false` 为布尔值；`null` 为空值；数值字面量为数字；其余为字符串。比较不会隐式转换类型：

```text
year = 2017          # 匹配数字 2017
year = "2017"        # 匹配字符串 "2017"，不会匹配数字
favorite = true      # 匹配布尔值 true
doi = null           # 匹配空值
```

数组采用成员匹配，而不是匹配整个数组：

```text
tags = transformer
topics = optimization AND required = true
```

这会匹配 `tags: [transformer, attention]`，无需写出完整数组。当前不支持数组长度、数组顺序或包含多个成员之外的复杂比较。

### 不等与缺失字段

`!=` 对“属性不存在”也成立。例如 `status != reading` 会包含没有 `status` 字段的文档。需要缩小范围时，可增加一个必有字段：

```text
type = paper AND status != reading
```

### 查询错误与排查

语法错误不会修改文件，页面会显示错误说明并允许清空查询。常见情况包括：

| 问题 | 示例 | 修正 |
| --- | --- | --- |
| 缺少比较符 | `status reading` | `status = reading` |
| 缺少值 | `status =` | `status = reading` |
| 连续比较符 | `status == reading` | `status = reading` |
| 未闭合引号 | `title = "My note` | `title = "My note"` |
| 含 `AND` 的文本未引号 | `title = Research AND Practice` | `title = "Research AND Practice"` |

无结果不一定是错误。请检查字段拼写、字符串大小写、值类型，以及文件是否已被重新索引。

## 三种视图

三种视图共享同一个查询结果与同一组源文件，只改变呈现方式。

| 视图 | 适合场景 | 显示方式 |
| --- | --- | --- |
| Table | 比较很多文档的字段 | 以文档为行、属性为列；当前结果中最多显示五个有值字段 |
| Card | 浏览少量记录与摘要 | 每篇笔记一张卡片，显示摘要和最多四个非空属性 |
| List | 快速扫描阅读队列或任务 | 紧凑列表，显示笔记标题、摘要/目录和两个主要属性 |

点击 Table、Card 或 List 切换。不存在于当前筛选结果中的属性不会占用可见列；完整属性仍保存在对应 Markdown 文件中。

## URL 分享与书签

Database 的查询和视图状态保存在 URL 中，可复制浏览器地址分享给能访问同一 Workspace 的人，或保存为书签：

```text
/database?q=status%20%3D%20reading&view=card
/database?q=tags%20%3D%20transformer%20AND%20year%20%3D%202017&view=list
```

- `q` 是查询表达式；浏览器会对空格、引号等字符进行 URL 编码。
- `view=table` 是默认值，可以省略；可选值为 `table`、`card`、`list`。
- URL 只保存筛选条件和视图，不会携带 Markdown 内容、文件权限、Jupyter 凭据或任何私有数据库。

若接收方尚未打开相同的本地文件夹，或没有相同的 GitHub/内置 Workspace，上述链接不会替其传输内容或授予访问权限。

## 编辑后刷新索引

PropertyIndex 是运行时派生数据，不监听任意外部编辑器的每一次磁盘变化。请按来源刷新：

1. 在 TensorNote 编辑并保存笔记后，Workspace 会用保存后的 Markdown 重建索引。
2. 在 VS Code、Obsidian 或其他工具中修改 Frontmatter 后，回到 TensorNote 并使用 Workspace 的重新打开/刷新流程，确保重新读取目录中的 Markdown 文件。
3. 重新打开后返回 Database，检查新字段和值；无结果时先清空查询确认文档是否已出现。

不要把 Database 看作另一个需要同步的表格：只需编辑原始 `.md` 文件，并刷新 Workspace 读取结果。

## 限制、安全与可移植性

- 当前仅支持 `=`、`!=` 和 `AND`；不支持 `OR`、括号、`>`/`<`、模糊匹配、排序、分组、聚合、保存视图或写回编辑。
- 数字比较仅是相等/不等，不是范围比较；日期、对象和复杂 YAML 结构不提供结构化查询。
- 结果只来自当前已打开 Workspace 中可读取的 Markdown 文件。被过滤、未加载、无 Frontmatter 或无属性的文档不会成为可查询记录。
- 查询在浏览器本地针对运行时索引执行，不会执行 YAML、Markdown、JavaScript 或 SQL，也不会向外部服务发送查询内容。
- 本地 Workspace 的读取与写入仍受浏览器 File System Access API 的权限控制；GitHub 与内置 Workspace 保持各自的只读边界。
- 属性没有迁移锁定或专有格式。备份、Git 版本控制或切换到其他 Markdown 工具时，保留 `.md` 文件及其 YAML Frontmatter 即可。

有关链接、标签、全文搜索和原始 Frontmatter 的通用规则，请参阅[知识系统使用说明](KNOWLEDGE_SYSTEM.md)。有关实现组成与数据流，请参阅[架构说明](ARCHITECTURE.md)。
