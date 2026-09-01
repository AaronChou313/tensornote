# ADR 0002: Tauri Security Surface

- Status: Accepted for v1.1 implementation
- Date: 2026-09-01
- Decision owners: TensorNote maintainers
- Related: [Next Generation Plan](../NEXT_GENERATION_PLAN.md), [Security Policy](../../SECURITY.md)

## Context

The Tauri core process can access operating-system resources that are intentionally unavailable to Web deployments. A compromised WebView or unsafe extension must not inherit unrestricted file, shell or process access merely because it runs inside the desktop application.

The v1.1 foundation needs one IPC operation to prove the host boundary: reporting non-sensitive platform metadata for diagnostics. Filesystem, environment discovery, Jupyter process management, Git and updater operations are future work.

## Decision

The v1.1 desktop capability grants only:

- Tauri `core:default` permissions required by the main application window.
- One application permission, `allow-platform-info`, mapped to the parameter-free `platform_info` command.

The command returns only Rust compile/runtime constants:

```text
os, architecture, operating-system family
```

It does not return username, home directory, hostname, environment variables, installed applications, network addresses or file paths.

The frontend invokes it through `TauriHostAdapter.getPlatformInfo()`. WebHostAdapter returns a non-identifying Web placeholder without invoking IPC.

## Explicitly absent in v1.1

- Shell plugin or arbitrary command execution.
- Filesystem plugin or broad Home-directory scope.
- Dialog, process, updater, clipboard or notification plugins.
- Conda, Python, uv, Jupyter or Git discovery.
- Persistent Jupyter Token storage.
- Remote content granted access to local commands outside the bundled main window.

## Content Security Policy

The desktop build uses an explicit CSP rather than `null`. It limits scripts and resources to the bundled application, permits images/assets required by Workspace rendering, and permits HTTP(S)/WebSocket destinations required by Jupyter and GitHub providers. `unsafe-eval` is temporarily retained because current Jupyter dependencies contain runtime eval paths; removing it is a tracked hardening objective before broad desktop distribution.

Web builds continue using their existing HTTP security headers and are not granted Tauri capabilities.

## Rules for future commands

Every added Rust command must:

1. Have a named permission referenced by the minimum necessary window capability.
2. Accept typed arguments, never a raw shell command line.
3. Validate canonical paths and reject traversal before I/O.
4. Return structured output with secrets and personal paths removed where possible.
5. Separate planning from mutation for installs or environment creation.
6. Track process ownership before allowing termination.
7. Add Rust tests, TypeScript adapter tests and an ADR update or dedicated ADR.
8. Keep the corresponding Host capability `false` until the end-to-end path passes its release gate.

## Consequences

- The first Desktop build is intentionally limited but auditable.
- Native capabilities arrive more slowly because each expands the threat surface explicitly.
- Tauri configuration, application permissions and Rust handlers become release-gated security artifacts.

## Verification

- `cargo fmt --check`, `cargo clippy -- -D warnings` and `cargo test` pass.
- Capability configuration contains no shell/filesystem/process permission.
- Frontend tests confirm Web selection never constructs TauriHostAdapter.
- Desktop smoke invokes `platform_info` without exposing additional system data.
