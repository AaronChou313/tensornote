import { parse } from 'yaml'
import { EXPERIMENT_MANIFEST_VERSION, type ExperimentDiagnostic, type ExperimentManifest, type ExperimentManifestResult } from './types'

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const RUNNERS = new Set(['python', 'python-module', 'notebook', 'torchrun'])

export function isPortableExperimentPath(value: unknown) {
  if (typeof value !== 'string' || !value.trim() || value.includes('\\') || value.includes('\0')) return false
  if (/^(?:\/|~|[a-z]:|\/\/)/i.test(value)) return false
  return !value.split('/').includes('..')
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

export function parseExperimentManifest(source: string): ExperimentManifestResult {
  const diagnostics: ExperimentDiagnostic[] = []
  const issue = (code: string, message: string, field?: string, severity: 'error' | 'warning' = 'error') => diagnostics.push({ severity, code, message, field })
  let parsed: Record<string, unknown>
  try { parsed = record(parse(source)) }
  catch { return { sourceVersion: null, readOnly: true, diagnostics: [{ severity: 'error', code: 'yaml', message: 'Experiment Manifest 不是有效 YAML。' }] } }

  const sourceVersion = Number.isInteger(parsed.schemaVersion) ? Number(parsed.schemaVersion) : null
  if (sourceVersion === null) issue('schema-version', 'schemaVersion 必须是整数 1。', 'schemaVersion')
  if (sourceVersion !== null && sourceVersion > EXPERIMENT_MANIFEST_VERSION) {
    issue('future-schema', `Manifest v${sourceVersion} 高于当前支持的 v${EXPERIMENT_MANIFEST_VERSION}，只能只读查看。`, 'schemaVersion', 'warning')
    return { sourceVersion, readOnly: true, diagnostics }
  }
  if (sourceVersion !== EXPERIMENT_MANIFEST_VERSION) issue('schema-version', '当前只支持 Experiment Manifest v1。', 'schemaVersion')

  const experiment = record(parsed.experiment)
  const environments = record(parsed.environments)
  const presets = record(parsed.presets)
  const steps = record(parsed.steps)
  const parameters = record(parsed.parameters)
  const resources = record(parsed.resources)
  const artifacts = record(parsed.artifacts)
  const downloads = record(parsed.downloads)
  const id = typeof experiment.id === 'string' ? experiment.id : ''
  const title = typeof experiment.title === 'string' ? experiment.title.trim() : ''
  const workingDirectory = experiment.workingDirectory
  if (!ID.test(id)) issue('experiment-id', 'experiment.id 必须是小写 kebab-case。', 'experiment.id')
  if (!title) issue('experiment-title', 'experiment.title 不能为空。', 'experiment.title')
  if (!isPortableExperimentPath(workingDirectory)) issue('path', 'experiment.workingDirectory 必须是安全相对路径。', 'experiment.workingDirectory')
  if (!Object.keys(environments).length) issue('environments-empty', '至少声明一个环境。', 'environments')
  if (!Object.keys(presets).length) issue('presets-empty', '至少声明一个预设。', 'presets')
  if (!Object.keys(steps).length) issue('steps-empty', '至少声明一个步骤。', 'steps')

  const normalizedEnvironments: ExperimentManifest['environments'] = {}
  for (const [environmentId, input] of Object.entries(environments)) {
    const item = record(input)
    if (!ID.test(environmentId)) issue('environment-id', '环境 ID 必须是小写 kebab-case。', `environments.${environmentId}`)
    const files = Array.isArray(item.files) ? item.files : []
    if (files.some((path) => !isPortableExperimentPath(path))) issue('path', '环境文件必须是安全相对路径。', `environments.${environmentId}.files`)
    if (item.extends !== undefined && (typeof item.extends !== 'string' || !environments[item.extends])) issue('environment-parent', 'extends 必须引用存在的环境。', `environments.${environmentId}.extends`)
    normalizedEnvironments[environmentId] = { python: typeof item.python === 'string' ? item.python : '', ...(typeof item.extends === 'string' ? { extends: item.extends } : {}), files: files.filter((path): path is string => typeof path === 'string') }
  }
  const visiting = new Set<string>(), visited = new Set<string>()
  const visitEnvironment = (environmentId: string) => {
    if (visiting.has(environmentId)) { issue('environment-cycle', '环境继承不能形成循环。', `environments.${environmentId}`); return }
    if (visited.has(environmentId)) return
    visiting.add(environmentId)
    const parent = normalizedEnvironments[environmentId]?.extends
    if (parent && normalizedEnvironments[parent]) visitEnvironment(parent)
    visiting.delete(environmentId); visited.add(environmentId)
  }
  Object.keys(normalizedEnvironments).forEach(visitEnvironment)

  const normalizedSteps: ExperimentManifest['steps'] = {}
  for (const [stepId, input] of Object.entries(steps)) {
    const item = record(input), runner = String(item.runner ?? '')
    if (!ID.test(stepId)) issue('step-id', '步骤 ID 必须是小写 kebab-case。', `steps.${stepId}`)
    if (!RUNNERS.has(runner)) issue('runner', 'Runner 必须是 python、python-module、notebook 或 torchrun。', `steps.${stepId}.runner`)
    const file = typeof item.file === 'string' ? item.file : undefined
    const module = typeof item.module === 'string' ? item.module : undefined
    if ((runner === 'python' || runner === 'notebook' || runner === 'torchrun') && !file) issue('step-file', '该 Runner 必须声明 file。', `steps.${stepId}.file`)
    if (runner === 'python-module' && !module) issue('step-module', 'python-module 必须声明 module。', `steps.${stepId}.module`)
    if (file && !isPortableExperimentPath(file)) issue('path', '步骤文件必须是安全相对路径。', `steps.${stepId}.file`)
    const dependsOn = Array.isArray(item.dependsOn) ? item.dependsOn.map(String) : []
    const outputs = Array.isArray(item.outputs) ? item.outputs.map(String) : []
    const processes = Number(item.processes), nodes = Number(item.nodes), nodeRank = Number(item.nodeRank), masterPort = Number(item.masterPort)
    if (runner === 'torchrun' && (!Number.isInteger(processes) || processes < 1 || processes > 64)) issue('torchrun-processes', 'torchrun 必须声明 1–64 的 processes。', `steps.${stepId}.processes`)
    if (item.nodes !== undefined && (!Number.isInteger(nodes) || nodes < 1 || nodes > 64)) issue('torchrun-nodes', 'nodes 必须是 1–64。', `steps.${stepId}.nodes`)
    if (item.nodeRank !== undefined && (!Number.isInteger(nodeRank) || nodeRank < 0)) issue('torchrun-rank', 'nodeRank 必须是非负整数。', `steps.${stepId}.nodeRank`)
    if (item.masterPort !== undefined && (!Number.isInteger(masterPort) || masterPort < 1024 || masterPort > 65535)) issue('torchrun-port', 'masterPort 必须是 1024–65535。', `steps.${stepId}.masterPort`)
    for (const dependency of dependsOn) if (!steps[dependency]) issue('step-dependency', 'dependsOn 引用了不存在的步骤。', `steps.${stepId}.dependsOn`)
    if (outputs.some((path) => !isPortableExperimentPath(path))) issue('path', '输出必须是安全相对路径。', `steps.${stepId}.outputs`)
    normalizedSteps[stepId] = { title: String(item.title ?? stepId), runner: runner as ExperimentManifest['steps'][string]['runner'], ...(file ? { file } : {}), ...(module ? { module } : {}), args: Array.isArray(item.args) ? item.args.map(String) : [], dependsOn, outputs, ...(Number.isInteger(processes) ? { processes } : {}), ...(Number.isInteger(nodes) ? { nodes } : {}), ...(Number.isInteger(nodeRank) ? { nodeRank } : {}), ...(typeof item.masterAddress === 'string' ? { masterAddress: item.masterAddress } : {}), ...(Number.isInteger(masterPort) ? { masterPort } : {}) }
  }
  const stepVisiting = new Set<string>(), stepVisited = new Set<string>()
  const visitStep = (stepId: string) => {
    if (stepVisiting.has(stepId)) { issue('step-cycle', '步骤依赖不能形成循环。', `steps.${stepId}`); return }
    if (stepVisited.has(stepId)) return
    stepVisiting.add(stepId); normalizedSteps[stepId]?.dependsOn.forEach(visitStep); stepVisiting.delete(stepId); stepVisited.add(stepId)
  }
  Object.keys(normalizedSteps).forEach(visitStep)

  const normalizedPresets: ExperimentManifest['presets'] = {}
  for (const [presetId, input] of Object.entries(presets)) {
    const item = record(input), environment = String(item.environment ?? ''), presetSteps = Array.isArray(item.steps) ? item.steps.map(String) : []
    if (!ID.test(presetId)) issue('preset-id', '预设 ID 必须是小写 kebab-case。', `presets.${presetId}`)
    if (!environments[environment]) issue('preset-environment', '预设引用了不存在的环境。', `presets.${presetId}.environment`)
    for (const stepId of presetSteps) if (!steps[stepId]) issue('preset-step', '预设引用了不存在的步骤。', `presets.${presetId}.steps`)
    normalizedPresets[presetId] = { title: String(item.title ?? presetId), environment, steps: presetSteps, parameters: record(item.parameters) as Record<string, string | number | boolean> }
  }
  const defaultPreset = typeof parsed.defaultPreset === 'string' ? parsed.defaultPreset : ''
  if (!presets[defaultPreset]) issue('default-preset', 'defaultPreset 必须引用存在的预设。', 'defaultPreset')

  for (const [artifactId, input] of Object.entries(artifacts)) if (!isPortableExperimentPath(record(input).path)) issue('path', '产物路径必须是安全相对路径。', `artifacts.${artifactId}.path`)
  const normalizedDownloads: NonNullable<ExperimentManifest['downloads']> = {}
  for (const [downloadId, input] of Object.entries(downloads)) {
    const item = record(input)
    let url: URL | undefined
    try { url = new URL(String(item.url ?? '')) } catch { issue('download-url', '下载来源必须是有效 HTTPS URL。', `downloads.${downloadId}.url`) }
    if (url && (url.protocol !== 'https:' || url.username || url.password)) issue('download-url', '下载来源必须是无凭据的 HTTPS URL。', `downloads.${downloadId}.url`)
    if (!isPortableExperimentPath(item.cache)) issue('path', '下载缓存必须是安全相对路径。', `downloads.${downloadId}.cache`)
    normalizedDownloads[downloadId] = { title: String(item.title ?? downloadId), url: String(item.url ?? ''), cache: String(item.cache ?? ''), ...(typeof item.sizeMB === 'number' ? { sizeMB: item.sizeMB } : {}), ...(typeof item.sha256 === 'string' ? { sha256: item.sha256 } : {}), ...(typeof item.license === 'string' ? { license: item.license } : {}) }
  }
  if (diagnostics.some((item) => item.severity === 'error')) return { sourceVersion, readOnly: true, diagnostics }
  return { sourceVersion, readOnly: false, diagnostics, manifest: {
    schemaVersion: 1,
    experiment: { id, title, ...(typeof experiment.description === 'string' ? { description: experiment.description } : {}), workingDirectory: String(workingDirectory), difficulty: ['basic', 'medium', 'heavy'].includes(String(experiment.difficulty)) ? experiment.difficulty as ExperimentManifest['experiment']['difficulty'] : 'basic', ...(Number.isInteger(experiment.estimatedMinutes) ? { estimatedMinutes: Number(experiment.estimatedMinutes) } : {}) },
    environments: normalizedEnvironments, presets: normalizedPresets, defaultPreset, steps: normalizedSteps, parameters: parameters as ExperimentManifest['parameters'], resources, artifacts: artifacts as ExperimentManifest['artifacts'], downloads: normalizedDownloads,
  } }
}
