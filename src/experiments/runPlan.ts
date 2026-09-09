import { dirname, joinWorkspacePath } from '../workspace/path'
import type { ExperimentRunStepInput } from '../host/types'
import type { ExperimentManifest } from './types'

export function materializeExperimentSteps(manifest: ExperimentManifest, presetId: string): ExperimentRunStepInput[] {
  const preset = manifest.presets[presetId]
  if (!preset) throw new Error(`预设不存在：${presetId}`)
  const values = Object.fromEntries(Object.entries(manifest.parameters).map(([id, definition]) => [id, definition.default as string | number | boolean | undefined]))
  Object.assign(values, preset.parameters)
  const interpolate = (value: string) => value.replace(/\$\{parameters\.([a-z0-9-]+)\}/g, (_, id: string) => {
    const parameter = values[id]
    if (parameter === undefined) throw new Error(`参数没有值：${id}`)
    return String(parameter)
  })
  return preset.steps.map((id) => {
    const step = manifest.steps[id]
    if (!step) throw new Error(`步骤不存在：${id}`)
    return { id, title: step.title, runner: step.runner, ...(step.file ? { file: step.file } : {}), ...(step.module ? { module: step.module } : {}), args: step.args.map(interpolate), outputs: step.outputs }
  })
}

export function experimentWorkingDirectory(manifest: ExperimentManifest, manifestPath: string) {
  return joinWorkspacePath(dirname(manifestPath), manifest.experiment.workingDirectory)
}
