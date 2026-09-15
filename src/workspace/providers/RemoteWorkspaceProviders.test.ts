import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GitLabWorkspaceProvider } from './GitLabWorkspaceProvider'
import { GiteeWorkspaceProvider } from './GiteeWorkspaceProvider'
import { clearRemoteMetadataCache } from './remoteCache'

describe('remote workspace providers', () => {
  beforeEach(clearRemoteMetadataCache)
  afterEach(() => vi.unstubAllGlobals())

  it('loads a paginated GitLab subgroup tree and Unicode file', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (/\/projects\/group%2Fsub%2Fdemo$/.test(url)) return new Response(JSON.stringify({ default_branch: 'main', name: 'demo' }))
      if (url.includes('/repository/commits/')) return new Response(JSON.stringify({ id: 'b'.repeat(40) }))
      if (url.includes('/repository/tree')) {
        const page = new URL(url).searchParams.get('page')
        return page === '1'
          ? new Response(JSON.stringify([{ id: 'blob', path: '笔记.md', type: 'blob' }]), { headers: { 'x-next-page': '2' } })
          : new Response(JSON.stringify([]))
      }
      if (url.includes('/repository/files/')) return new Response('# 中文')
      return new Response('{}', { status: 404 })
    })
    vi.stubGlobal('fetch', fetchMock)
    const provider = new GitLabWorkspaceProvider('group/sub/demo')
    await provider.open()
    expect((await provider.list('')).map((entry) => entry.name)).toEqual(['笔记.md'])
    expect(await provider.readText('笔记.md')).toBe('# 中文')
    expect(provider.descriptor.trustKey).toContain('gitlab:group/sub/demo@')
  })

  it('loads a Gitee tree and preserves binary responses', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/repos/foo/demo')) return new Response(JSON.stringify({ default_branch: 'main', name: 'demo' }))
      if (url.includes('/commits/')) return new Response(JSON.stringify({ sha: 'c'.repeat(40) }))
      if (url.includes('/git/trees/')) return new Response(JSON.stringify({ tree: [{ path: '图片/一.png', type: 'blob', sha: 'asset', size: 3 }] }))
      if (url.includes('/raw/')) return new Response(Uint8Array.from([1, 2, 3]))
      return new Response('{}', { status: 404 })
    }))
    const provider = new GiteeWorkspaceProvider('foo/demo')
    await provider.open()
    expect(await provider.stat('图片/一.png')).toMatchObject({ kind: 'file', size: 3 })
    expect([...new Uint8Array(await provider.readBinary('图片/一.png'))]).toEqual([1, 2, 3])
  })

  it('passes a custom GitLab ref safely and explains missing refs', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/projects/group%2Fdemo')) return new Response(JSON.stringify({ default_branch: 'main', name: 'demo' }))
      return new Response('{}', { status: 404 })
    })
    vi.stubGlobal('fetch', fetchMock)
    await expect(new GitLabWorkspaceProvider('group/demo', 'release/v2').open()).rejects.toThrow('指定分支 / Ref 不存在')
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/commits/release%2Fv2'))).toBe(true)
  })
})
