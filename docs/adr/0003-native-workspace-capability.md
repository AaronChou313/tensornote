# ADR 0003: Native Workspace Capability

Status: Accepted for v1.2.0

Date: 2026-09-01

## Context

The v1.1 Desktop shell deliberately exposed no filesystem capability. v1.2 must let a user open and author a local Markdown Workspace without turning the WebView into an unrestricted filesystem client or changing WorkspaceProvider API v1.

## Decision

1. Directory authority begins with an operating-system folder picker invoked by a Rust command. The WebView cannot submit an arbitrary absolute path for authorization.
2. Rust canonicalizes the selected directory, stores it in the application configuration directory, and returns an opaque Workspace ID plus display metadata.
3. Every filesystem command accepts only that Workspace ID and a normalized relative path. Absolute paths, parent traversal, path prefixes and symlink escapes are rejected in Rust.
4. `NativeLocalWorkspaceProvider` implements the existing WorkspaceProvider API v1. Document parsing, indexing, recovery, conflict UI and editor behavior remain shared code.
5. Text and binary writes use same-directory atomic replacement. Expected size and modification time preserve the existing optimistic conflict contract.
6. A recent Native Workspace can be restored only when its opaque ID is still present in the Rust registry and its directory still exists. Missing or moved directories fail visibly and require selection again.
7. The first watcher uses native filesystem stats through the authorized command boundary. It detects external changes without broadening the filesystem permission surface; event-driven watcher optimization can replace polling without changing Provider API.
8. Hidden entries, dependency directories and build output remain excluded using the same rules as the browser local Provider.
9. Desktop drag/drop and associated `.md` / `.markdown` launch requests are handled in Rust. They produce the same opaque registration; a dropped Markdown file resolves to the nearest `tensornote.yaml` or Git root and sends only its relative path to the UI.
10. Reveal uses the already-authorized root or an existing validated relative entry. Native Git exposes only repository verification, Status, History, Diff, Stage/Unstage and Commit with fixed argument construction.

## Security properties

- No filesystem plugin permission is granted to guest JavaScript.
- No command accepts a Shell string or an unrestricted absolute path.
- Registry persistence contains local paths only in the application configuration directory, never in Markdown, `tensornote.yaml`, Git or browser settings.
- Removing a recent item from browser settings does not delete files. Removing a Workspace entry is always relative to the active authorized root.
- GitHub and Built-in Providers cannot acquire native write capability.
- Static Web builds fail if Tauri, Native Workspace or Native Git IPC symbols appear in `dist`.
- Native Git never accepts a Shell string, arbitrary working directory, credential operation, Push or Pull.

## Consequences

- Desktop can reopen previously selected directories without showing a picker each time.
- A copied browser local recent entry cannot be upgraded into native authority.
- Native filesystem behavior is testable below the Tauri command layer and through the shared Provider contract.
- Environment detection and process management remain disabled until v1.3.0.
