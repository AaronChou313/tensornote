import type { KernelStatus } from '../types'

export const COMPUTE_PROVIDER_API_VERSION = 1
export const COMPUTE_CONNECTOR_API_VERSION = 1

export type CellOutput =
  | { type: 'stream'; name: 'stdout' | 'stderr'; text: string }
  | { type: 'display'; data: Record<string, unknown> }
  | { type: 'error'; name: string; value: string; traceback: string[] }

export type ComputeProviderKind = 'jupyter' | (string & {})
export type ComputeSessionScope = 'note' | 'workspace' | 'manual'
export type ComputeConnectorKind = 'direct' | 'jupyterhub' | 'binderhub' | (string & {})

export type ComputeConnectorConfig =
  | { kind: 'direct' }
  | { kind: 'jupyterhub'; username?: string; serverName?: string; stopOnDisconnect?: boolean }
  | { kind: 'binderhub'; repository?: string; revision?: string; shutdownOnDisconnect?: boolean }

export interface ComputeWorkspaceSource {
  provider: 'github' | (string & {})
  repository: string
  revision: string
}

export interface ComputeProfile {
  id: string
  name: string
  kind: ComputeProviderKind
  serverUrl: string
  kernelName: string
  scope: ComputeSessionScope
  description?: string
  runtimeServerId?: string
  connector?: ComputeConnectorConfig
}

export interface ComputeConnectionConfig {
  serverUrl: string
  token: string
  kernelName: string
}

export interface ComputeContext {
  workspaceId: string
  noteId?: string
  workspaceSource?: ComputeWorkspaceSource
}

export interface ExecutionHandlers {
  onOutput: (output: CellOutput) => void
  onExecutionCount: (count: number | null) => void
}

export interface ComputeKernelSpec {
  name: string
  displayName: string
  language?: string
}

export type DiagnosticStatus = 'pass' | 'fail' | 'warning' | 'skipped' | 'running'

export type DiagnosticCheckId =
  | 'browser'
  | 'source'
  | 'server'
  | 'identity'
  | 'authentication'
  | 'cors'
  | 'lifecycle'
  | 'persistence'
  | 'kernel'
  | 'websocket'

export interface DiagnosticCheck {
  id: DiagnosticCheckId
  label: string
  status: DiagnosticStatus
  detail: string
}

export type ComputeConnectionPhase =
  | 'idle'
  | 'checking'
  | 'authenticating'
  | 'spawning'
  | 'fetching'
  | 'building'
  | 'launching'
  | 'ready'
  | 'stopping'
  | 'error'

export interface ComputeConnectionEvent {
  connector: ComputeConnectorKind
  phase: ComputeConnectionPhase
  message: string
  progress?: number
  occurredAt: number
}

export interface ComputeConnectionRequest {
  profile: ComputeProfile
  credential: string
  context: ComputeContext
  signal?: AbortSignal
  onEvent: (event: ComputeConnectionEvent) => void
}

export interface ComputeConnectionLease {
  readonly connector: ComputeConnectorKind
  readonly connection: ComputeConnectionConfig
  readonly ownership: 'external' | 'tensornote'
  readonly persistence: 'persistent' | 'provider-managed' | 'temporary'
  release(): Promise<void>
}

export interface ComputeConnectorDiagnosticResult {
  checks: DiagnosticCheck[]
  connection?: ComputeConnectionConfig
}

export interface ComputeConnector {
  readonly id: string
  readonly kind: ComputeConnectorKind
  readonly label: string
  connect(request: ComputeConnectionRequest): Promise<ComputeConnectionLease>
  diagnose(request: ComputeConnectionRequest): Promise<ComputeConnectorDiagnosticResult>
}

export interface ComputeSession {
  readonly id: string
  readonly status: KernelStatus
  execute(code: string, handlers: ExecutionHandlers): Promise<void>
  interrupt(): Promise<void>
  restart(): Promise<void>
  shutdown(): Promise<void>
}

export interface ComputeProvider {
  readonly id: string
  readonly kind: ComputeProviderKind
  readonly label: string
  onStatus(handler: (status: KernelStatus) => void): void
  connect(config: ComputeConnectionConfig): Promise<void>
  disconnect(): Promise<void>
  listKernels(config: ComputeConnectionConfig): Promise<ComputeKernelSpec[]>
  createSession(config: ComputeConnectionConfig): Promise<ComputeSession>
  diagnose(config: ComputeConnectionConfig): Promise<DiagnosticCheck[]>
}

export const computeProfileTemplates: Array<Omit<ComputeProfile, 'id'>> = [
  {
    name: 'Local Python',
    kind: 'jupyter',
    serverUrl: 'http://127.0.0.1:8888',
    kernelName: 'tensornote',
    scope: 'note',
    description: '本机 CPU 与日常学习环境',
  },
  {
    name: 'Laptop GPU',
    kind: 'jupyter',
    serverUrl: 'http://127.0.0.1:8888',
    kernelName: 'tensornote-gpu',
    scope: 'workspace',
    description: '笔记本 GPU Kernel，Workspace 内复用',
  },
  {
    name: 'Lab RTX4090',
    kind: 'jupyter',
    serverUrl: 'http://192.168.1.40:8888',
    kernelName: 'python3',
    scope: 'workspace',
    description: '局域网实验室工作站',
  },
  {
    name: 'Remote Server',
    kind: 'jupyter',
    serverUrl: 'https://jupyter.example.com',
    kernelName: 'python3',
    scope: 'manual',
    description: '手动管理生命周期的远程环境',
  },
  {
    name: 'JupyterHub',
    kind: 'jupyter',
    serverUrl: 'https://jupyter.example.com',
    kernelName: 'python3',
    scope: 'workspace',
    description: '使用有限权限 Token 启动或连接个人 Server',
    connector: { kind: 'jupyterhub', serverName: 'tensornote', stopOnDisconnect: true },
  },
  {
    name: 'BinderHub',
    kind: 'jupyter',
    serverUrl: 'https://mybinder.org',
    kernelName: 'python3',
    scope: 'workspace',
    description: '从 GitHub 固定 Revision 构建临时隔离环境',
    connector: { kind: 'binderhub', shutdownOnDisconnect: true },
  },
  {
    name: 'Jetson',
    kind: 'jupyter',
    serverUrl: 'http://jetson.local:8888',
    kernelName: 'python3',
    scope: 'manual',
    description: '边缘设备与部署验证',
  },
]
