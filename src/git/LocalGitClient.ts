import type { GitBridgeHealth, GitDiff, GitHistoryEntry, GitStatus } from './types'

function normalizeBaseUrl(value: string) {
  const url = new URL(value.trim())
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Git Bridge URL 必须使用 http 或 https')
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) throw new Error('Git Bridge 必须运行在本机 localhost')
  if (url.username || url.password || (url.pathname !== '/' && url.pathname !== '')) throw new Error('Git Bridge URL 只能包含本机地址和端口')
  return url.toString().replace(/\/$/, '')
}

async function errorMessage(response: Response) {
  try {
    const payload = await response.json() as { error?: string }
    return payload.error || `Git Bridge 返回 HTTP ${response.status}`
  } catch {
    return `Git Bridge 返回 HTTP ${response.status}`
  }
}

export class LocalGitClient {
  readonly baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = normalizeBaseUrl(baseUrl)
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    let response: Response
    try {
      response = await fetch(`${this.baseUrl}${path}`, init)
    } catch {
      throw new Error(`无法连接 Git Bridge：${this.baseUrl}`)
    }
    if (!response.ok) throw new Error(await errorMessage(response))
    return response.json() as Promise<T>
  }

  health() {
    return this.request<GitBridgeHealth>('/api/git/health')
  }

  status() {
    return this.request<GitStatus>('/api/git/status')
  }

  async history(limit = 40) {
    const result = await this.request<{ entries: GitHistoryEntry[] }>(`/api/git/history?limit=${limit}`)
    return result.entries
  }

  diff(path: string, staged: boolean) {
    const params = new URLSearchParams({ path, staged: String(staged) })
    return this.request<GitDiff>(`/api/git/diff?${params}`)
  }

  stage(paths: string[], staged: boolean) {
    return this.request<GitStatus>('/api/git/stage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths, staged }),
    })
  }

  commit(message: string) {
    return this.request<GitStatus>('/api/git/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })
  }
}
