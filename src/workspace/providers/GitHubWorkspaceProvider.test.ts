import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GitHubWorkspaceProvider } from './GitHubWorkspaceProvider'
import { clearRemoteMetadataCache } from './remoteCache'

describe('GitHubWorkspaceProvider', () => {
  beforeEach(clearRemoteMetadataCache)
  afterEach(() => vi.unstubAllGlobals())

  it('caches metadata and the recursive tree for repeated opens', async () => {
    const payloads = [
      { default_branch: 'main', name: 'demo' },
      { sha: 'a'.repeat(40), commit: { tree: { sha: 'tree-sha' } } },
      { tree: [{ path: 'README.md', type: 'blob', sha: 'blob', size: 8 }], truncated: false },
    ]
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(payloads.shift()), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await new GitHubWorkspaceProvider('owner', 'cache-demo').open()
    await new GitHubWorkspaceProvider('owner', 'cache-demo').open()
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('reports the anonymous quota reset time', async () => {
    const reset = Math.floor((Date.now() + 60 * 60_000) / 1000)
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 403, headers: { 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': String(reset) } })))
    await expect(new GitHubWorkspaceProvider('owner', 'limited').open()).rejects.toThrow(/预计 \d{2}:\d{2} 后恢复/)
  })
})
