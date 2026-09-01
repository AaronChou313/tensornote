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
}

export interface EnvironmentPlanRequest {
  manager: 'uv' | 'venv' | 'conda'
  name: string
  pythonVersion: string
  baseEnvironmentId?: string
}

export interface EnvironmentPlan {
  id: string
  manager: string
  name: string
  pythonVersion: string
  targetLabel: string
  packages: string[]
  kernelName: string
  steps: string[]
  confirmation: string
  expiresAt: number
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
  planLocalEnvironment?(request: EnvironmentPlanRequest): Promise<EnvironmentPlan>
  applyLocalEnvironment?(planId: string, confirmation: string): Promise<RuntimeOperation>
  getLocalRuntimeOperation?(operationId: string): Promise<RuntimeOperation>
  cancelLocalRuntimeOperation?(operationId: string): Promise<RuntimeOperation>
  startOwnedJupyter?(environmentId: string, workspaceId: string | undefined, origin: string): Promise<JupyterServerLaunch>
  listOwnedJupyter?(): Promise<OwnedJupyterServer[]>
  getOwnedJupyterLogs?(serverId: string): Promise<RuntimeLogLine[]>
  stopOwnedJupyter?(serverId: string): Promise<void>
}
