import { afterEach, describe, expect, it, vi } from 'vitest'
import { JupyterComputeProvider } from './JupyterComputeProvider'
import type { ComputeConnectionConfig } from './types'

const config: ComputeConnectionConfig = {
  serverUrl: 'https://hub.example.test/user/learner/tensornote/',
  token: 'private-token',
  kernelName: 'python3',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('JupyterComputeProvider REST authentication', () => {
  it('uses the Authorization header and keeps tokens out of URLs', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      kernelspecs: {
        python3: { spec: { display_name: 'Python 3', language: 'python' } },
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)

    const kernels = await new JupyterComputeProvider().listKernels(config)

    expect(kernels).toEqual([{ name: 'python3', displayName: 'Python 3', language: 'python' }])
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit]
    expect(url.toString()).toBe('https://hub.example.test/user/learner/tensornote/api/kernelspecs')
    expect(url.toString()).not.toContain(config.token)
    expect(init.headers).toEqual({ Authorization: 'token private-token' })
  })

  it('does not treat the public API root as proof of authentication', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
      .mockResolvedValueOnce(new Response('Forbidden', { status: 403 }))
    vi.stubGlobal('fetch', fetchMock)

    const checks = await new JupyterComputeProvider().diagnose(config)

    expect(checks.find((check) => check.id === 'server')?.status).toBe('pass')
    expect(checks.find((check) => check.id === 'authentication')).toMatchObject({ status: 'fail' })
    expect(checks.find((check) => check.id === 'kernel')).toMatchObject({ status: 'skipped' })
    expect(checks.find((check) => check.id === 'websocket')).toMatchObject({ status: 'skipped' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
