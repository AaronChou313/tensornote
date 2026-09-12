# TensorNote 2.0 User Guide

## 1. Choose a host

Web is for quick reading, public GitHub sharing, and remote Jupyter. Desktop is for long-term local Markdown authoring and local Python. The browser development server is not a separate edition.

## 2. Web

Open the online app and choose the built-in Workspace or paste a public repository URL under GitHub. Use the generated fixed-revision share link. A browser-authorized local folder can be opened when the browser supports it.

For a Jupyter Sidecar, open Settings → Compute & Jupyter → Remote runtime, configure Direct Jupyter, JupyterHub, or BinderHub, run diagnostics, and trust the exact GitHub revision. Web cannot start Python on the reader's computer or bypass HTTPS mixed-content rules. Never place a token in Markdown or a share URL.

## 3. Desktop

Download the package for the correct OS and CPU, verify `SHA256SUMS`, install, and select a knowledge-folder root. Markdown, assets, and `tensornote.yaml` remain in that folder. No Vite or TensorNote service is required.

Files mirrors the filesystem. Search and tabs switch notes; TopBar Outline navigates within the current note. Properties opens only while editing. Saves use disk conflict checks and unsaved drafts stay in device recovery storage.

For Jupyter, use Settings → Compute & Jupyter → Local runtime. Convenient connection selects or creates a Conda/uv/venv environment and shows its full path before launch. Manual connection uses a server you start. Remote runtime matches Web. Reading and editing need no Python.

## 4. Sidecars

A trigger opens the unified SidePanel. Derivation renders complete Markdown reasoning; Jupyter provides multiple Python cells sharing one Kernel. The panel is resizable, preserves the main reading position, and closes when the note changes.

The editor inserts both Sidecar types. Legacy `python exec` Labs remain readable; new content uses `:::tensornote{...}`.

## 5. Git and agents

TensorNote 2.0 has no Git workbench or Git Bridge. Save edits, then use Git CLI or a dedicated Git client to commit and synchronize the ordinary Workspace folder.

The release Agent Skill lets a compatible agent maintain Markdown, assets, links, Frontmatter, and Sidecars and run its deterministic validator. It needs neither TensorNote nor Jupyter and grants no install, execution, network, or Git-write authority.
