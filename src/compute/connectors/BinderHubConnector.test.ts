import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ComputeConnectionRequest, ComputeProfile } from '../types'
import { BinderHubConnector } from './BinderHubConnector'

const revision = '1234567890abcdef1234567890abcdef12345678'
const profile: ComputeProfile = {
  id: 'binder',
  name: 'Binder',
  kind: 'jupyter',
  serverUrl: 'https://binder.example.org',
  kernelName: 'python3',
  scope: 'workspace',
  connector: { kind: 'binderhub', shutdownOnDisconnect: true },
}

function request(): ComputeConnectionRequest {
  return {
    profile,
    credential: '',
    context: { workspaceId: 'github:demo', workspaceSource: { provider: 'github', repository: 'owner/repo', revision } },
    onEvent: vi.fn(),
  }
}

afterEach(() => vi.unstubAllGlobals())

describe('BinderHubConnector', () => {
  it('launches only a pinned source and keeps the returned token in the lease', async () => {
    const events = [
      { phase: 'fetching', message: 'Fetching' },
      { phase: 'building', message: 'Building' },
      { phase: 'ready', message: 'Ready', url: 'https://user.example.org/user/u/', token: 'temporary-secret' },
    ].map((event) => `data: ${JSON.stringify(event)}\n\n`).join('')
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(events))
      .mockResolvedValueOnce(new Response('', { status: 202 }))
    vi.stubGlobal('fetch', fetchMock)
    const lease = await new BinderHubConnector().connect(request())
    expect(fetchMock).toHaveBeenNthCalledWith(1, `https://binder.example.org/build/gh/owner/repo/${revision}`, expect.objectContaining({ mode: 'cors' }))
    expect(lease.connection.token).toBe('temporary-secret')
    expect(lease.persistence).toBe('temporary')
    await lease.release()
    const shutdownUrl = new URL(fetchMock.mock.calls[1][0] as URL)
    expect(shutdownUrl.origin + shutdownUrl.pathname).toBe('https://user.example.org/user/u/api/shutdown')
    expect(shutdownUrl.searchParams.has('token')).toBe(false)
    expect(fetchMock.mock.calls[1][1]).toEqual(expect.objectContaining({
      headers: { Authorization: 'token temporary-secret' },
    }))
  })

  it('rejects mutable refs before making a network request', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(new BinderHubConnector().connect({
      ...request(),
      context: { workspaceId: 'github:demo', workspaceSource: { provider: 'github', repository: 'owner/repo', revision: 'main' } },
    })).rejects.toThrow('完整 commit SHA')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reports temporary storage and health without triggering a build', async () => {
    const fetchMock = vi.fn(async () => new Response('{}'))
    vi.stubGlobal('fetch', fetchMock)
    const result = await new BinderHubConnector().diagnose(request())
    expect(result.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'source', status: 'pass' }),
      expect.objectContaining({ id: 'persistence', status: 'warning' }),
    ]))
    expect(fetchMock).toHaveBeenCalledWith('https://binder.example.org/health', expect.anything())
  })
})
