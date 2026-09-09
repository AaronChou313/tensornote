# Project Experiments

## Choose the execution model

Use an Inline Lab when every executable cell belongs to one note, shares one Jupyter kernel, completes quickly, and needs no project file orchestration. Use a Project Experiment when a lesson uses multiple scripts, dependency groups, notebooks, training processes, structured parameters, step dependencies, declared downloads, or exported artifacts. Keep explanatory snippets as ordinary fenced code; executable permission is never implied by Python content.

## Authoring workflow

1. Inspect the lesson files and existing command-line entry points. Preserve direct CLI use outside TensorNote.
2. Put `tensornote.experiment.yaml` beside the scripts it coordinates. Paths in the manifest are relative to the manifest working directory.
3. Split dependency files by purpose, such as `base`, `tokenizer`, `training`, `distributed`, and `notebook`. Use environment inheritance instead of copying every dependency.
4. Add a bounded, deterministic, CPU-safe smoke preset when the full lesson is expensive. Keep the real preset and state its resource needs honestly.
5. Reference the manifest from the teaching note. Run the strict validator before release.

````markdown
```tensornote-experiment
manifest: ./code/tensornote.experiment.yaml
preset: smoke
```
````

The fence accepts only `manifest` and optional `preset`. Resolve `manifest` from the note directory. It must remain inside the Workspace and cannot be an absolute path, URL, or parent traversal. Never put commands, credentials, environment values, or executable code in the fence.

## Manifest rules

Follow `docs/PROJECT_EXPERIMENT_MANIFEST_V1.md` and `schemas/tensornote-experiment-v1.schema.json` in the TensorNote application repository. Start with `assets/project-experiment-minimal.yaml`; use `assets/project-experiment-full.yaml` when the lesson needs inheritance, parameters, notebooks, distributed training, downloads, or multiple artifacts.

- Keep `schemaVersion: 1`. Future schemas are read-only until the tool supports them.
- Use stable lowercase kebab-case IDs for experiments, environments, presets, parameters, steps, artifacts, and downloads.
- Use only `python`, `python-module`, `notebook`, or `torchrun` runners. Supply argv as a YAML string array. Do not add a `command`, shell pipeline, inline script, or package-install step.
- A `python`, `notebook`, or `torchrun` step needs a safe Workspace-relative `file`. A `python-module` step needs a module name.
- Environment inheritance and `dependsOn` graphs must be acyclic. Every preset must resolve an environment and at least one existing step. Every parameter override must refer to a declared parameter.
- Declare output and artifact paths relative to the working directory. Runtime logs, environment folders, downloaded caches, and `.tensornote-runs/` normally belong in `.gitignore`.
- `downloads` is documentation only. Use credential-free HTTPS URLs, a relative cache destination, a license, expected size, and SHA-256 where available. TensorNote never downloads from this declaration automatically.
- For `torchrun`, declare `processes` from 1 to 64. Optional topology fields are `nodes`, `nodeRank`, `masterAddress`, and `masterPort`; do not encode them in a shell string.
- Declare realistic CPU, memory, disk, and GPU guidance. Heavy presets should have a smoke alternative whenever the learning goal permits it.

## Platform behavior

Desktop is the complete host. After execution permission, exact GitHub revision trust, environment-plan review, and a user-started run, it can prepare an isolated environment, run scripts or notebooks, stream logs, cancel jobs, and reveal declared artifacts.

Local Web can run the Jupyter-compatible subset only when its Jupyter server can see the same Workspace path. Python files run through `runpy`, modules preserve argv, and notebooks execute through the connected Jupyter environment. Native environment creation and `torchrun` require Desktop. Git Bridge only handles Git.

Static Web and GitHub Pages always support safe reading. A public GitHub Workspace can offer Binder only when it is pinned to the exact full commit SHA and contains a recognized Binder environment file. Remote Jupyter also requires HTTPS, CORS, WebSocket, authentication, path mapping, and trust diagnostics.

## Safety and review

Parsing and indexing are read-only. Never install dependencies, download models, start services, execute steps, or write outputs merely because a manifest exists. Require Workspace execution permission, exact GitHub revision trust, a compatible Provider and Host, a reviewed plan, and an explicit start action.

Before release, confirm:

- every manifest, environment file, runner file, preset, dependency, output, and artifact path resolves safely;
- IDs are stable, inheritance and step dependencies are acyclic, parameter overrides resolve, and argv contains strings only;
- no token, password, cookie, private key, credential URL, or secret value appears anywhere;
- smoke presets are bounded and rerunnable, while full presets expose honest resource needs;
- unsupported platforms receive a readable explanation and a concrete Desktop, Jupyter, or pinned Binder path;
- `node <skill-dir>/scripts/validate-workspace.mjs <workspace-root> --strict` passes.
