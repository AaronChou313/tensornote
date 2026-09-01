# ADR 0004: Local Runtime Assistant

Status: Accepted for v1.3.0

Date: 2026-09-01

## Context

TensorNote can connect to Jupyter, but v1.2 still requires users to discover Python environments, install Jupyter and manage the Server in a terminal. Desktop should make that workflow approachable without merging TensorNote, Python and Jupyter into one process or exposing a general-purpose Shell to the WebView.

## Decision

1. Runtime automation is Desktop-only and remains behind `HostCapabilities.environmentDiscovery` and `HostCapabilities.processManagement`. Static Web must not bundle Runtime IPC symbols.
2. Discovery invokes only fixed, typed probes for known executables. It may inspect Python, Conda, uv, Jupyter, Kernel specs and running Server records, but returns opaque IDs and display metadata instead of executable or environment paths.
3. Environment creation is a two-step protocol. `plan` returns the manager, Python version, logical target, packages, Kernel registration and an exact confirmation phrase. `apply` accepts only a live plan ID and matching phrase; it never accepts a command line or target path from JavaScript.
4. Managed environments live under the TensorNote application-data directory. An environment becomes discoverable as managed only after all creation steps and Kernel registration succeed. Failed or cancelled operations are cleaned up and never marked ready.
5. The minimal environment contains Jupyter Server, ipykernel, NumPy, Matplotlib and Pillow. Large ML frameworks and Workspace-declared dependencies remain separate, explicit future operations.
6. Jupyter startup accepts only an opaque environment ID, an optional authorized Native Workspace ID and a validated TensorNote origin. Rust chooses the loopback port and token, starts `python -m jupyter server` with fixed arguments, and returns the token only to the current UI session.
7. TensorNote can terminate only child processes recorded in the current `LocalRuntimeManager`. Discovered external Servers are connectable metadata and never stoppable.
8. Operation and Server logs are bounded. Tokens, application-data paths and Home paths are redacted before they cross IPC.
9. Clean application exit stops Owned Jupyter Servers. A future recovery record may diagnose Servers left by an abnormal OS/process termination, but must not kill a PID based only on a stale record.
10. ComputeProvider continues to own Kernel connections and Cell execution. Runtime Assistant only prepares environments, manages an independent Server and creates a normal session-scoped Compute Profile.

## Command allowlist

The Rust layer may construct only these command families:

- known tool version and discovery probes;
- fixed Python metadata probes;
- `conda env list --json`;
- `python -m jupyter kernelspec list --json` and `python -m jupyter server list --json`;
- an approved `uv`, `venv` or Conda environment-creation plan;
- fixed pip installation of the minimal package set;
- fixed ipykernel registration;
- fixed loopback Jupyter Server startup.

There is no arbitrary executable picker, Shell string, environment target path, package list, Server argument list or generic process-kill command.

## Consequences

- Beginners can reach a working local Jupyter connection from Settings while advanced users can keep using an independently managed Server.
- TensorNote does not become a Python distribution and does not silently modify an existing environment.
- Creation may download Python or packages only after the plan is shown and explicitly confirmed.
- Conda, uv and standard venv remain parallel adapters; one managed environment uses exactly one adapter.
