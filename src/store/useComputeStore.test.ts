import { beforeEach, describe, expect, it } from 'vitest'
import { useComputeStore } from './useComputeStore'

describe('compute store owned runtime profiles', () => {
  beforeEach(() => {
    useComputeStore.setState({
      profiles: [{
        id: 'local-python',
        name: 'Local Python',
        kind: 'jupyter',
        serverUrl: 'http://127.0.0.1:8888',
        kernelName: 'python3',
        scope: 'note',
      }],
      activeProfileId: 'local-python',
      tokens: {},
    })
  })

  it('creates and reuses a session-only profile for an owned server', () => {
    const input = {
      serverId: 'server:opaque',
      environmentName: 'TensorNote Base',
      serverUrl: 'http://127.0.0.1:43121',
      kernelName: 'tensornote-base',
      token: 'secret-token',
    }
    const id = useComputeStore.getState().upsertOwnedRuntimeProfile(input)
    expect(useComputeStore.getState().profiles).toHaveLength(2)
    expect(useComputeStore.getState().activeProfileId).toBe(id)
    expect(useComputeStore.getState().tokens[id]).toBe('secret-token')

    expect(useComputeStore.getState().upsertOwnedRuntimeProfile({ ...input, serverUrl: 'http://127.0.0.1:43122' })).toBe(id)
    expect(useComputeStore.getState().profiles).toHaveLength(2)
    expect(useComputeStore.getState().profiles[1].serverUrl).toBe('http://127.0.0.1:43122')

    useComputeStore.getState().removeOwnedRuntimeProfile(input.serverId)
    expect(useComputeStore.getState().profiles).toHaveLength(1)
    expect(useComputeStore.getState().tokens[id]).toBeUndefined()
    expect(useComputeStore.getState().activeProfileId).toBe('local-python')
  })
})
