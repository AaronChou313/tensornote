# ADR 0001: Dual Host and HostAdapter

- Status: Accepted for v1.1 implementation
- Date: 2026-09-01
- Decision owners: TensorNote maintainers
- Related: [Next Generation Plan](../NEXT_GENERATION_PLAN.md), [Platform Contracts](../PLATFORM_CONTRACTS.md)

## Context

TensorNote v1.0.0 ships one React application in Local, Static and Self-hosted Web deployments. Web is a strong distribution surface, but a browser cannot reliably enumerate Python environments, manage local processes, watch arbitrary filesystem paths or provide native Git without an additional local service. A desktop release is therefore required for the full local-authoring experience.

The existing WorkspaceProvider and ComputeProvider contracts already isolate content sources and compute backends. Replacing those contracts or creating a second desktop UI would duplicate product behavior and risk breaking the v1 compatibility promise.

## Decision

TensorNote will use one shared React product core with two hosts:

- `WebHostAdapter` for Local, Static and Self-hosted Web.
- `TauriHostAdapter` for the Tauri 2 desktop shell.

HostAdapter describes operating-system capabilities only. It does not read Markdown, execute Python or replace a Provider. Workspace access remains owned by WorkspaceProvider; Kernel execution remains owned by ComputeProvider.

The initial internal capability shape is additive and intentionally not exported from `src/platform/index.ts`:

```ts
interface HostCapabilities {
  desktopShell: boolean
  nativeFilesystem: boolean
  environmentDiscovery: boolean
  processManagement: boolean
  nativeGit: boolean
  fileAssociations: boolean
  autoUpdate: boolean
}
```

UI code asks the active adapter for capabilities. It must not inspect `window.__TAURI__`, user-agent strings or operating-system names to unlock product actions. The Tauri implementation is loaded only in a desktop build so the Web entry does not initialize desktop IPC.

The first v1.1 desktop shell claims only `desktopShell`. Native filesystem, environment, process, Git, association and updater capabilities remain `false` until their implementations and permission models pass later release gates.

## Dependency direction

Allowed:

```text
UI → HostAdapter
UI → WorkspaceProvider / ComputeProvider
TauriHostAdapter → @tauri-apps/api
Tauri Rust Core → operating-system metadata
```

Forbidden:

```text
Document/Knowledge/Editor → Tauri
WorkspaceProvider API → Tauri-specific types
ComputeProvider API → process installation commands
WebHostAdapter → desktop IPC
React component → window.__TAURI__
```

## Routing and deployment

Desktop is a deployment mode with HashRouter, PWA disabled and localhost Git Bridge disabled. This avoids relying on native WebView history fallback and prevents the desktop shell from advertising Web-only bridges. Until NativeWorkspaceProvider lands, the first shell exposes Built-in and GitHub sources but does not claim native local authoring.

## Consequences

- Web and Desktop share almost all application code and tests.
- Host-specific code stays small, lazy and capability-gated.
- Desktop can evolve without changing Markdown or Provider v1 contracts.
- Some existing Web features may be temporarily unavailable in the first desktop spike until a native adapter replaces the browser API.
- Each new capability requires a focused permission ADR/update, implementation tests and an explicit capability flip.

## Rejected alternatives

- **Separate Desktop repository**: duplicates UI, release history and contracts.
- **Electron fork**: provides system access but adds a second runtime direction without a demonstrated requirement that Tauri cannot meet.
- **Expose a generic shell command**: simplifies experiments but creates an unacceptable command-execution surface.
- **Treat Desktop as another WorkspaceProvider**: conflates host powers with a content source and makes remote providers host-dependent.

## Verification

- Pure resolver tests cover Web and Desktop deployment/host selection.
- Static Web build must not initialize desktop IPC.
- Tauri build loads the same `dist/` application and exposes only reviewed commands.
- Shared Workspace parsing and application tests continue passing unchanged.
