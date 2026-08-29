export type CellOutput =
  | { type: 'stream'; name: 'stdout' | 'stderr'; text: string }
  | { type: 'display'; data: Record<string, unknown> }
  | { type: 'error'; name: string; value: string; traceback: string[] }

export interface JupyterConfig {
  serverUrl: string
  token: string
  kernelName: string
}

export interface ExecutionHandlers {
  onOutput: (output: CellOutput) => void
  onExecutionCount: (count: number | null) => void
}
