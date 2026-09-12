# TensorNote 2.1 User Guide

## 1. Enter a knowledge base

The compact `Web` or `Desktop` badge identifies the current host. Recent keeps up to eight knowledge bases and supports reopen, individual removal, and clear-all. Obsolete bundled-example records are removed during migration.

The home page has three actions:

- **Open local knowledge base** selects an existing Markdown root.
- **Create local knowledge base** asks for a name and parent directory, previews the final path, then creates `tensornote.yaml`, `notes/`, and `assets/` and opens the result.
- **Open online knowledge base** accepts a public GitHub, GitLab, or Gitee repository URL plus an optional branch or ref.

Unsafe path characters, dot paths, Windows reserved names, and an existing sibling directory are rejected without overwriting content.

## 2. Web

Web is for public online reading and sharing plus remote Jupyter. GitHub, GitLab, and Gitee are public and read-only; no account or token is used. Paste the repository's HTTPS home URL. TensorNote briefly caches mutable remote metadata and keeps immutable commit metadata longer to reduce anonymous API traffic.

Current Chrome and Edge can also open or create a browser-authorized local folder. The browser owns that permission and may require you to select the folder again after a restart. Other browsers can still use online repositories.

For a Jupyter Sidecar, open Settings → Compute & Jupyter → Remote runtime, configure Direct Jupyter, JupyterHub, or BinderHub, run diagnostics, and trust the current remote revision when prompted. Web cannot start Python on the reader's computer or bypass HTTPS mixed-content rules. Never place a token in Markdown or a share URL.

## 3. Desktop

Download the package for your OS and CPU, verify `SHA256SUMS`, and install it. Open an existing knowledge base or select a parent directory to create one. Desktop stores an opaque identifier for user-authorized roots; creation and file operations remain inside that authority. Markdown, assets, and `tensornote.yaml` remain in the selected folder. No Vite or extra TensorNote service is required.

The guide link opens through the restricted system URL opener. Files mirrors the filesystem; search and tabs switch notes; Outline navigates within the current note. Saves use disk conflict checks and unsaved drafts stay in device recovery storage. Duplicate Markdown filenames are valid across directories: paths identify files, while explicit Frontmatter IDs identify knowledge concepts. Overview uses only a root `OVERVIEW.md`, then root `README.md`.

For Jupyter, use Settings → Compute & Jupyter → Local runtime. Convenient connection selects or creates a Conda/uv/venv environment and shows its full path before launch. Manual connection uses a server you start. Remote runtime matches Web. Reading and editing need no Python.

## 4. Share

A remote knowledge base has one primary share action: copy link. The default link follows the current ref. Sharing from a note opens that note; sharing from Overview opens the knowledge overview. Under More options, pin the current revision to create a reproducible commit link.

Legacy `/open/github/:owner/:repo` links remain valid. New `/open/remote` links cover GitHub, GitLab, and Gitee. TensorNote never uploads a local knowledge base; publish it with your Git tool first, then open the public remote source to create a reader link.

## 5. Sidecars, Git, and agents

A trigger opens the unified SidePanel. Derivation is a non-executable rich Markdown supplement supporting math, tables, images, Mermaid, and Callouts. Jupyter executes only explicit `python` fences, with multiple cells sharing one Kernel.

In edit mode, choose **Sidecar content** to create a Sidecar or select one already in the note. Derivations provide edit/preview; Jupyter cells can be added, removed, and reordered. Changes replace only the selected directive source range. IDs are generated from titles and remain available under advanced settings. Legacy `python exec` Labs remain readable.

TensorNote has no Git workbench. Save edits, then use Git CLI or a dedicated Git client to commit and synchronize the ordinary folder.

The release Agent Skill lets a compatible agent maintain Markdown, assets, links, Frontmatter, and Sidecars and run its deterministic validator. It needs neither TensorNote nor Jupyter and grants no install, execution, network, or Git-write authority.
