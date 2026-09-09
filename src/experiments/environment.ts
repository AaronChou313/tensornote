import { dirname, joinWorkspacePath } from '../workspace/path'
import type { ExperimentManifest } from './types'

export function resolveExperimentEnvironmentFiles(manifest: ExperimentManifest, manifestPath: string, environmentId: string): string[] {
  const result: string[] = []
  const visited = new Set<string>()
  const visit = (id: string) => {
    if (visited.has(id)) return
    visited.add(id)
    const environment = manifest.environments[id]
    if (!environment) return
    if (environment.extends) visit(environment.extends)
    for (const path of environment.files) {
      const resolved = joinWorkspacePath(dirname(manifestPath), path)
      if (!result.includes(resolved)) result.push(resolved)
    }
  }
  visit(environmentId)
  return result
}

export function isExperimentRequirementsFile(path: string) {
  const name = path.split('/').pop()?.toLocaleLowerCase() ?? ''
  return name.startsWith('requirements') && name.endsWith('.txt')
}
