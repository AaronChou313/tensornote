import type { WorkspaceSession } from './types'

export type WorkspaceExecutionOverrides = Record<string, boolean>

export interface WorkspaceExecutionPolicy {
  enabled: boolean
  canChange: boolean
  source: 'preference' | 'manifest' | 'default'
}

export function resolveWorkspaceExecutionPolicy(session: WorkspaceSession, overrides: WorkspaceExecutionOverrides): WorkspaceExecutionPolicy {
  const preference = overrides[session.descriptor.id]
  const source = preference !== undefined ? 'preference' : session.manifest.features.executable ? 'manifest' : 'default'
  const requested = preference ?? session.manifest.features.executable
  const canChange = session.compatibility.status !== 'future'
  return { enabled: canChange && requested, canChange, source }
}

export function canExecuteWorkspace(session: WorkspaceSession, overrides: WorkspaceExecutionOverrides) {
  return resolveWorkspaceExecutionPolicy(session, overrides).enabled && session.trusted
}
