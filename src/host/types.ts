export type HostKind = 'web' | 'desktop'

export interface HostCapabilities {
  desktopShell: boolean
  nativeFilesystem: boolean
  environmentDiscovery: boolean
  processManagement: boolean
  nativeGit: boolean
  fileAssociations: boolean
  autoUpdate: boolean
}

export interface HostPlatformInfo {
  os: string
  arch: string
  family: string
}

export interface HostDirectorySelection {
  workspaceId: string
  name: string
  initialPath?: string
}

export interface RuntimeTool {
  id: string
  kind: 'uv' | 'conda' | 'jupyter' | (string & {})
  name: string
  version: string
  executablePath?: string
  source?: 'path' | 'common-location' | 'user-selected'
}

export interface PythonEnvironment {
  id: string
  name: string
  manager: string
  pythonVersion: string
  jupyterInstalled: boolean
  ipykernelInstalled: boolean
  managed: boolean
  kernelName?: string
  pythonPath?: string
  location?: string
}

export interface RuntimeManagerDiagnostic {
  kind: 'uv' | 'conda' | 'venv'
  status: 'available' | 'missing' | 'error'
  detail: string
}

export interface RuntimeKernel {
  name: string
  displayName: string
  language: string
  environmentId: string
}

export interface DetectedJupyterServer {
  id: string
  url: string
  environmentId: string
  environmentName: string
  owned: boolean
}

export interface RuntimeDiscovery {
  tools: RuntimeTool[]
  environments: PythonEnvironment[]
  kernels: RuntimeKernel[]
  servers: DetectedJupyterServer[]
  warnings: string[]
  managedEnvironmentRoot?: string
  managerDiagnostics?: RuntimeManagerDiagnostic[]
}

export interface EnvironmentPlanRequest {
  manager: 'uv' | 'venv' | 'conda'
  name: string
  pythonVersion: string
  baseEnvironmentId?: string
  workspaceId?: string
  dependencyFiles?: string[]
  manifestDigest?: string
  manifestPath?: string
  revision?: string
}

export interface DependencyInstallPlanRequest {
  environmentId: string
  workspaceId: string
  dependencyFiles: string[]
  manifestPath?: string
  manifestDigest?: string
  revision?: string
}

export interface EnvironmentPlanDependency {
  path: string
  sha256: string
  size: number
}

export interface EnvironmentPlan {
  id: string
  kind?: 'create' | 'install'
  manager: string
  name: string
  pythonVersion: string
  targetLabel: string
  targetPath?: string
  managerExecutablePath?: string
  environmentId?: string
  externalEnvironment?: boolean
  packages: string[]
  kernelName: string
  steps: string[]
  confirmation: string
  expiresAt: number
  dependencies?: EnvironmentPlanDependency[]
  manifestDigest?: string
  manifestSha256?: string
  revision?: string
}

export interface RuntimeLogLine {
  sequence: number
  timestamp: number
  stream: string
  text: string
}

export interface RuntimeOperation {
  id: string
  state: 'running' | 'completed' | 'failed' | 'cancelled' | string
  progress: number
  logs: RuntimeLogLine[]
  error?: string
  environmentId?: string
}

export interface ExperimentRunStepInput { id: string; title: string; runner: string; file?: string; module?: string; args: string[]; outputs: string[]; processes?: number; nodes?: number; nodeRank?: number; masterAddress?: string; masterPort?: number }
export interface ExperimentRunPlanRequest { workspaceId: string; environmentId: string; experimentId: string; presetId: string; manifestPath: string; workingDirectory: string; steps: ExperimentRunStepInput[]; revision?: string }
export interface ExperimentRunPlan { id: string; experimentId: string; presetId: string; environmentId: string; steps: ExperimentRunStepInput[]; inputs: Array<{ path: string; sha256: string }>; outputs: string[]; confirmation: string; expiresAt: number; revision?: string }
export interface ExperimentLogLine { sequence: number; timestamp: number; stream: string; text: string }
export interface ExperimentJobStep { id: string; title: string; state: 'pending' | 'running' | 'completed' | 'failed' | 'blocked' | 'cancelled' | 'interrupted'; exitCode?: number }
export interface ExperimentJobArtifact { id: string; title: string; kind: 'notebook' | 'file'; path: string }
export interface ExperimentJob { id: string; experimentId: string; presetId: string; state: 'running' | 'completed' | 'failed' | 'cancelled' | 'interrupted'; startedAt: number; finishedAt?: number; steps: ExperimentJobStep[]; logs: ExperimentLogLine[]; artifacts: ExperimentJobArtifact[]; error?: string }
export interface SystemResourceSnapshot { cpuLogical: number; memoryTotalGB?: number; diskAvailableGB?: number; gpuCount: number; gpuMemoryGB?: number; cudaVersion?: string; warnings: string[] }

export interface OwnedJupyterServer {
  id: string
  environmentId: string
  environmentName: string
  kernelName?: string
  url: string
  port: number
  status: string
  owned: true
  startedAt: number
}

export interface JupyterServerLaunch {
  server: OwnedJupyterServer
  token: string
}

export interface HostUpdateInfo {
  version: string
  currentVersion: string
  date?: string
  body?: string
}

export interface HostUpdateProgress {
  phase: 'downloading' | 'installing' | 'ready'
  downloadedBytes: number
  totalBytes?: number
}

export interface HostAdapter {
  readonly id: HostKind
  readonly label: string
  readonly capabilities: HostCapabilities
  getPlatformInfo(): Promise<HostPlatformInfo>
  selectWorkspaceDirectory?(): Promise<HostDirectorySelection | null>
  restoreWorkspaceDirectory?(workspaceId: string): Promise<HostDirectorySelection>
  revealWorkspaceItem?(workspaceId: string, path?: string): Promise<void>
  takePendingWorkspaceOpen?(): Promise<HostDirectorySelection | null>
  onWorkspaceOpen?(listener: (selection: HostDirectorySelection) => void): Promise<() => void>
  discoverLocalRuntime?(workspaceId?: string): Promise<RuntimeDiscovery>
  selectLocalRuntimeTool?(kind: 'uv' | 'conda'): Promise<boolean>
  planLocalEnvironment?(request: EnvironmentPlanRequest): Promise<EnvironmentPlan>
  planEnvironmentDependencies?(request: DependencyInstallPlanRequest): Promise<EnvironmentPlan>
  applyLocalEnvironment?(planId: string, confirmation: string): Promise<RuntimeOperation>
  getLocalRuntimeOperation?(operationId: string): Promise<RuntimeOperation>
  cancelLocalRuntimeOperation?(operationId: string): Promise<RuntimeOperation>
  removeLocalEnvironment?(environmentId: string, confirmation: string): Promise<void>
  planExperimentRun?(request: ExperimentRunPlanRequest): Promise<ExperimentRunPlan>
  startExperimentJob?(planId: string, environmentId: string, confirmation: string): Promise<ExperimentJob>
  getExperimentJob?(jobId: string): Promise<ExperimentJob>
  listExperimentJobs?(): Promise<ExperimentJob[]>
  cancelExperimentJob?(jobId: string): Promise<ExperimentJob>
  clearExperimentJobs?(): Promise<void>
  inspectSystemResources?(workspaceId?: string): Promise<SystemResourceSnapshot>
  revealExperimentArtifact?(jobId: string, artifactId: string): Promise<void>
  startOwnedJupyter?(environmentId: string, workspaceId: string | undefined, origin: string): Promise<JupyterServerLaunch>
  listOwnedJupyter?(): Promise<OwnedJupyterServer[]>
  getOwnedJupyterLogs?(serverId: string): Promise<RuntimeLogLine[]>
  stopOwnedJupyter?(serverId: string): Promise<void>
  checkForUpdate?(): Promise<HostUpdateInfo | null>
  downloadAndInstallUpdate?(onProgress: (progress: HostUpdateProgress) => void): Promise<void>
  relaunchAfterUpdate?(): Promise<void>
}
