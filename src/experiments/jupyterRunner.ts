import type { ExperimentRunStepInput } from '../host/types'

function py(value: unknown) { return JSON.stringify(value) }

export function jupyterWorkspaceProbe(root: string, workingDirectory: string, steps: ExperimentRunStepInput[]) {
  const files = steps.filter((step) => step.file).map((step) => step.file)
  return `from pathlib import Path
_tn_root = Path(${py(root)}).expanduser().resolve()
_tn_work = (_tn_root / ${py(workingDirectory)}).resolve()
assert _tn_work == _tn_root or _tn_root in _tn_work.parents, "Workspace path mapping escapes its root"
assert _tn_work.is_dir(), f"Workspace path mapping not found: {_tn_work}"
_tn_missing = [p for p in ${py(files)} if not (_tn_work / p).is_file()]
assert not _tn_missing, f"Experiment files not found under mapped workspace: {_tn_missing}"
print("TENSORNOTE_PATH_OK", _tn_work)`
}

export function jupyterStepCode(root: string, workingDirectory: string, step: ExperimentRunStepInput) {
  const setup = `import os, sys, runpy
from pathlib import Path
_tn_work = (Path(${py(root)}).expanduser().resolve() / ${py(workingDirectory)}).resolve()
os.chdir(_tn_work)
`
  if (step.runner === 'python') return `${setup}sys.argv = [${py(step.file)}, *${py(step.args)}]
runpy.run_path(${py(step.file)}, run_name="__main__")`
  if (step.runner === 'python-module') return `${setup}sys.argv = [${py(step.module)}, *${py(step.args)}]
runpy.run_module(${py(step.module)}, run_name="__main__", alter_sys=True)`
  if (step.runner === 'notebook') return `${setup}import nbformat
from nbclient import NotebookClient
_tn_source = Path(${py(step.file)})
_tn_target_dir = Path(".tensornote-runs")
_tn_target_dir.mkdir(exist_ok=True)
_tn_target = _tn_target_dir / (${py(step.id)} + "-executed.ipynb")
_tn_book = nbformat.read(_tn_source, as_version=4)
NotebookClient(_tn_book, timeout=None, kernel_name=None, resources={"metadata": {"path": str(_tn_work)}}).execute()
nbformat.write(_tn_book, _tn_target)
print("TENSORNOTE_ARTIFACT", _tn_target)`
  throw new Error(`${step.runner} 需要桌面版或兼容的远程运行器。`)
}

export function jupyterSupported(step: ExperimentRunStepInput) {
  return step.runner === 'python' || step.runner === 'python-module' || step.runner === 'notebook'
}
