<p align="center"><img src="src/assets/TensorNote_logo_wide.png" alt="TensorNote" width="420"></p>

# TensorNote 2.1

**A Markdown source-of-truth workspace for technical knowledge, with Sidecars for complete derivations and executable Python.**

[Try Web](https://aaronchou313.github.io/tensornote/) · [Download Desktop](https://github.com/AaronChou313/tensornote/releases) · [中文](README.md) · [User guide](docs/en/USER_GUIDE.md)

TensorNote reads ordinary Markdown, assets, and `tensornote.yaml`. Notes remain readable in any editor; indexes are rebuildable; credentials and runtime state stay outside the knowledge repository.

## Start from the knowledge home

The home page combines recent knowledge bases with three actions: open local, create local, and open online. The compact `Web` / `Desktop` badge identifies the current host, and the adjacent guide link opens this documentation. TensorNote no longer opens a bundled example automatically.

Creating a local knowledge base asks for a name and parent directory, then creates and opens a real portable structure:

```text
Knowledge Base/
├── tensornote.yaml
├── notes/
└── assets/
```

## Choose a host

| | Web | Desktop |
| --- | --- | --- |
| Best for | Reading and sharing public online knowledge; browser-authorized local folders | Long-term local authoring, management, and execution |
| Sources | Public GitHub, GitLab, and Gitee; local folders in supported browsers | Public GitHub, GitLab, and Gitee; native local folders |
| Editing | Local folders only after browser write permission | Native local editing, recovery, and external-change protection |
| Jupyter | Compatible HTTPS Jupyter, JupyterHub, or BinderHub | Managed local environments or manual local/remote connections |
| Offline | Static app and local folders; remote sources need a network | Local notes and installed Python environments |

All remote providers are public and read-only. They require no account or token and cannot write back to the repository. TensorNote has no Git workbench; use Git CLI or a dedicated Git client for synchronization.

## Start using TensorNote

**Web:** open the [online app](https://aaronchou313.github.io/tensornote/), choose “Open online knowledge base,” and paste a public GitHub, GitLab, or Gitee repository URL. An optional branch or ref is supported. Current Chrome and Edge can also open or create a browser-authorized local folder. Sharing follows the current branch by default; the advanced option pins the current commit. Legacy GitHub reader links remain supported. Configure an HTTPS remote runtime for Jupyter Sidecars.

**Desktop:** download the package for your OS and CPU from [Releases](https://github.com/AaronChou313/tensornote/releases), then open an existing folder or create a knowledge base under a selected parent directory. Reading and editing need no Node.js, Vite, Jupyter, or extra TensorNote service. For Jupyter Sidecars, select or create a Conda/uv/venv environment under Settings, or use a manual connection.

Community packages may lack Apple notarization or a Windows publisher signature. Verify `SHA256SUMS` and follow the [installation guide](docs/en/USER_GUIDE.md).

## Core

- One-note Workbench with a real filesystem tree, tabs, history, search, Outline, reading, and source editing.
- Markdown properties, WikiLinks, equations, Mermaid, assets, safe HTML, and draft recovery.
- `derivation` and `jupyter` Sidecars in one resizable SidePanel.
- Local plus GitHub/GitLab/Gitee public read-only providers, metadata caching, and useful GitHub quota reset messages.
- Workspace Schema v1, remote revision trust, future-schema read-only fallback, and device-secret separation.

Legacy `python exec` Labs remain readable and adapt to Jupyter Sidecars. New content uses the `:::tensornote{...}` directive. See [platform contracts](docs/PLATFORM_CONTRACTS.md).

## Agent-maintained knowledge

Releases include `TensorNote-agent-skill-X.Y.Z.tar.gz`. Give the complete skill directory and exact knowledge-base root to a skill-capable agent. It can create, update, organize, and validate Markdown, links, assets, and Sidecars using the portable format.

```sh
cd tensornote-knowledge-workspace
npm ci --ignore-scripts
node scripts/validate-workspace.mjs "/absolute/path/to/workspace" --strict
```

The skill needs neither TensorNote nor Jupyter and grants no execution authority. See the [agent interface](docs/AGENT_INTEGRATION.md).

## Development

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm check
```

Desktop development also needs Rust and platform build tools. Licensed under [Apache-2.0](LICENSE).
