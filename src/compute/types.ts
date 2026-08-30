import type { KernelStatus } from '../types'

export type CellOutput =
  | { type: 'stream'; name: 'stdout' | 'stderr'; text: string }
  | { type: 'display'; data: Record<string, unknown> }
  | { type: 'error'; name: string; value: string; traceback: string[] }

export type ComputeProviderKind = 'jupyter' | (string & {})
export type ComputeSessionScope = 'note' | 'workspace' | 'manual'

export interface ComputeProfile {
  id: string
  name: string
  kind: ComputeProviderKind
  serverUrl: string
  kernelName: string
  scope: ComputeSessionScope
  description?: string
}

export interface ComputeConnectionConfig {
  serverUrl: string
  token: string
  kernelName: string
}

export interface ComputeContext {
  workspaceId: string
  noteId?: string
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

export type DiagnosticCheckId = 'browser' | 'server' | 'authentication' | 'cors' | 'kernel' | 'websocket'

export interface DiagnosticCheck {
  id: DiagnosticCheckId
  label: string
  status: DiagnosticStatus
  detail: string
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
    name: 'Jetson',
    kind: 'jupyter',
    serverUrl: 'http://jetson.local:8888',
    kernelName: 'python3',
    scope: 'manual',
    description: '边缘设备与部署验证',
  },
]
