import { afterEach, describe, expect, it, vi } from 'vitest'
import { LocalGitClient } from './LocalGitClient'

afterEach(() => vi.unstubAllGlobals())

describe('LocalGitClient', () => {
  it('encodes diff paths and staged mode', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ path: 'notes/a b.md', staged: true, patch: 'diff' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const client = new LocalGitClient('http://127.0.0.1:4318/')
    await expect(client.diff('notes/a b.md', true)).resolves.toMatchObject({ patch: 'diff' })
    expect(fetchMock).toHaveBeenCalledWith('http://127.0.0.1:4318/api/git/diff?path=notes%2Fa+b.md&staged=true', undefined)
  })

  it('returns bridge errors and a clear offline message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: '没有已暂存的改动' }), { status: 400 })))
    await expect(new LocalGitClient('http://127.0.0.1:4318').commit('test')).rejects.toThrow('没有已暂存的改动')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    await expect(new LocalGitClient('http://127.0.0.1:4318').health()).rejects.toThrow('无法连接 Git Bridge')
  })

  it('only connects to a loopback Git Bridge', () => {
    expect(() => new LocalGitClient('https://git.example.com')).toThrow('必须运行在本机')
    expect(() => new LocalGitClient('http://localhost:4318/extra')).toThrow('只能包含本机地址和端口')
  })
})
