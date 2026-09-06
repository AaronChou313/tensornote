<p align="center"><img src="assets/images/TensorNote_logo_wide.png" alt="TensorNote" width="760"></p>

# TensorNote

[中文（默认）](README.md) · English

**Keep knowledge in ordinary Markdown files. Read, write, connect ideas and run Python experiments in one workspace.**

[Try online](https://aaronchou313.github.io/tensornote/) · [Download](https://github.com/AaronChou313/tensornote/releases) · [User guide](docs/en/USER_GUIDE.md) · [Release notes](docs/releases/v1.6.0.en.md)

[![CI](https://github.com/AaronChou313/tensornote/actions/workflows/ci.yml/badge.svg)](https://github.com/AaronChou313/tensornote/actions/workflows/ci.yml) [![Release](https://img.shields.io/github/v/release/AaronChou313/tensornote?color=4f8061)](https://github.com/AaronChou313/tensornote/releases/latest) [![License](https://img.shields.io/badge/license-Apache--2.0-5d7869)](LICENSE)

![TensorNote reading workspace](docs/images/v1.6.0/web-reading.jpg)

Content, properties, links and experiments live in Markdown, assets and `tensornote.yaml`. Indexes, graphs and Database views can be rebuilt from these files. There is no proprietary content database. A quiet white and pale-green workbench also supports a dark theme.

## Choose your edition

| | Online Web | Local Web | Desktop |
| --- | --- | --- | --- |
| Start | Open GitHub Pages | Download Local Web; run `node start.mjs` with Node.js 22+ | Install the package for your OS/architecture |
| Sources | Examples, public GitHub, authorized local folders¹ | Same | Examples, public GitHub, native local folders |
| Edit/save | Authorized local folders¹; GitHub/examples are read-only | Authorized local folders¹ | Local folders |
| Python | HTTPS Jupyter, JupyterHub, BinderHub | Local Jupyter or HTTPS remote compute | Local environment assistant and remote compute |
| Git | No local integration | Optional Git Bridge + system Git | System Git; no Bridge |
| Offline | Limited page cache; remote content/compute require network | Local app, notes and installed Python work offline | Local notes and installed Python work offline |
| Best for | Quick exploration and sharing | Browser workflows | Daily knowledge management and experiments |

¹ Browser folder editing requires Chrome/Edge's File System Access API and explicit directory permission. Safari/Firefox can read remote sources; use Desktop for local authoring. Reading and writing require no Jupyter in any edition. Initial tool/dependency downloads, GitHub and remote compute require a network.

## Download, open, use

**Quickest trial:** open [Online Web](https://aaronchou313.github.io/tensornote/) and select **AI Learning Notes**. To edit examples, download/clone your own copy and open its local directory.

**Local Web:** download `TensorNote-local-web-1.6.0.tar.gz` from [Releases](https://github.com/AaronChou313/tensornote/releases), extract it and run in that directory:

```sh
node start.mjs
```

Open `http://127.0.0.1:5173` in Chrome/Edge and select a Markdown folder. The app is already compiled: no pnpm, frontend dependency installation or build is needed. Keep the terminal open; `Ctrl+C` stops it. Keep personal knowledge outside the package's `app/` directory.

**Desktop:** download the correct OS/CPU installer → install → open a local workspace → create, edit and save a note. No Node.js or web server is needed. Choose the correct Apple Silicon or Intel macOS package.

GitHub community distribution does not require a paid developer account. Current packages lack Apple Developer ID notarization and a trusted Windows publisher signature, so your OS may show a warning. Verify the source and `SHA256SUMS`, then follow the [installation guide](docs/en/USER_GUIDE.md#2-download-and-open). Updater cryptographic signatures remain required. Release notes state actual test coverage; a clean-machine test pass on every OS is not claimed.

`TensorNote-web-1.6.0.tar.gz` is the Static Web archive for deployment at `/tensornote/`. GitHub's automatic Source code archives are for development. Local browser users should choose **local-web**.

## Configure experiments and Git only when needed

- **Online compute:** Settings → Compute & Jupyter → Generic Jupyter / JupyterHub / BinderHub. Use your own HTTPS endpoint, identity and kernel. The service must allow the TensorNote Origin and WebSockets. A notebook sharing link is not a server endpoint. See the [compute walkthrough](docs/en/USER_GUIDE.md#compute).
- **Local Web experiments:** start Jupyter in your own Python environment, enter its address, token and kernel, then run diagnostics. The guide supplies commands.
- **Desktop experiments:** discover environments → select one → Start and use. Review the basic installation plan if needed; separately review and install PyTorch/CUDA or other notebook dependencies.
- **Local Web Git:** in the application package directory, run `node scripts/git-bridge.mjs --workspace "/absolute/path/to/your-vault"` in another terminal. Connect to `http://127.0.0.1:4318` on the Git page. The knowledge folder must be a Git repository.
- **Desktop Git:** install system Git and open your repository. No Bridge is required.

The Git workbench supports status, diff, stage/unstage, history and commit. **A commit does not upload to GitHub. Use a Git client for Push/Pull, Clone, branches and remote authentication.**

## Features

- Markdown editing, equations, Mermaid, attachments, properties, draft recovery and external-change conflict protection.
- WikiLinks, backlinks, tags, outlines, local graphs, full-text search and learning progress.
- Independent tabs and split reading/editing panes, a command palette, light/dark themes and a responsive sidebar.
- Multi-cell Python Lab, Scratch, sequential execution, interrupt/restart, compute profiles and diagnostics.
- Frontmatter-based Database with Table, Card and List views.
- Fixed-revision GitHub sharing and knowledge publication; execution requires explicit permission.
- Portable Schema v1, an agent skill, templates and strict validation.

## Current screenshots

Real 1.6.0 Web/Desktop screenshots using bundled example content.

| Local Web home | Desktop reading |
| --- | --- |
| ![Local Web](docs/images/v1.6.0/local-web-home.jpg) | ![Desktop](docs/images/v1.6.0/desktop-reading.jpg) |

## Let an agent maintain your knowledge base

Download the matching `TensorNote-agent-skill-1.6.0.tar.gz`. Give the agent the extracted `SKILL.md` **and all referenced files**, and explicitly identify your knowledge folder. It can generate and update notes, maintain links/assets, check prerequisites and run the bundled validator.

Install the skill's own dependencies in its directory, then validate:

```sh
npm ci
node scripts/validate-workspace.mjs "/absolute/path/to/your-vault" --strict
```

This is a portable file-based maintenance protocol, not an arbitrary Desktop shell endpoint. Never put tokens, passwords or keys in the knowledge repository or Git.

## Documentation and development

- [English user guide](docs/en/USER_GUIDE.md) / [中文使用说明](docs/zh-CN/USER_GUIDE.md): installation, reading/writing, compute, Git, agents, updates and troubleshooting.
- Maintainer references (Chinese): [platform contracts](docs/PLATFORM_CONTRACTS.md), [architecture](docs/ARCHITECTURE.md), [host boundaries](docs/HOST_FEATURE_MATRIX.md), [development](docs/DEVELOPMENT.md), [handoff](docs/AGENT_HANDOFF.md), [release matrix](docs/RELEASE_MATRIX.md).

Source development requires Node.js 22+ and pnpm 11:

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm check
```

Desktop development also requires Rust and platform build tools; run `pnpm dev:desktop`. Workspace Schema v1 remains the compatibility boundary. Report reproducible issues or improvements through [Issues](https://github.com/AaronChou313/tensornote/issues), removing private content first. Licensed under [Apache-2.0](LICENSE).
