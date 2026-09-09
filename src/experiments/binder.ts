import type { WorkspaceSession } from '../workspace/types'
import type { IndexedExperiment } from './types'
import { experimentWorkingDirectory } from './runPlan'
import { joinWorkspacePath } from '../workspace/path'

const FULL_SHA = /^[a-f0-9]{40}$/i

export interface BinderExperimentTarget { url: string; repository: string; revision: string; notebook?: string; configured: boolean; reason?: string }

export function createBinderExperimentTarget(session: WorkspaceSession, experiment: IndexedExperiment): BinderExperimentTarget | null {
  const owner = session.descriptor.config?.owner
  const repo = session.descriptor.config?.repo
  const revision = session.descriptor.revision
  if (session.descriptor.type !== 'github' || !owner || !repo || !revision || !FULL_SHA.test(revision) || !experiment.manifest) return null
  const manifest = experiment.manifest
  const notebookStep = Object.values(manifest.steps).find((step) => step.runner === 'notebook' && step.file)
  const notebook = notebookStep?.file ? joinWorkspacePath(experimentWorkingDirectory(manifest, experiment.manifestPath), notebookStep.file) : undefined
  const configured = session.environmentFiles.some((file) => file.exists && /^(?:binder\/)?(?:requirements[^/]*\.txt|environment\.ya?ml|pyproject\.toml|setup\.py|Dockerfile)$/i.test(file.path))
  const launch = new URL(`https://mybinder.org/v2/gh/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${revision}`)
  launch.searchParams.set('urlpath', notebook ? `lab/tree/${notebook}` : 'lab')
  return { url: launch.toString(), repository: `${owner}/${repo}`, revision, ...(notebook ? { notebook } : {}), configured, ...(!configured ? { reason: '仓库根目录或 binder/ 中未发现 Binder 可识别的环境文件。' } : {}) }
}
