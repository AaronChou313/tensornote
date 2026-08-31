# Workspace configuration specification

## Contents

1. Layout
2. `tensornote.yaml` schema v1
3. Capability and compatibility rules
4. Environment declarations
5. Secrets and trust
6. Creation checklist

## 1. Layout

A portable Workspace uses this minimum structure:

```text
my-knowledge-base/
├── tensornote.yaml
├── notes/
│   └── 00-start-here.md
├── assets/
└── requirements.txt       # optional
```

The Workspace root is the directory selected in TensorNote. It may be a standalone repository and does not need to be inside the TensorNote application source tree.

## 2. `tensornote.yaml` schema v1

```yaml
schemaVersion: 1

workspace:
  name: My Knowledge Base
  description: Portable Markdown notes

content:
  root: notes

assets:
  root: assets

navigation:
  mode: filesystem

features:
  executable: false

environment:
  files:
    - requirements.txt

extensions: {}
```

Rules:

- Keep `schemaVersion` equal to `1` for TensorNote 1.x.
- Use Workspace-relative normalized paths. Do not use absolute paths or `..` segments.
- `navigation.mode` is currently `filesystem`.
- Default `features.executable` to `false` for new or imported content. Enable it only for an intentionally executable repository.
- Put extension-owned data below `extensions` and preserve unknown fields.
- A folder without a manifest remains readable with safe defaults and execution disabled.

## 3. Capability and compatibility rules

Local browser-selected Workspaces can be readable and writable when the browser grants permission. Bundled and GitHub Workspaces are normally read-only. UI behavior follows reported Provider capabilities, not assumptions based on source type.

TensorNote migrates a manifest without `schemaVersion` to v1 in memory without rewriting it. A manifest with a future schema remains Markdown-readable but becomes read-only, Git-disabled, and non-executable. Do not attempt to bypass that downgrade.

## 4. Environment declarations

Declare only environment entry files that belong to the Workspace:

```yaml
environment:
  files:
    - requirements.txt
    - pyproject.toml
    - environment.yml
```

TensorNote detects and displays these files. It does not install them automatically. Keep dependency sets reproducible and avoid unnecessary heavyweight packages.

## 5. Secrets and trust

Never store Jupyter tokens, passwords, API keys, cookies, SSH keys, or extension secrets in the manifest or notes. Jupyter tokens belong in TensorNote's session-only Compute settings.

Execution policy is explicit:

- Manifest `features.executable: true` provides a repository default.
- Settings → Compute can create a device-local Workspace override without rewriting the manifest.
- GitHub content additionally requires explicit trust bound to the current `owner/repository@commitSHA`.
- A future schema always disables execution regardless of local preference.

## 6. Creation checklist

- Choose a stable Workspace name and concise description.
- Create the content and asset roots before opening the Workspace.
- Add a start/overview note with a unique ID.
- Add the real environment file or remove it from `environment.files`.
- Initialize Git if version history is desired; do not commit environment folders or secrets.
- Open the root directory in TensorNote and confirm document count, read/write tag, search, and navigation.
- Enable execution only after reviewing the repository's executable cells.
