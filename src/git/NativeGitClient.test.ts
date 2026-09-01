import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NativeGitClient } from './NativeGitClient'

const invoke = vi.fn()
vi.mock('@tauri-apps/api/core', () => ({ invoke }))

describe('NativeGitClient', () => {
  beforeEach(() => invoke.mockReset())

  it('uses only the opaque workspace authority and typed command arguments', async () => {
    const client = new NativeGitClient('native:demo')
    invoke.mockResolvedValueOnce({ branch: 'main', changes: [] })
    await client.status()
    expect(invoke).toHaveBeenLastCalledWith('native_git_status', { workspaceId: 'native:demo' })

    invoke.mockResolvedValueOnce({ path: 'notes/a.md', staged: true, patch: 'diff' })
    await client.diff('notes/a.md', true)
    expect(invoke).toHaveBeenLastCalledWith('native_git_diff', {
      workspaceId: 'native:demo',
      path: 'notes/a.md',
      staged: true,
    })

    invoke.mockResolvedValueOnce({ branch: 'main', changes: [] })
    await client.commit('Document native workspace')
    expect(invoke).toHaveBeenLastCalledWith('native_git_commit', {
      workspaceId: 'native:demo',
      message: 'Document native workspace',
    })
  })
})
