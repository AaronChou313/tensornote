import { describe, expect, it } from 'vitest'
import type { WorkspaceSession } from './types'
import { canExecuteWorkspace, resolveWorkspaceExecutionPolicy } from './executionPolicy'

function session(patch: { executable?: boolean; status?: WorkspaceSession['compatibility']['status']; trusted?: boolean } = {}) {
  return {
    descriptor: { id: 'local:notes', type: 'local' },
    manifest: { features: { executable: patch.executable ?? false } },
    compatibility: { status: patch.status ?? 'supported' },
    trusted: patch.trusted ?? true,
  } as WorkspaceSession
}

describe('Workspace execution policy', () => {
  it('lets an explicit per-workspace preference override the manifest default', () => {
    expect(resolveWorkspaceExecutionPolicy(session(), {}).enabled).toBe(false)
    expect(resolveWorkspaceExecutionPolicy(session(), { 'local:notes': true })).toMatchObject({ enabled: true, source: 'preference' })
    expect(resolveWorkspaceExecutionPolicy(session({ executable: true }), { 'local:notes': false }).enabled).toBe(false)
  })

  it('keeps future manifests and untrusted revisions from executing', () => {
    expect(resolveWorkspaceExecutionPolicy(session({ status: 'future' }), { 'local:notes': true })).toMatchObject({ enabled: false, canChange: false })
    expect(canExecuteWorkspace(session({ trusted: false }), { 'local:notes': true })).toBe(false)
  })
})
