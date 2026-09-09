export const EXPERIMENT_MANIFEST_VERSION = 1

export type ExperimentRunnerKind = 'python' | 'python-module' | 'notebook' | 'torchrun'
export type ExperimentDifficulty = 'basic' | 'medium' | 'heavy'

export interface ExperimentReference {
  manifest: string
  preset?: string
  sourceOffset: number
}

export interface ExperimentEnvironment {
  python: string
  extends?: string
  files: string[]
}

export interface ExperimentStep {
  title: string
  runner: ExperimentRunnerKind
  file?: string
  module?: string
  args: string[]
  dependsOn: string[]
  outputs: string[]
  processes?: number
  nodes?: number
  nodeRank?: number
  masterAddress?: string
  masterPort?: number
}

export interface ExperimentPreset {
  title: string
  environment: string
  steps: string[]
  parameters: Record<string, string | number | boolean>
}

export interface ExperimentManifest {
  schemaVersion: number
  experiment: {
    id: string
    title: string
    description?: string
    workingDirectory: string
    difficulty: ExperimentDifficulty
    estimatedMinutes?: number
  }
  environments: Record<string, ExperimentEnvironment>
  presets: Record<string, ExperimentPreset>
  defaultPreset: string
  steps: Record<string, ExperimentStep>
  parameters: Record<string, Record<string, unknown>>
  resources: Record<string, unknown>
  artifacts: Record<string, { title: string; path: string; kind: string }>
  downloads?: Record<string, { title: string; url: string; sizeMB?: number; cache: string; sha256?: string; license?: string }>
}

export interface ExperimentDiagnostic {
  severity: 'error' | 'warning'
  code: string
  message: string
  field?: string
}

export interface ExperimentManifestResult {
  manifest?: ExperimentManifest
  sourceVersion: number | null
  readOnly: boolean
  diagnostics: ExperimentDiagnostic[]
}

export interface IndexedExperiment {
  key: string
  noteId: string
  notePath: string
  manifestPath: string
  requestedPreset?: string
  manifest?: ExperimentManifest
  diagnostics: ExperimentDiagnostic[]
  readOnly: boolean
}
