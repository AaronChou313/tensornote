import { dirname, joinWorkspacePath } from '../workspace/path'
import type { WorkspaceProvider } from '../workspace/types'
import type { Note } from '../types'
import { isPortableExperimentPath, parseExperimentManifest } from './schema'
import type { IndexedExperiment } from './types'
import { isExperimentRequirementsFile } from './environment'

export async function indexExperiments(provider: WorkspaceProvider, notes: Note[]): Promise<IndexedExperiment[]> {
  const indexed: IndexedExperiment[] = []
  for (const note of notes) for (const reference of note.experimentReferences) {
    const key = `${note.id}:${reference.sourceOffset}`
    if (!isPortableExperimentPath(reference.manifest)) {
      indexed.push({ key, noteId: note.id, notePath: note.path, manifestPath: reference.manifest, requestedPreset: reference.preset, readOnly: true, diagnostics: [{ severity: 'error', code: 'reference-path', message: 'Experiment 引用必须是安全相对路径。' }] })
      continue
    }
    const manifestPath = joinWorkspacePath(dirname(note.path), reference.manifest)
    try {
      const stat = await provider.stat(manifestPath)
      if (stat.kind !== 'file') throw new Error('引用目标不是文件。')
      const result = parseExperimentManifest(await provider.readText(manifestPath))
      const diagnostics = [...result.diagnostics]
      if (result.manifest) {
        const manifestDirectory = dirname(manifestPath)
        const requiredPaths = new Set<string>()
        for (const environment of Object.values(result.manifest.environments)) environment.files.forEach((path) => requiredPaths.add(joinWorkspacePath(manifestDirectory, path)))
        for (const step of Object.values(result.manifest.steps)) if (step.file) requiredPaths.add(joinWorkspacePath(manifestDirectory, result.manifest.experiment.workingDirectory, step.file))
        for (const path of requiredPaths) {
          try { if ((await provider.stat(path)).kind !== 'file') throw new Error() }
          catch { diagnostics.push({ severity: 'error', code: 'input-missing', message: `实验输入文件不存在：${path}` }) }
        }
      }
      if (result.manifest && reference.preset && !result.manifest.presets[reference.preset]) diagnostics.push({ severity: 'error', code: 'reference-preset', message: `引用的预设 ${reference.preset} 不存在。` })
      let detectedRequirementFiles: Array<{ path: string; size?: number }> = []
      if (result.manifest) {
        const workingDirectory = joinWorkspacePath(dirname(manifestPath), result.manifest.experiment.workingDirectory)
        try {
          const entries = await provider.list(workingDirectory)
          detectedRequirementFiles = (await Promise.all(entries.filter((entry) => entry.kind === 'file' && isExperimentRequirementsFile(entry.path)).map(async (entry) => {
            try { const stat = await provider.stat(entry.path); return { path: entry.path, ...(stat.size === undefined ? {} : { size: stat.size }) } }
            catch { return { path: entry.path } }
          }))).sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: 'base' }))
        } catch { /* A missing or unreadable working directory is already diagnosed by its declared inputs. */ }
      }
      indexed.push({ key, noteId: note.id, notePath: note.path, manifestPath, requestedPreset: reference.preset, manifest: result.manifest, diagnostics, readOnly: result.readOnly || diagnostics.some((item) => item.severity === 'error'), detectedRequirementFiles })
    } catch (reason) {
      indexed.push({ key, noteId: note.id, notePath: note.path, manifestPath, requestedPreset: reference.preset, readOnly: true, diagnostics: [{ severity: 'error', code: 'manifest-read', message: reason instanceof Error ? reason.message : '无法读取 Experiment Manifest。' }] })
    }
  }
  return indexed
}
