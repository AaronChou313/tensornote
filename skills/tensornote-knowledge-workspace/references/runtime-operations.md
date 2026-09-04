# Installation and runtime operations

## Contents

1. Process model
2. Frontend setup
3. Python environment choices
4. Kernel and Jupyter setup
5. TensorNote settings
6. Daily startup and shutdown
7. Git Bridge
8. Build and deployment
9. Publish a public Workspace
10. Troubleshooting

## 1. Process model

TensorNote uses up to three independent local processes:

```text
TensorNote frontend :5173
├── Jupyter Server :8888       optional for Python execution
└── Git Bridge :4318           optional for local Git UI
```

Reading/editing needs only TensorNote. Labs need TensorNote plus Jupyter. The Git workspace needs TensorNote plus Git Bridge. All three are needed only when editing, executing, and using Git UI together.

## 2. Frontend setup

Install Git, Node.js 22 or later, and pnpm. In the TensorNote application repository:

```bash
pnpm install
pnpm dev --host localhost --port 5173 --strictPort
```

Open `http://localhost:5173`. Use a current Chrome or Edge build for local directory write access. Built-in and public GitHub Workspaces remain available without directory access.

## 3. Python environment choices

Choose exactly one environment method. Python 3.11 is the conservative default.

### Conda

```bash
conda create -n tensornote python=3.11 pip -y
conda activate tensornote
python -m pip install --upgrade pip
python -m pip install -r requirements-jupyter.txt
```

### Standard venv

```bash
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements-jupyter.txt
```

Windows PowerShell activation: `.venv\Scripts\Activate.ps1`.

### uv

```bash
uv python install 3.11
uv venv .venv --python 3.11
source .venv/bin/activate
uv pip install -r requirements-jupyter.txt
```

Do not mix environment managers for the same environment. Do not commit `.venv`, Conda environments, caches, or tokens.

## 4. Kernel and Jupyter setup

With the selected environment active, register once:

```bash
python -m ipykernel install --user --name tensornote --display-name "Python (TensorNote)"
jupyter kernelspec list
```

Start Jupyter locally:

```bash
jupyter server \
  --ip=127.0.0.1 \
  --port=8888 \
  --no-browser \
  --ServerApp.allow_origin=http://localhost:5173
```

Keep token authentication enabled. Obtain the URL and token with `jupyter server list`. Never use `allow_origin=*` merely to bypass CORS.

## 5. TensorNote settings

Open Settings → Compute and configure:

- Server URL: `http://127.0.0.1:8888`
- Token: the current Jupyter token
- Kernel: `tensornote`
- Session scope: per-note for isolation, per-workspace for shared notebook state, or manual for explicit lifecycle control

Run diagnostics before debugging individual cells. For a Workspace without `features.executable: true`, enable **Allow current Workspace to execute code** only after reviewing its code. This local choice does not rewrite the manifest.

## 6. Daily startup and shutdown

Terminal A, when running Labs:

```bash
conda activate tensornote
# or: source .venv/bin/activate
jupyter server --ip=127.0.0.1 --port=8888 --no-browser --ServerApp.allow_origin=http://localhost:5173
```

Terminal B, always:

```bash
pnpm dev --host localhost --port 5173 --strictPort
```

Terminal C, only for local Git UI:

```bash
pnpm git:bridge -- --workspace "/absolute/path/to/markdown-workspace"
```

Shut down running cells/Kernel first, then Git Bridge, frontend, and Jupyter with `Ctrl+C`. Do not kill processes blindly when another project may own the port.

## 7. Git Bridge

The Bridge must point at the same local Workspace selected in the browser and that directory must be a Git repository root. It binds to loopback and exposes structured status/diff/history/stage/unstage/commit operations only. It does not provide clone, push, pull, credentials, merge, rebase, or arbitrary shell execution.

Use system Git for remote synchronization. Inspect dirty editor drafts before staging; unsaved browser content is not part of a Git commit.

## 8. Build and deployment

Run the application release gate after source changes:

```bash
pnpm check
pnpm test:performance
pnpm audit --prod --audit-level high
```

Static build:

```bash
VITE_TENSORNOTE_DEPLOYMENT=static VITE_BASE_PATH=/tensornote/ pnpm build
```

Self-hosted build when Docker is available:

```bash
docker compose up --build -d
```

Static and self-hosted modes share the same web runtime. Server-mounted Workspace access is not implied.

## 9. Publish a public Workspace

Add a root License and a `publishing` block with `title`, `description`, `defaultNote`, and optional safe relative `logo` / six-digit `accent`. Copy `assets/publish-tensornote.yml` to `.github/workflows/publish-tensornote.yml`, enable GitHub Actions as the Pages source, and push to `main`.

Before publishing, run the strict Workspace validator and the application repository's publication validator. The Workflow pins the reader to the caller's full commit SHA. Never add Jupyter Tokens, `.env`, private keys, cookies, or provider credentials to make a public example run. Public code still requires each reader's explicit execution permission, GitHub revision trust, and their own Compute Provider.

## 10. Troubleshooting

- Port 5173 changes: restart with `--strictPort` and keep Jupyter `allow_origin` identical.
- Server unreachable: confirm Jupyter is still running on `127.0.0.1:8888`.
- Authentication failure: refresh the session Token from `jupyter server list`.
- Kernel missing: activate the intended environment and repeat the `ipykernel install` command.
- WebSocket/CORS failure: keep explicit localhost origins and inspect the built-in diagnostic stage that failed.
- Execution disabled: inspect manifest/local permission, future-schema compatibility, and GitHub revision trust.
- Lab card missing: validate exact `python exec` syntax and metadata; plain Python fences are display-only.
- Git unavailable: confirm the Workspace is local, Git Bridge is running, and its root matches the selected directory.
