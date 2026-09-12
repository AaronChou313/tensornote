# TensorNote host and Jupyter operations

TensorNote has two product hosts. Web is deployed static/self-hosted and connects only to compatible remote HTTPS compute. Desktop opens native folders and may discover/create Conda, uv, or venv environments and launch loopback Jupyter. Reading and editing never require Jupyter.

For Desktop convenient connection, use Settings → Compute & Jupyter → Local runtime, review the selected environment and full path, then start and connect. Manual connection accepts an already-running server. For Web, use Remote runtime with Direct Jupyter, JupyterHub, or BinderHub and run diagnostics.

Execution requires Workspace permission and, for GitHub, trust in the exact revision. Keep tokens in the current session only. TensorNote 2.0 has no Git Bridge; use a dedicated Git client after saving editor changes.

Application development uses Node.js 22 and pnpm. Run `pnpm dev` for Web development and `pnpm dev:desktop` for Desktop. Release checks use `pnpm check`, `pnpm test:performance`, production audit, `pnpm build:web`, and Desktop/Rust checks.
