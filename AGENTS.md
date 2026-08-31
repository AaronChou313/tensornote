# TensorNote agent instructions

TensorNote is a local-first, Markdown-first executable knowledge workspace. Preserve Markdown, assets, and `tensornote.yaml` as the portable source of truth.

## Knowledge Workspace tasks

For creating, editing, reviewing, configuring, validating, or operating a TensorNote knowledge base, read `skills/tensornote-knowledge-workspace/SKILL.md` completely and follow its reference routing. Use the bundled templates and validator instead of inventing a second format.

The repository root is both the TensorNote application source and the bundled example Workspace. An external user Workspace is a separate directory selected in the browser. Resolve which one is in scope before writing.

Never write tokens, passwords, private keys, cookies, or extension secrets into Markdown, Frontmatter, manifests, fixtures, logs, screenshots, or Git.

## Application tasks

- Treat `src/platform/index.ts` and `docs/PLATFORM_CONTRACTS.md` as the v1 public boundary.
- Preserve Workspace Schema v1 compatibility, Provider capability checks, execution permission, GitHub revision trust, and future-schema read-only downgrade.
- Do not couple UI code to a specific Workspace or Compute Provider when a stable interface exists.
- Keep Settings/Secret storage separate from Workspace content.

## Verification

- Knowledge-only change: run the skill validator and `git diff --check`.
- Skill change: run `quick_validate.py`, validate the workspace template with `--strict`, run the validator against this repository, and execute any changed scripts.
- Application source change: run `pnpm check`; add `pnpm test:performance`, production audit, and Static build for release candidates.
- Preserve unrelated user changes and report whether work was committed, pushed, tagged, or released.
