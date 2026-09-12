# Knowledge authoring specification

## Contents

1. Repository organization
2. Frontmatter contract
3. Note structure
4. Links and assets
5. Supported presentation syntax
6. Quality and safety gates

## 1. Repository organization

Store knowledge below the configured `content.root`, normally `notes/`. Use folders for durable subject hierarchy, not temporary project status. The filesystem path determines which file a note is; an explicit Frontmatter `id` determines which knowledge concept it represents. Different directories may contain the same filename. Prefer lowercase kebab-case filenames and stable paths:

```text
notes/
├── 00-foundations/
│   ├── 00-overview.md
│   └── 01-linear-algebra.md
└── 01-transformers/
    ├── 00-overview.md
    └── 01-self-attention.md
```

Use numeric prefixes only when they communicate a deliberate learning order. Keep source files reasonably focused; split a note when it develops multiple independent learning goals.

## 2. Frontmatter contract

Use YAML Frontmatter at the start of authored notes:

```yaml
---
id: self-attention
title: Self-Attention
section: Transformer / Attention
order: 1
tags: [transformer, attention, tensor-shape]
aliases: [Scaled Dot-Product Attention]
prerequisites: [token-and-position]
summary: 理解 Token 如何按内容关系聚合上下文信息。
status: growing
---
```

Required for agent-authored notes:

- `id`: globally unique, stable, lowercase kebab-case knowledge identifier. Never recycle an ID for another concept. This uniqueness rule applies to explicit IDs, not filenames; `chapter-1/README.md` and `chapter-2/README.md` are valid distinct files.
- `title`: human-readable title used by navigation and search.
- `section`: durable subject grouping.
- `order`: number used for deliberate reading order within a section.
- `tags`: concise array of reusable concepts; prefer singular lowercase tags.
- `prerequisites`: array of note IDs; use `[]` when none.
- `summary`: one sentence that states the note's learning outcome.

Optional fields such as `aliases`, `status`, `type`, `year`, `source`, and extension-specific properties are allowed. Preserve unknown fields and their meaning when editing. Never place credentials in Frontmatter.

## 3. Note structure

Begin with one H1 equal to `title`. Prefer H2 for all major sections. A learning note normally answers, in this order:

1. What problem does this concept solve?
2. What is the one-sentence mental model?
3. Why is it needed?
4. What is the core mechanism, equation, or data flow?
5. What shapes, invariants, or assumptions must hold?
6. What is commonly confused?
7. What experiment can verify the idea?
8. What should the learner remember?

Adapt the headings to the topic; do not mechanically add empty sections. Define a symbol before using it. Distinguish facts, intuition, assumptions, and implementation details. When external facts matter, link to primary documentation or papers and do not invent citations.

Keep paragraphs compact. Use lists for parallel facts, tables for repeated-field comparisons, and Mermaid only when relationships are materially clearer than prose.

## 4. Links and assets

Use WikiLinks for internal knowledge relations:

```markdown
继续阅读 [[Multi-Head Attention#核心结构|多头注意力]]。
![[Transformer 学习地图#学习路径]]
```

Link targets may resolve through an ID, title, alias, filename, or path, but prefer stable explicit IDs. If duplicate filenames make `[[README]]` ambiguous, use a path such as `[[chapter-1/README]]` or assign and link an explicit ID such as `[[chapter-1-readme]]`. Ambiguity is a link issue and must never make the Workspace invalid. Do not create a dangling link without reporting it.

Store images and downloadable resources below `assets.root`, normally `assets/`. Use relative Markdown links and descriptive alt text:

```markdown
![Attention 权重矩阵，行表示 Query，列表示 Key](../../assets/diagrams/attention-matrix.svg)
```

Do not embed large base64 payloads or copy third-party assets without permission and provenance.

## 5. Supported presentation syntax

TensorNote supports GFM tables/tasks, KaTeX, Mermaid, syntax-highlighted fences, WikiLinks, embedded notes, and Callouts.

```markdown
> [!intuition]
> 用于建立直觉。

> [!pitfall]
> 用于标记常见错误。
```

Supported Callout kinds include `intuition`, `important`, `pitfall`, `bridge`, `question`, and `remember`.

Use display math for important equations and inline math for short symbols. Give Mermaid nodes readable labels; keep diagrams small enough to understand without zooming.

Normal code fences are illustrative and never executable:

````markdown
```python
x = 1
```
````

Read `sidecars.md` before adding Derivation or Jupyter Sidecars. Keep ordinary code fences display-only. Preserve a continuous main narrative: move long auxiliary proofs, detailed derivations, and verification experiments into a Sidecar only when they would interrupt that narrative. Do not hide short equations, short code, or essential reasoning in Sidecars.

## 6. Quality and safety gates

- Verify the title, summary, headings, tags, and prerequisites describe the actual content.
- Verify every new internal link and local asset path.
- Avoid unexplained jargon, unsupported claims, placeholder text, and duplicate sections.
- Keep code examples deterministic and bounded; seed randomness where results are discussed.
- Avoid network downloads, shell commands, destructive file writes, and large training jobs inside learning cells unless explicitly required and clearly warned.
- Preserve raw Markdown readability in GitHub, Obsidian, VS Code, and ordinary Markdown tools.
- Run the bundled validator and manually read the rendered note before completion.
