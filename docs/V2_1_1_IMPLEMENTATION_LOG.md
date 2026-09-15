# TensorNote v2.1.1 Implementation Log

Baseline: `v2.1.0` development state (`532b293`)

Scope: reading layout, per-note session scroll state, path-based file identity, root overview selection, Sidecar authoring UX, and synchronized knowledge-workspace Skill/validator updates.

Excluded: Desktop updater, release signing, cloud sync, accounts, plugin/database/graph/git-client expansion, new Sidecar types, split-pane editing, and AI features.

## Completed phases

- [x] Phase 1 — Removed the obsolete 286px reading column, widened centered prose to 900px, and conservatively removed unreferenced Knowledge Panel, graph, extension status, and split-workbench CSS.
- [x] Phase 2 — Added per-note session scroll positions on the real workbench scroll container with animation-frame recording, workspace reset, and explicit heading priority.
- [x] Phase 3 — Separated path file identity from explicit semantic IDs, encoded path identities in routes, retained ambiguous-link behavior, displayed filesystem filenames, and fixed root-only Overview selection tests.
- [x] Phase 4 — Added a unified Sidecar menu, auto IDs, Derivation edit/preview, Python-aware multi-Cell editing and ordering, source-range edit/delete, confirmation, and line-addressable diagnostics.
- [x] Phase 5 — Updated the bundled Skill, authoring/Sidecar references, Validator, templates, user guides, compute guide, release notes, and a duplicate-filename fixture.
- [x] Phase 6 — Completed application, Static Web, performance, supply-chain audit, Skill, Validator, and Rust Desktop checks.

## Verification

- `pnpm check`: 53 test files / 212 tests passed; ESLint passed; production Vite build passed.
- `pnpm build:web`: Static build passed and contained no Tauri IPC surface.
- `pnpm test:performance`: 3 tests passed.
- `pnpm audit --prod`: no known vulnerabilities.
- `pnpm check:desktop`: formatting, Clippy with warnings denied, and 15 Rust tests passed.
- Skill `quick_validate.py`: passed.
- Workspace and course templates: strict validation passed with zero findings.
- Repository Workspace validator and `git diff --check`: passed.

GitHub anonymous API quota prevented using the current public remote repository as a visual reading-page fixture. This did not affect local builds or deterministic checks.
