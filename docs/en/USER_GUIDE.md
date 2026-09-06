# TensorNote user guide

[中文（默认）](https://github.com/AaronChou313/tensornote/blob/main/docs/zh-CN/USER_GUIDE.md) · English

For version 1.6.0. Follow download → open → configure only what you need → daily use. Reading and editing Markdown require no Jupyter installation. Running Python requires a compute environment. TensorNote does not host your knowledge base or provide public compute resources.

<a id="choose"></a>
## 1. Choose your edition

| | Online Web (GitHub Pages) | Local Web | Desktop |
| --- | --- | --- | --- |
| Get started | Open the website | Download Local Web; install Node.js 22+ | Install the package for your OS and architecture |
| Open notes | Examples, public GitHub, local folders¹ | Examples, public GitHub, local folders¹ | Examples, public GitHub, native local folders |
| Edit and save | Authorized local folders; GitHub/examples are read-only | Authorized local folders | Local folders |
| Python | HTTPS Jupyter / JupyterHub / BinderHub | Local Jupyter or HTTPS remote services | Discover environments, create a basic environment, start Jupyter; remote connections also supported |
| Git | No local Git integration | Optional Git Bridge and system Git | System Git; no Bridge |
| Offline use | Cached pages do not imply full offline support; GitHub and remote compute need a network | Local app, notes and an installed local Python environment work offline | Local notes and an installed local Python environment work offline |
| Best fit | Quick exploration, sharing, team compute | Browser workflow without a desktop installation | Daily knowledge management and local experiments |

¹ Local folder access requires Chrome/Edge with File System Access API support and your explicit folder selection and permission. Safari/Firefox users can read examples or GitHub; use Desktop for local editing. A browser's local folder is on the reader's computer, not the website server.

All editions use portable Markdown, assets and `tensornote.yaml`. GitHub sources resolve to a fixed revision and remain read-only; clone or download a copy and open it locally to edit. Current Git operations are status, diff, stage and commit. **Push, Pull, Clone and branch switching are not implemented**; use a Git client for remote synchronization.

## 2. Download and open

### Online Web

Open [TensorNote online](https://aaronchou313.github.io/tensornote/) and select **AI Learning Notes** to read the example workspace. Enter `owner/repository` to open a public knowledge repository. No TensorNote account is required.

### Local Web

1. Download `TensorNote-local-web-1.6.0.tar.gz` from [GitHub Releases](https://github.com/AaronChou313/tensornote/releases) and extract it.
2. Install Node.js 22 or newer. Initial downloads require a network. The package contains the compiled application: **no pnpm, npm install or frontend build is needed**.
3. Open a terminal in the extracted `TensorNote-local-web` directory and run:

```sh
node start.mjs
```

4. Open `http://127.0.0.1:5173` in Chrome/Edge. Choose “打开本地 Workspace” (Open local Workspace), select your Markdown folder and allow read/write access.
5. Keep the terminal running. Press `Ctrl+C` there to stop; run the same command next time.

Do not double-click `app/index.html`. If port 5173 is occupied, stop the other local web server first. Keep using the same address: `localhost` and `127.0.0.1` have separate browser permissions, settings and token storage.

`TensorNote-web-1.6.0.tar.gz` is a Static Web deployment archive built for the `/tensornote/` path, not the Local Web launcher. GitHub's automatic “Source code” archives are for developers.

### Desktop

Choose the installer for your OS and architecture from Release Assets. macOS builds distinguish Apple Silicon (aarch64/arm64) and Intel (x64). The pipeline also provides Windows/Linux x64 packages; consult the release notes for actual installation testing coverage.

1. Install and open TensorNote. On macOS, drag it into Applications before launching.
2. Select “打开本地 Workspace” to open existing notes, or “新建 Workspace” to select an empty folder.
3. Create a note in the file tree, write and save. Return through the recent workspaces list next time.
4. Reading and writing require no Node.js, web server or Python setup.

This GitHub community distribution does not have Apple Developer ID notarization or a trusted Windows publisher signature. Your OS may display an unidentified developer warning. Check the release source and `SHA256SUMS`, then use the OS-provided “Open Anyway” or “More info” process only if you trust that package. Organization-managed devices may block installation. Updater signature verification is separate from OS publisher signing. Do not disable system-wide security protection.

## 3. Read, write and organize

- Overview provides workspace entry points and statistics. Files in the sidebar is the folder tree; collapsing a section differs from hiding the whole sidebar.
- Switch between reading, editing and split preview. Save writes changes to Markdown. Resolve unsaved drafts or external modification conflicts before overwriting.
- WikiLinks, backlinks, tags and Properties connect knowledge. Images and attachments remain in the workspace folder.
- Bundled examples are read-only. Open your own local copy to edit them.
- Markdown is durable content. Lab outputs, Scratch code and Kernel memory are not automatically saved notes. Explicitly save code, export or copy important results.

<a id="compute"></a>
## 4. Connect Jupyter when you need Python

Open a workspace, then **Settings → Compute & Jupyter** (“设置 → 计算与 Jupyter”). Review the code before enabling execution. GitHub sources also require trust in the fixed revision; review again after the revision changes. Enter tokens only in the dedicated application field, never in notes, repositories or sharing links.

### Online Web: use your own online compute service

Use **Generic Jupyter** for an existing HTTPS Jupyter server, **JupyterHub** for a school or team platform, or **BinderHub** for temporary experiments from a public repository. TensorNote does not turn an arbitrary notebook website's sharing link into a Jupyter API endpoint.

**Generic Jupyter**

1. Obtain the actual Jupyter Server base address (for example `https://compute.example.org/user/me/`), your token and the internal kernel name from your provider.
2. Add a Remote Server profile. Enter the address without `?token=`, then the token and kernel name separately.
3. The service must allow the TensorNote Origin, `https://aaronchou313.github.io`, and forward Kernel WebSockets. The Origin excludes `/tensornote/`.
4. Run connection diagnostics, then open an experiment card and run a simple cell first.

**JupyterHub**

1. Sign in to your own Hub account and obtain a revocable personal API token permitted by your organization.
2. Add a JupyterHub profile with the HTTPS Hub base address and your token. Leave username blank for token-based identity discovery, or supply your own username. Set a named server if applicable.
3. Both the Hub and the single-user server must allow the TensorNote Origin. Administrators must also enable compatible token WebSocket access. Signing into the Hub website alone does not guarantee cross-origin API access.
4. Prepare the connection and run diagnostics. TensorNote can reuse an existing server; it only stops a server that it started and still owns during the current session.

**BinderHub**

1. Open a public GitHub workspace and review its fixed commit and environment files.
2. Add a BinderHub profile with the platform's HTTPS address and a complete 40-character commit SHA. The current GitHub workspace can supply the repository and revision.
3. Explicitly connect and wait for the build and launch. Diagnostics alone do not start a build.
4. Public Binder can queue, time out or run out of capacity. Save important results elsewhere: temporary environments are reclaimed and do not write back to GitHub automatically.

An online HTTPS page cannot directly connect to `http://127.0.0.1:8888`. Use Desktop or Local Web for local Python instead of disabling browser security checks.

### Local Web: start your own local Jupyter

Install basic packages in a separate Python environment; the initial installation needs a network:

```sh
python3 -m venv .venv
# macOS / Linux
source .venv/bin/activate
# Windows PowerShell: .venv\Scripts\Activate.ps1
python -m pip install jupyter-server ipykernel numpy matplotlib
python -m ipykernel install --user --name tensornote --display-name TensorNote
python -m jupyter_server --no-browser --ServerApp.ip=127.0.0.1 --ServerApp.port=8888 --ServerApp.allow_origin=http://127.0.0.1:5173
```

On Windows, use your installed `python` if `python3` is unavailable. In the application's Local Python profile, enter `http://127.0.0.1:8888`, the token printed by Jupyter and kernel name `tensornote`. Keep the Jupyter terminal open. Do not publish token-bearing terminal screenshots or set `allow_origin` to `*`. Your Python environment, application package and knowledge folder can live in separate locations.

### Desktop: use the runtime assistant

1. In Compute & Jupyter settings, rescan and select an environment that has Jupyter installed.
2. Choose “启动并使用” (Start and use). TensorNote starts local Jupyter and connects automatically; you do not need to copy its random token.
3. If no environment is suitable, review the “Create TensorNote Managed Environment” plan and confirm as shown. A supported Python/environment tool is still required, and downloading basic packages requires a network.
4. The basic environment does not include the entire PyTorch/CUDA stack. Review and install additional notebook dependencies yourself.
5. Stop it when finished. Exiting TensorNote cleans up Jupyter processes started by TensorNote during this session, without stopping independently started services.

### If the connection fails

Follow the diagnostics order: address/protocol → running server → token → CORS Origin → available kernel → WebSocket/proxy. Fix one issue and retry; repeatedly creating profiles will not fix server configuration. You can copy a redacted diagnostic report, but review it for private information before sharing.

## 5. Enable Git when needed

### Desktop

Install system Git and open a knowledge folder that is already a Git repository. Use the Git page to inspect status and diffs, stage files, enter a message and commit. No Bridge is needed.

### Local Web

Check that `git --version` works in a terminal. Use an existing repository or run `git init` in a new knowledge folder. Open another terminal in the **extracted application directory**:

```sh
node scripts/git-bridge.mjs --workspace "/absolute/path/to/your-vault"
```

Replace the example with the **Git root of the knowledge folder currently open in your browser**, not the application package directory. Connect to `http://127.0.0.1:4318` on the Git page. The Bridge listens only on loopback and checks the browser Origin; defaults allow `http://127.0.0.1:5173` and `http://localhost:5173`. Closing its terminal disables Git integration without stopping local reading or editing.

For a custom Web Origin, set `TENSORNOTE_ORIGIN` to that complete Origin before starting the Bridge; do not use a wildcard. Source developers can alternatively run `pnpm git:bridge -- --workspace "..."`.

### A commit is not a sync

Recommended sequence: save notes → inspect Diff → stage selected files → Commit → Push using a Git client. On another device, Pull first, then open or refresh the workspace. Configure author identity in the knowledge repository if needed:

```sh
git config user.name "Your Name"
git config user.email "you@example.com"
```

Manage remotes, authentication, Push/Pull, branches and conflicts in your Git client. TensorNote does not store your GitHub password or silently overwrite conflicts. The Bridge and Jupyter are separate optional services: one manages local Git; the other runs Python.

## 6. Give an agent the knowledge workspace skill

Download `TensorNote-agent-skill-1.6.0.tar.gz` from the same release. Extract it and give a skill-capable agent `tensornote-knowledge-workspace/SKILL.md` together with its containing directory. Do not copy only the title or omit referenced files. Explicitly identify your knowledge folder so the agent does not edit TensorNote's application source by mistake.

Suggested request: “Review and update this knowledge folder using the supplied skill. Preserve Schema v1, stable note IDs, WikiLinks, executable cell metadata and relative asset paths. Read existing content first, run the bundled validator after changes, summarize your edits and never write tokens into files.”

Install the skill's own dependencies from its directory, then run its standalone validator:

```sh
npm ci
node scripts/validate-workspace.mjs "/absolute/path/to/your-vault" --strict
```

The agent maintains portable Markdown through file access. This is not a remote interface exposing arbitrary Desktop shell commands. Format rules and maintenance instructions ship in the skill's references and templates.

## 7. Update, back up and report issues

- Save notes and back up the whole knowledge folder, including assets and `tensornote.yaml`, before updating. Keep it separate from the application installation.
- Local Web: stop the server, extract the new version into a new directory, run its `node start.mjs`, and authorize the existing knowledge folder again. Do not store personal notes inside `app/`.
- Desktop: check for updates in Settings or download the correct architecture's new installer. Do not forcibly replace the application while it is writing or executing.
- Online: reload the website. If stale cache causes style problems, save local drafts first, then refresh or clear this site's cache. Clearing site data may remove device preferences, permissions and session tokens, but does not delete Markdown in your folder.
- If the sidebar is missing, check the sidebar toggle and window width. Version 1.6.0 fixes conflicting sidebar transform rules shared by Web and Desktop. For remaining issues, include version, OS, window dimensions and a screenshot without private content.
- Report reproducible issues through [GitHub Issues](https://github.com/AaronChou313/tensornote/issues). Do not upload private workspaces, tokens or credentials.

## Server-side references

[Jupyter Server](https://jupyter-server.readthedocs.io/en/latest/operators/public-server.html) · [JupyterHub REST API](https://jupyterhub.readthedocs.io/en/stable/howto/rest.html) · [Binder usage limits](https://mybinder.readthedocs.io/en/latest/about/user-guidelines.html)

Refreshing a workspace overview returns to Home; reopen it from Recent. Browser folder permission may need to be granted again.
