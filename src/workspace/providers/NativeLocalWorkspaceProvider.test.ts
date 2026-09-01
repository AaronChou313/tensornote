import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WorkspaceConflictError } from '../types'
import { NativeLocalWorkspaceProvider } from './NativeLocalWorkspaceProvider'

const invoke = vi.fn()

vi.mock('@tauri-apps/api/core', () => ({ invoke }))

describe('NativeLocalWorkspaceProvider', () => {
  beforeEach(() => {
    invoke.mockReset()
  })

  it('exposes an opaque native descriptor without leaking an absolute path', () => {
    const provider = new NativeLocalWorkspaceProvider({ workspaceId: 'native:demo', name: 'AI Notes' })

    expect(provider.capabilities).toMatchObject({ read: true, write: true, watch: true, binary: true, git: true })
    expect(provider.descriptor).toEqual({
      id: 'native:demo',
      type: 'local',
      name: 'AI Notes',
      sourceLabel: 'Native local workspace',
      detail: 'AI Notes',
      config: { provider: 'native-local', workspaceId: 'native:demo' },
    })
    expect(JSON.stringify(provider.descriptor)).not.toContain('/')
  })

  it('maps the provider contract to scoped native commands', async () => {
    const provider = new NativeLocalWorkspaceProvider({ workspaceId: 'native:demo', name: 'AI Notes' })
    invoke.mockResolvedValueOnce([])
    await provider.open()
    expect(invoke).toHaveBeenLastCalledWith('native_workspace_list', { workspaceId: 'native:demo', path: '' })

    invoke.mockResolvedValueOnce({ path: 'notes/hello.md', kind: 'file', size: 7, modifiedAt: 42 })
    await provider.writeText('notes/hello.md', '# Hello', { expectedModifiedAt: 41, expectedSize: 6 })
    expect(invoke).toHaveBeenLastCalledWith('native_workspace_write_text', {
      workspaceId: 'native:demo',
      path: 'notes/hello.md',
      content: '# Hello',
      expectedModifiedAt: 41,
      expectedSize: 6,
    })

    invoke.mockResolvedValueOnce(undefined)
    await provider.moveEntry('notes/draft.md', 'archive/draft.md')
    expect(invoke).toHaveBeenLastCalledWith('native_workspace_move_entry', {
      workspaceId: 'native:demo',
      source: 'notes/draft.md',
      destination: 'archive/draft.md',
    })
  })

  it('converts native stale-write failures into the shared conflict error', async () => {
    const provider = new NativeLocalWorkspaceProvider({ workspaceId: 'native:demo', name: 'AI Notes' })
    invoke.mockRejectedValueOnce('WORKSPACE_CONFLICT:notes/hello.md')

    await expect(provider.writeText('notes/hello.md', '# Stale')).rejects.toEqual(
      expect.objectContaining<Partial<WorkspaceConflictError>>({
        name: 'WorkspaceConflictError',
        path: 'notes/hello.md',
      }),
    )
  })

  it('preserves binary bytes returned by the native IPC response', async () => {
    const provider = new NativeLocalWorkspaceProvider({ workspaceId: 'native:demo', name: 'AI Notes' })
    invoke.mockResolvedValueOnce(new Uint8Array([0, 127, 255]))

    expect(Array.from(new Uint8Array(await provider.readBinary('assets/sample.bin')))).toEqual([0, 127, 255])
  })
})
