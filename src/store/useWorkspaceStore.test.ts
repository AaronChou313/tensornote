// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorkspaceProvider, WorkspaceSession } from '../workspace/types'
import { useWorkspaceStore } from './useWorkspaceStore'

describe('workspace lifecycle', () => {
  beforeEach(() => {
    localStorage.clear()
    useWorkspaceStore.setState({ status: 'idle', loadingMessage: '', error: null, provider: null, session: null })
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
})
