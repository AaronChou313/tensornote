import { describe, expect, it } from 'vitest'
import { migrateComputeState } from './useComputeStore'

describe('compute settings migration', () => {
  it('migrates the legacy single-server shape into a local direct profile', () => {
    const state = migrateComputeState({ serverUrl: 'http://127.0.0.1:9999', kernelName: 'python311' }, 1)
    expect(state.profiles[0]).toMatchObject({ serverUrl: 'http://127.0.0.1:9999', kernelName: 'python311', runtimeLocation: 'local', connector: { kind: 'direct' } })
    expect(state.lastLocalEnvironmentId).toBe('')
  })

  it('drops transient owned profiles and repairs the active profile', () => {
    const state = migrateComputeState({
      profiles: [
        { id: 'remote', name: 'Remote', kind: 'jupyter', serverUrl: 'https://jupyter.example.com', kernelName: 'python3', scope: 'workspace' },
        { id: 'owned', name: 'Owned', kind: 'jupyter', serverUrl: 'http://127.0.0.1:1234', kernelName: 'python3', scope: 'workspace', runtimeServerId: 'server:secret' },
      ],
      activeProfileId: 'owned',
      lastLocalEnvironmentId: 'python:remembered',
    }, 2)
    expect(state.profiles).toHaveLength(1)
    expect(state.profiles[0]).toMatchObject({ id: 'remote', runtimeLocation: 'remote', connector: { kind: 'direct' } })
    expect(state.activeProfileId).toBe('remote')
    expect(state.lastLocalEnvironmentId).toBe('python:remembered')
  })
})
