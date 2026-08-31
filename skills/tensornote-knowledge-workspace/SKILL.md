---
name: tensornote-knowledge-workspace
description: Create, configure, author, validate, operate, or repair TensorNote Markdown knowledge workspaces. Use for TensorNote knowledge-base structure, tensornote.yaml, Frontmatter, WikiLinks, assets, executable Python labs, Jupyter/Conda/venv/uv setup, daily startup, Git Bridge usage, migration, or release-ready workspace checks.
---

# TensorNote Knowledge Workspace

Build knowledge bases that remain ordinary Markdown repositories while gaining TensorNote navigation, properties, executable labs, search, Git, and Jupyter workflows.

## Core workflow

1. Locate the Workspace root. Distinguish it from the TensorNote application source directory.
2. Inspect `tensornote.yaml`, the content/asset roots, two representative notes, environment files, and current Git status before editing.
3. Select and read the relevant reference below. Read every selected file completely before changing content.
4. Preserve existing organization and unknown Frontmatter fields. Make the smallest coherent change.
5. Run `node <skill-dir>/scripts/validate-workspace.mjs <workspace-root>`. Use `--strict` for a new Workspace or release candidate.
6. Review `git diff --check` and the changed Markdown. For application-source changes, also run the repository's test/lint/build gates.
7. Report changed files, validation results, required processes, and any unresolved execution or trust requirement.

## Reference routing

- Read [references/knowledge-authoring.md](references/knowledge-authoring.md) when creating, restructuring, reviewing, or linking notes and assets.
- Read [references/workspace-configuration.md](references/workspace-configuration.md) when creating or changing `tensornote.yaml`, directory layout, capabilities, trust, or portability.
- Read [references/executable-labs.md](references/executable-labs.md) when adding, editing, reviewing, or debugging Python Labs or Scratch-to-note content.
- Read [references/runtime-operations.md](references/runtime-operations.md) when installing TensorNote, choosing Conda/venv/uv, configuring Jupyter, starting services, using Git Bridge, deploying, or troubleshooting.

Read multiple references when a request spans those concerns. Do not infer executable permission from the presence of Python code alone.

## Non-negotiable rules

- Keep Markdown, assets, and `tensornote.yaml` as the portable source of truth. Do not create a private content database.
- Never write tokens, passwords, cookies, private keys, or extension secrets into Workspace files, examples, logs, screenshots, or Git.
- Keep `schemaVersion: 1`. Treat a future schema as read-only and non-executable.
- Use stable unique note IDs. Do not change an existing `id` merely to improve wording.
- Use normal Markdown constructs. TensorNote-specific executable metadata must degrade to readable Python fences elsewhere.
- Require explicit Workspace execution permission. A GitHub Workspace additionally requires trust for the current commit revision.
- Do not silently install packages, start remote services, execute labs, or mutate Git history. Explain the required action or perform it only when the user authorizes it.
- Make examples deterministic, bounded, CPU-safe by default, and safe to rerun.

## Reusable assets

- Copy [assets/workspace-template](assets/workspace-template) to start a complete Workspace.
- Copy [assets/note-template.md](assets/note-template.md) for a conceptual note.
- Copy [assets/lab-note-template.md](assets/lab-note-template.md) for a multi-cell executable note.

Replace every placeholder, keep IDs unique, and validate after copying.

## Validation modes

```bash
node skills/tensornote-knowledge-workspace/scripts/validate-workspace.mjs /path/to/workspace
node skills/tensornote-knowledge-workspace/scripts/validate-workspace.mjs /path/to/workspace --strict
node skills/tensornote-knowledge-workspace/scripts/validate-workspace.mjs /path/to/workspace --json
```

Normal mode fails on unsafe or structurally invalid data and reports quality warnings. Strict mode also fails on warnings. JSON mode is suitable for CI or another agent.

## Completion checklist

- Confirm all created links and local assets resolve.
- Confirm Frontmatter IDs are unique and the visible H1 matches the title.
- Confirm executable cells have stable `lab`, sequential `cell`, useful `title`, and explicit `difficulty` metadata.
- Confirm declared environment files exist or clearly report that the user must add them.
- Confirm the user knows which of TensorNote, Jupyter, and Git Bridge must be running for the requested workflow.
- Preserve a clean, reviewable Git diff and state whether changes were committed or pushed.
