# TensorNote Sidecars

A Sidecar keeps supporting material beside a note without breaking the main reading flow. TensorNote supports exactly two portable types:

- `derivation`: non-executable rich Markdown for a derivation, proof, longer explanation, table, image, ordinary code sample, Mermaid diagram, Callout, quotation, or other supplemental material.
- `jupyter`: executable Python cells for a bounded experiment, numerical check, algorithm example, or data-processing task.

Use a Sidecar when the material is useful but not required to follow the main narrative. Keep short equations, short code, and essential reasoning in the body. Sidecars cannot contain nested Sidecars, plugin components, scripts, or arbitrary JavaScript execution.

## Support matrix

| Content | Main Markdown | Derivation | Jupyter |
|---|---:|---:|---:|
| Ordinary text and headings | ✓ | ✓ | - |
| Bold, italic, lists, tasks, links | ✓ | ✓ | - |
| Math / KaTeX | ✓ | ✓ | - |
| Tables and images | ✓ | ✓ | - |
| Mermaid | ✓ | ✓ | - |
| Ordinary display-only code | ✓ | ✓ | - |
| TensorNote Callouts | ✓ | ✓ | - |
| Executable Python | - | - | ✓ |
| Jupyter output | - | - | Runtime session |

Supported Callout kinds are `intuition`, `important`, `pitfall`, `bridge`, `question`, and `remember`.

## Derivation / supplemental content

```markdown
:::tensornote{type="derivation" id="attention-scale" title="缩放项的完整推导"}
## 方差推导

若 $q_i$ 与 $k_i$ 独立且方差为 1，则点积方差随 $d_k$ 增长。

> [!intuition]
> 除以 $\sqrt{d_k}$ 将尺度拉回稳定范围。

| 量 | 方差 |
|---|---:|
| $q^T k$ | $d_k$ |
| $q^T k / \sqrt{d_k}$ | $1$ |
:::
```

Derivation content uses the normal TensorNote Markdown renderer. Code fences inside it are illustrative and never executable. Do not place another `:::tensornote` directive inside it.

## Jupyter experiments

````markdown
:::tensornote{type="jupyter" id="linear-regression-demo" title="线性回归实验"}
```python title="准备数据"
import numpy as np
x = np.arange(8, dtype=float)
```

```python title="拟合模型"
coef = np.polyfit(x, 2 * x + 1, 1)
coef
```
:::
````

Only fences whose language is exactly `python` become executable cells. `javascript`, `json`, `bash`, `markdown`, unlabelled fences, and ordinary Python fences outside a Jupyter Sidecar remain display-only. Cells in one Sidecar share one Kernel and execute from top to bottom.

The Python source is knowledge-base content. Outputs belong to the current runtime session and are not automatically written into Markdown.

## IDs and titles

A Sidecar ID is unique only within its note. Prefer lowercase kebab-case and keep an existing ID stable. TensorNote's editor generates an ID from the title and adds `-2`, `-3`, and so on when required; ordinary users do not need to type one. Advanced users may edit it under **高级设置**.

Keep the title short enough to work both on the inline trigger and in the drawer header.

## Editing in TensorNote

In edit mode choose **侧栏内容**:

1. Choose **新建侧栏内容**, or select an existing item under **当前笔记**.
2. Pick **推导 / 补充** or **Python 实验**.
3. Edit the title and content. Derivations offer **编辑 / 预览**; Jupyter experiments offer Cell add, delete, move, titles, and Python-aware editing.
4. Insert or save, then save the note.

Editing or deleting an existing Sidecar replaces only that directive's source range. Other Markdown and formatting remain unchanged. Deletion asks for confirmation. Syntax diagnostics appear in the Markdown editor with source line numbers; malformed blocks remain verbatim so the note can still be opened and repaired.

## Portability and legacy syntax

Sidecar directives are written back to the Markdown file. They remain readable as plain text in editors that do not understand TensorNote.

Legacy ```` ```python exec ```` fences remain compatible through the legacy adapter. New and substantially edited material should use a `jupyter` Sidecar. Execution still requires Workspace permission, a configured Compute Provider, and exact-revision trust for remote repositories. Never put credentials in a directive or Cell.
