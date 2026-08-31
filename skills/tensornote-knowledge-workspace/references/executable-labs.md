# Executable Lab specification

## Contents

1. Syntax v1
2. Lab and Cell design
3. Metadata rules
4. Runtime and permissions
5. Safety and quality
6. Review checklist

## 1. Syntax v1

Only `python exec` fences become TensorNote Labs:

````markdown
```python exec lab="linear-regression" cell="1" title="Create data" difficulty="basic"
import numpy as np
rng = np.random.default_rng(7)
x = np.linspace(-1, 1, 16)
y = 2 * x + 0.1 * rng.normal(size=x.shape)
print(x.shape, y.shape)
```

```python exec lab="linear-regression" cell="2" title="Fit a line" difficulty="basic"
slope, intercept = np.polyfit(x, y, deg=1)
print({"slope": round(float(slope), 3), "intercept": round(float(intercept), 3)})
```
````

The fences remain readable Python in other Markdown tools. A plain `python` fence is never executable.

## 2. Lab and Cell design

Fences with the same `lab` value form one Lab Card and share the current Kernel. Use multiple cells to expose meaningful stages such as setup, transformation, visualization, and verification.

Each lab must be safe to run top-to-bottom with **Run All**. A later cell may use earlier variables, but the dependency must be obvious from titles and order. Keep each cell focused and small. Prefer visible shape/value/assertion output over hidden state.

Use a new lab ID when cells are conceptually independent or should not share state. Do not use multiple lab IDs merely to create visual spacing.

## 3. Metadata rules

- `lab`: stable lowercase kebab-case ID, unique within the note unless intentionally grouping cells.
- `cell`: positive sequential integer starting at `1`; do not duplicate or leave gaps.
- `title`: short action-oriented label with no double quotes.
- `difficulty`: `basic`, `medium`, or `heavy`.

Agents must write all four attributes even though the runtime has safe defaults for older content. Do not place Markdown triple fences inside cell code.

Use `basic` for fast CPU examples, `medium` for moderate dependencies or computation, and `heavy` only when runtime/memory requirements are clearly stated. Heavy labs should not run automatically.

## 4. Runtime and permissions

Execution requires all applicable gates:

1. The Workspace manifest or current-device setting permits execution.
2. A GitHub Workspace is trusted for its current commit SHA.
3. A Compute Profile points to an accessible Jupyter Server and registered Kernel.
4. Browser, authentication, CORS, Kernel, and WebSocket diagnostics pass.

Do not treat a disabled Run button as a parser bug until these gates are checked. A user may enable a local override under Settings → Compute without changing `tensornote.yaml`.

## 5. Safety and quality

- Seed random libraries when output is used to teach or test a claim.
- Avoid deleting files, changing directories outside the Workspace, spawning processes, or running shell commands.
- Avoid network calls and model downloads unless explicitly required; state download size and provenance when used.
- Do not expose environment variables or print tokens.
- Bound loops, epochs, dataset size, memory allocation, and output volume.
- Declare dependencies in a real environment file and keep imports aligned with it.
- Make reruns idempotent. Restart & Run All should reproduce the intended state.
- Add assertions for invariants when they clarify the lesson.

## 6. Review checklist

- Open the rendered note and confirm one Lab Card appears per intended `lab`.
- Confirm Cell order, titles, and difficulty labels.
- Run from a fresh Kernel with **Restart & Run All** when execution is authorized.
- Confirm outputs explain the concept and do not rely on unstated previous notebook state.
- Confirm saving edited Lab cells updates only the matching executable fences.
- Confirm ordinary Markdown readers still show valid Python code.
