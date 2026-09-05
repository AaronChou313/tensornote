import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ComputeConnectionRequest, ComputeProfile } from '../types'
import { JupyterHubConnector } from './JupyterHubConnector'

const profile: ComputeProfile = {
  id: 'hub',
  name: 'Team Hub',
  kind: 'jupyter',
  serverUrl: 'https://hub.example.org',
  kernelName: 'python3',
  scope: 'workspace',
  connector: { kind: 'jupyterhub', serverName: 'tensornote', stopOnDisconnect: true },
}

function request(onEvent = vi.fn()): ComputeConnectionRequest {
  return { profile, credential: 'hub-secret', context: { workspaceId: 'github:demo' }, onEvent }
}

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })
}

afterEach(() => vi.unstubAllGlobals())

describe('JupyterHubConnector', () => {
  it('reuses an existing server and never stops it', async () => {
    const fetchMock = vi.fn(async () => json({
      name: 'aaron',
      servers: { tensornote: { name: 'tensornote', ready: true, url: '/user/aaron/tensornote/' } },
    }))
    vi.stubGlobal('fetch', fetchMock)
    const lease = await new JupyterHubConnector().connect(request())
    expect(lease.connection).toEqual({ serverUrl: 'https://hub.example.org/user/aaron/tensornote/', token: 'hub-secret', kernelName: 'python3' })
    expect(lease.ownership).toBe('external')
    await lease.release()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('starts, follows progress, and stops a TensorNote-owned named server', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ name: 'aaron', servers: {} }))
      .mockResolvedValueOnce(json({}, 202))
      .mockResolvedValueOnce(json({ name: 'aaron', servers: { tensornote: { ready: false, pending: 'spawn', progress_url: '/hub/api/users/aaron/servers/tensornote/progress' } } }))
      .mockResolvedValueOnce(new Response('data: {"progress":100,"ready":true,"url":"/user/aaron/tensornote/","message":"Ready"}\n\n'))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    const onEvent = vi.fn()
    const lease = await new JupyterHubConnector().connect(request(onEvent))
    expect(lease.ownership).toBe('tensornote')
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ phase: 'ready', progress: 100 }))
    await lease.release()
    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://hub.example.org/hub/api/users/aaron/servers/tensornote',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('rejects a profile username that does not own the token', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ name: 'another-user', servers: {} })))
    const mismatched = { ...profile, connector: { ...profile.connector, kind: 'jupyterhub' as const, username: 'aaron' } }
    await expect(new JupyterHubConnector().connect({ ...request(), profile: mismatched })).rejects.toThrow('不一致')
  })
})
