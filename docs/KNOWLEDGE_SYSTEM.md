# TensorNote 知识系统使用说明

本文对应 `v0.3.0 — Knowledge System`，说明如何在保持普通 Markdown 可移植性的前提下使用 WikiLink、Alias、Tag、Properties、嵌入、反向链接、Outline、Search v2 和 Local Graph。

## 1. 不需要额外服务

知识系统完全在 TensorNote 前端中运行：

- 不需要启动数据库。
- 不需要额外 Node 服务。
- 不运行 Python Lab 时不需要 Jupyter。
- 打开 Workspace、保存笔记或执行文件操作后，TensorNote 会从 Markdown 自动重建索引。

因此日常知识整理只需要启动前端：

```bash
pnpm dev --host localhost --port 5173 --strictPort
```

## 2. WikiLink

通过标题、文档 `id`、Alias、文件名或路径链接另一篇笔记：

```markdown
[[Self-Attention]]
[[self-attention]]
[[transformer/self-attention.md]]
[[Self-Attention|注意力机制]]
```

链接到目标 Heading：

```markdown
[[Self-Attention#数学表达]]
[[Self-Attention#数学表达|查看公式]]
```

标准 Markdown 相对链接仍然支持，并会进入同一套 Backlink / Outgoing Link 索引：

```markdown
[Self-Attention](./self-attention.md#数学表达)
```

HTTP、HTTPS、Mail 和其他外部链接不会进入 Workspace 知识关系。

## 3. Alias

在 Frontmatter 中为一篇笔记声明多个可解析名称：

```yaml
---
id: self-attention
title: Self-Attention
aliases:
  - Scaled Dot-Product Attention
  - 自注意力
---
```

随后可以使用：

```markdown
[[自注意力]]
```

Properties 面板中的 `Aliases` 输入框使用逗号分隔，保存后仍写回上述 YAML。

## 4. Tag

Frontmatter Tag：

```yaml
tags:
  - transformer
  - attention
```

正文 Inline Tag：

```markdown
这部分需要继续复习。 #review/attention
```

点击笔记侧栏中的 Tag 会打开 Knowledge 页面并筛选关联文档。代码块和行内代码中的 `#tag` 不会进入 Tag 索引。

## 5. 任意 Properties

除 TensorNote 已知字段外，可以继续添加普通 YAML 属性：

```yaml
status: growing
type: concept
authors:
  - Vaswani et al.
year: 2017
```

Search v2 会索引属性名与属性值，Knowledge 页面会列出当前 Workspace 中出现过的 Property Key。未知属性在可视化编辑 Title、Alias、Section、Tags 或 Summary 时会被保留。

## 6. Embedded Note

嵌入整篇笔记：

```markdown
![[Transformer 学习地图]]
```

只嵌入某个 Heading Section：

```markdown
![[Transformer 学习地图#学习路径]]
```

嵌入只影响渲染，不会把目标正文复制到当前 Markdown。目标笔记更新后，重新索引即可看到最新内容。TensorNote 会阻止 A 嵌入 B、B 再嵌入 A 造成的循环渲染。

## 7. 笔记右侧知识面板

阅读模式下包含：

- `Local graph`：当前笔记、显式一跳链接和少量共享 Tag 节点。
- `Links`：Tags、Backlinks、Outgoing Links 和未解析目标。
- `Outline`：当前笔记 H1–H6 目录，点击可跳转到 Heading。

Local Graph 刻意不显示整个 Workspace 的全部节点。大型 Workspace 中，当前上下文的一跳关系通常更容易阅读。

## 8. Search v2

按 `Ctrl/Cmd + K` 打开搜索。查询会依次匹配：

```text
Title → Alias → Tag → Heading → Path → Property → Body
```

高权重字段会排在前面。多个关键词必须都能在同一篇笔记的任意索引字段中找到。搜索结果会显示命中字段与正文片段；Python/Markdown 代码正文也可以搜索。

## 9. Knowledge 页面

从 Sidebar 的 `Knowledge` 或 Workspace Overview 的 `Explore knowledge index` 进入：

- 点击 Tag Atlas 中的 Tag 筛选笔记。
- 查看 Workspace 中的 Property Key。
- 按链接数量查看关联程度较高的笔记。
- 查看 unresolved links，并返回来源笔记修正目标。

## 10. 重命名注意事项

v0.3 不会在重命名文件或 Heading 时批量改写其他 Markdown：

- 使用稳定文档 `id`、标题或 Alias 的 WikiLink，通常不受文件路径变化影响。
- 使用相对路径的标准 Markdown 链接，在目标文件移动后需要手动更新。
- Heading 文本变化后，旧 Heading Fragment 需要手动修正。
- Knowledge 页的 unresolved links 用于发现这些断开的关系。

这项限制保证 TensorNote 不会在没有用户确认时批量修改知识库；自动安全重构可以在后续版本基于 KnowledgeIndex 增量实现。
