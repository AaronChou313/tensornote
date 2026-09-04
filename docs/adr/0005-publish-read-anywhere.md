# ADR 0005: Publish and Read Anywhere

- Status: Accepted for v1.4.0
- Date: 2026-09-03
- Related: [Next Generation Plan](../NEXT_GENERATION_PLAN.md), [Publishing Guide](../PUBLISHING.md), [Platform Contracts](../PLATFORM_CONTRACTS.md)

## Context

TensorNote already opens public GitHub repositories, but a branch-based URL can change over time and the application-owned Pages Workflow cannot publish a third-party knowledge repository. Public knowledge products also need an explicit source, license, environment disclosure and execution trust boundary.

## Decision

1. A shared GitHub Workspace URL must contain the complete resolved commit SHA. Branches remain valid discovery input, but are never emitted as reproducible share targets.
2. `publishing` is an optional additive Workspace Schema v1 block containing presentation only: title, description, Workspace-relative logo, six-digit accent and default note ID. It never stores Repository credentials, Compute configuration or secrets.
3. A reusable GitHub Actions Workflow checks out the caller Workspace and the TensorNote Runtime separately. The caller's exact `${GITHUB_SHA}` becomes the published source revision; Markdown is still loaded through `GitHubWorkspaceProvider`.
4. Publication validation composes the existing strict Workspace validator with License, presentation, declared environment, full revision and obvious credential-file checks. It does not install dependencies or execute content.
5. Static published builds may auto-open one configured public Repository/revision. This is build-time data, not a new Workspace Provider.
6. Web/Desktop share targets include source, Fork, immutable archive and Badge. Desktop deep links accept only the statically registered `tensornote` scheme and one bounded GitHub route with a full commit SHA.
7. Opening a deep link does not grant execution trust. GitHub revision trust and Workspace execution permission remain independent existing gates.
8. The Desktop deep-link plugin is dynamically imported only in Desktop builds. Static boundary verification rejects its event/API markers.

## Consequences

- Knowledge authors can publish from their own Repository without forking TensorNote business code.
- A shared link reproduces knowledge content even after the default branch advances.
- Pages still requires GitHub availability and anonymous API quota; v1.4 does not introduce a TensorNote content service.
- A Runtime Tag should replace `main` in copied Workflows after an official v1.4.0 release.
- Remote Jupyter onboarding, JupyterHub and BinderHub remain v1.5.0 work.
