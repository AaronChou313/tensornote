import { afterEach, describe, expect, it, vi } from 'vitest'
import { GitHubWorkspaceProvider } from './GitHubWorkspaceProvider'

describe('GitHubWorkspaceProvider', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('bypasses browser HTTP caches when resolving the latest branch revision', async () => {
    const payloads = [
      { default_branch: 'main', name: 'demo' },
      { sha: 'a'.repeat(40), commit: { tree: { sha: 'tree-sha' } } },
      { tree: [], truncated: false },
    ]
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(input).toBeDefined()
      expect(init?.cache).toBe('no-store')
      return new Response(JSON.stringify(payloads.shift()), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)

    await new GitHubWorkspaceProvider('owner', 'demo').open()

    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
