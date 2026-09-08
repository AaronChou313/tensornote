# Project Experiment specification

Use an Inline Lab for short, bounded Python embedded in one note. Use a Project Experiment when teaching material needs multiple files, isolated dependency groups, notebooks, long-running training steps, structured parameters, or declared artifacts.

Reference a Workspace-relative `tensornote.experiment.yaml` from a note with a `tensornote-experiment` fence. Follow the application repository's `docs/PROJECT_EXPERIMENT_MANIFEST_V1.md` and JSON Schema. Never add commands, tokens, passwords or secret values to the fence or manifest.

Project Experiment parsing is read-only. Execution requires Workspace permission, exact GitHub revision trust, a compatible Host/Runner, a reviewed environment plan and a user-started run. Do not install dependencies, download models, start services or execute steps merely because a manifest exists.

Every heavy preset must state resources and offer a bounded smoke preset where feasible. Use dependency files owned by the Workspace, deterministic parameters, explicit outputs and safe relative paths. Do not use shell command strings. Keep ordinary command-line use possible outside TensorNote.

Review with the strict Workspace validator. Confirm every referenced manifest, environment file and step file exists; IDs are stable kebab-case; inheritance and step dependencies are acyclic; presets resolve; secrets are absent; and unsupported hosts receive a readable fallback.
