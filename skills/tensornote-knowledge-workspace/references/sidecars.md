# TensorNote Sidecars

Use a Sidecar when supporting material would interrupt the main reading flow. TensorNote 2.0 has exactly two types: `derivation` and `jupyter`.

## Portable directive

```markdown
:::tensornote{type="derivation" id="attention-scale" title="Why divide by sqrt d"}
Write ordinary Markdown, equations, tables, and explanation here.
:::
```

A Jupyter Sidecar uses the same directive with `type="jupyter"` and contains one or more fenced Python cells. Add an optional `title="..."` after `python` on each fence.

Rules:

- `type` must be `derivation` or `jupyter`.
- `id` must be stable, unique within the note, and use lowercase kebab-case.
- Keep `title` short and useful at the trigger and panel header.
- Derivation content is Markdown. Jupyter content is one or more Python fences, executed top-to-bottom in one Kernel.
- Ordinary Python fences outside a Jupyter Sidecar remain display-only.
- Never nest Sidecar directives.
- Preserve malformed directives verbatim during repair; report them instead of deleting content.

Legacy `python exec` fences adapt to Jupyter Sidecars. New or substantially edited content should use the directive syntax.

Execution requires Workspace permission, a configured Compute Provider, and trust for the exact GitHub revision. Keep cells bounded, deterministic, safe to rerun, and free of credentials.
