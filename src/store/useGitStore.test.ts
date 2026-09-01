// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGitStore } from './useGitStore'
import type { GitClient, GitStatus } from '../git/types'

function response(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

function gitStatus(staged: boolean): GitStatus {
  return {
    branch: 'main',
    head: 'abcdef123456',
    upstream: 'origin/main',
    ahead: 0,
    behind: 0,
    detached: false,
    clean: false,
    changes: [{ path: 'note.md', indexStatus: staged ? 'M' : '.', worktreeStatus: staged ? '.' : 'M', staged, unstaged: !staged, kind: 'modified' }],
  }
}

beforeEach(() => {
  localStorage.clear()
  useGitStore.getState().disconnect()
  useGitStore.setState({ bridgeUrl: 'http://127.0.0.1:4318', connection: 'idle', busy: false, error: null, notice: null, health: null, status: null, history: [], diff: null })
  vi.unstubAllGlobals()
})

describe('Git store', () => {
  it('connects, stages a change, and follows the file into the staged diff', async () => {
    let staged = false
    vi.stubGlobal('fetch', vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/api/git/health')) return response({ version: '0.8.0', workspaceName: 'notes', repositoryRoot: '/tmp/notes' })
      if (url.endsWith('/api/git/status')) return response(gitStatus(staged))
      if (url.includes('/api/git/history')) return response({ entries: [] })
      if (url.includes('/api/git/diff')) return response({ path: 'note.md', staged: url.includes('staged=true'), patch: staged ? '+staged' : '+working' })
      if (url.endsWith('/api/git/stage') && init?.method === 'POST') { staged = true; return response(gitStatus(true)) }
      throw new Error(`Unexpected request: ${url}`)
    }))

    await useGitStore.getState().connect('notes')
    expect(useGitStore.getState()).toMatchObject({ connection: 'ready', diff: { path: 'note.md', staged: false, patch: '+working' } })
    await useGitStore.getState().stage('note.md', true)
    expect(useGitStore.getState()).toMatchObject({ notice: '已暂存 note.md', diff: { path: 'note.md', staged: true, patch: '+staged' } })
  })

  it('rejects a bridge connected to another workspace', async () => {
    vi.stubGlobal('fetch', vi.fn(() => response({ version: '0.8.0', workspaceName: 'other', repositoryRoot: '/tmp/other' })))
    await expect(useGitStore.getState().connect('notes')).rejects.toThrow('当前 Local Workspace 是“notes”')
    expect(useGitStore.getState()).toMatchObject({ connection: 'error', health: null })
  })

  it('accepts a native client without contacting the localhost bridge', async () => {
    const client: GitClient = {
      health: vi.fn().mockResolvedValue({ version: 'native-v1', workspaceName: 'notes', repositoryRoot: 'notes' }),
      status: vi.fn().mockResolvedValue({ ...gitStatus(false), clean: true, changes: [] }),
      history: vi.fn().mockResolvedValue([]),
      diff: vi.fn(),
      stage: vi.fn(),
      commit: vi.fn(),
    }
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await useGitStore.getState().connect('notes', client)

    expect(useGitStore.getState()).toMatchObject({ connection: 'ready', health: { version: 'native-v1' } })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
