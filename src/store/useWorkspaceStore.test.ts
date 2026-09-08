// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorkspaceProvider, WorkspaceSession } from '../workspace/types'
import { useWorkspaceStore } from './useWorkspaceStore'

describe('workspace lifecycle', () => {
  beforeEach(() => {
    localStorage.clear()
    useWorkspaceStore.setState({ status: 'idle', loadingMessage: '', error: null, provider: null, session: null, recentWorkspaces: [], executionOverrides: {} })
  })

  it('releases the active provider and returns to idle', async () => {
    const close = vi.fn().mockResolvedValue(undefined)
    useWorkspaceStore.setState({
      status: 'ready',
      provider: { close } as unknown as WorkspaceProvider,
      session: {} as WorkspaceSession,
    })

    await useWorkspaceStore.getState().closeWorkspace()

    expect(close).toHaveBeenCalledOnce()
    expect(useWorkspaceStore.getState()).toMatchObject({ status: 'idle', provider: null, session: null, error: null })
  })

  it('still releases local state when provider cleanup fails', async () => {
    const close = vi.fn().mockRejectedValue(new Error('handle unavailable'))
    useWorkspaceStore.setState({
      status: 'ready',
      provider: { close } as unknown as WorkspaceProvider,
      session: {} as WorkspaceSession,
    })

    await useWorkspaceStore.getState().closeWorkspace()

    expect(useWorkspaceStore.getState()).toMatchObject({ status: 'idle', provider: null, session: null })
    expect(useWorkspaceStore.getState().error).toContain('handle unavailable')
  })

  it('stores execution permission against the active workspace only', () => {
    useWorkspaceStore.setState({ session: { descriptor: { id: 'local:notes' }, compatibility: { status: 'supported' } } as WorkspaceSession })

    useWorkspaceStore.getState().setActiveWorkspaceExecution(true)

    expect(useWorkspaceStore.getState().executionOverrides).toEqual({ 'local:notes': true })
  })

  it('removes one or all recent workspace records without touching workspace data', () => {
    const recentWorkspaces = [
      { id: 'github:demo/one', type: 'github', name: 'One', sourceLabel: 'GitHub', openedAt: 1 },
      { id: 'local:two', type: 'local', name: 'Two', sourceLabel: 'Local', openedAt: 2 },
    ]
    useWorkspaceStore.setState({ recentWorkspaces })

    useWorkspaceStore.getState().removeRecentWorkspace('github:demo/one')
    expect(useWorkspaceStore.getState().recentWorkspaces.map((item) => item.id)).toEqual(['local:two'])

    useWorkspaceStore.getState().clearRecentWorkspaces()
    expect(useWorkspaceStore.getState().recentWorkspaces).toEqual([])
  })
})
