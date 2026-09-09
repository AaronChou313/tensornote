# Project Experiment user and author guide

Use a Project Experiment when one lesson needs multiple scripts, notebooks, dependency groups, training steps or artifacts. Keep short code that belongs to one note as an Inline Lab.

## Reader workflow

1. Open a note with an Experiment Card and review its difficulty, duration, resources and platform support.
2. Open the experiment and choose the lightest smoke preset first.
3. Review Python, dependency files and download notes on Environment. Download declarations are informational and never start a download.
4. On Desktop, inspect the environment and review its create/update plan before confirming. On Local Web, connect Jupyter and verify that it sees the same workspace path.
5. On Run, review scripts, arguments, steps, input hashes and output scope, then explicitly confirm and start.
6. Follow the current step, recent logs and elapsed time. You can cancel. After a failure, fix the cause and retry the failed path or run everything again.
7. Inspect declared files under Artifacts. Desktop can reveal them in the system file manager. Download important Binder output immediately because it is temporary and does not write back to GitHub.
8. Remove unused managed environments and local run history from Desktop settings when they are no longer needed.

## Platform boundary

| | Desktop | Local Web | Online Web / Pages |
| --- | --- | --- | --- |
| Manifest reading | Full | Full | Full |
| Environment setup | Isolated environment after plan review | User-managed Jupyter environment | Remote Jupyter or Binder environment |
| Runners | Python, module, notebook, torchrun | Python, module and notebook after path mapping | Reading; compatible remote Jupyter; commit-pinned Binder |
| Logs, cancel, history | Full local jobs | Current Jupyter session | Remote-service dependent |
| Artifacts | Declared index and native reveal | Jupyter-visible path | Binder files are temporary and do not update GitHub |

Git Bridge handles Git for Local Web and is unrelated to experiment execution. An HTTPS Online page cannot connect to an ordinary HTTP Jupyter server on the reader's computer.

## Missing runtime resources

- **No Python:** reading still works; Desktop can show a managed-environment plan.
- **No network:** installed local environments can run local files; first installs, GitHub, remote Jupyter and Binder cannot.
- **No GPU:** choose a smoke or CPU preset instead of forcing a full GPU run.
- **Low disk:** review expected environment, download and artifact sizes; clean old environments or choose another output location, then regenerate the plan.
- **Dependency conflict:** use a separate managed environment for each dependency group. A changed dependency file marks its environment stale and requires review.
- **Cancel or crash:** Desktop terminates owned processes. An unfinished job becomes interrupted after restart; inspect its log before rerunning.

## Author workflow

Create `tensornote.experiment.yaml` beside the scripts and keep the original command-line entry points usable. Split dependencies by purpose with environment inheritance, avoid pinning one CUDA wheel across platforms, and give every heavy run a deterministic, bounded, CPU-safe smoke preset.

Reference it from a note:

````markdown
```tensornote-experiment
manifest: ./code/tensornote.experiment.yaml
preset: smoke
```
````

Use the Agent Skill templates and strict validator shipped in the Release. See [Manifest v1](../PROJECT_EXPERIMENT_MANIFEST_V1.md) for fields and the [threat model](../PROJECT_EXPERIMENT_THREAT_MODEL.md) for security.

A manifest cannot contain shell commands, tokens, passwords or private keys. Paths stay inside the workspace, arguments are string arrays, and environment/step graphs are acyclic. Parsing a manifest never grants permission to install, download or execute.
