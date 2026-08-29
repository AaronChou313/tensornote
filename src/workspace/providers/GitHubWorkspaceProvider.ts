import { basename, dirname, normalizeWorkspacePath, resolveWorkspacePath } from '../path'
import type { WorkspaceCapabilities, WorkspaceDescriptor, WorkspaceEntry, WorkspaceFileStat, WorkspaceProvider } from '../types'

interface GitHubTreeItem {
  path: string
  mode: string
  type: 'blob' | 'tree'
  sha: string
  size?: number
}

function githubError(response: Response) {
  if (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0') {
    return new Error('GitHub API 匿名访问额度已用完，请稍后重试')
  }
  if (response.status === 404) return new Error('GitHub Repository 或指定 Ref 不存在')
  return new Error(`GitHub 请求失败 (${response.status})`)
}

export class GitHubWorkspaceProvider implements WorkspaceProvider {
  readonly type = 'github' as const
  readonly capabilities: WorkspaceCapabilities = {
    read: true,
    write: false,
    watch: false,
    binary: true,
    git: true,
    authentication: false,
  }
  readonly id: string
  descriptor: WorkspaceDescriptor

  private revision = ''
  private tree = new Map<string, GitHubTreeItem>()

  constructor(readonly owner: string, readonly repo: string, readonly ref?: string) {
    this.id = `github:${owner}/${repo}${ref ? `@${ref}` : ''}`
    this.descriptor = {
      id: this.id,
      type: this.type,
      name: repo,
      sourceLabel: 'GitHub · Read only',
      detail: `${owner}/${repo}${ref ? ` · ${ref}` : ''}`,
      config: { owner, repo, ...(ref ? { ref } : {}) },
    }
  }

  private async api<T>(path: string): Promise<T> {
    const response = await fetch(`https://api.github.com${path}`, {
      headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    })
    if (!response.ok) throw githubError(response)
    return response.json() as Promise<T>
  }

  async open() {
    const repository = await this.api<{ default_branch: string; name: string }>(`/repos/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}`)
    const targetRef = this.ref || repository.default_branch
    const commit = await this.api<{ sha: string; commit: { tree: { sha: string } } }>(
      `/repos/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}/commits/${encodeURIComponent(targetRef)}`,
    )
    const result = await this.api<{ tree: GitHubTreeItem[]; truncated: boolean }>(
      `/repos/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}/git/trees/${commit.commit.tree.sha}?recursive=1`,
    )
    if (result.truncated) throw new Error('Repository 文件树过大，GitHub API 返回了不完整结果')

    this.revision = commit.sha
    this.tree = new Map(result.tree.map((entry) => [normalizeWorkspacePath(entry.path), entry]))
    this.descriptor = {
      ...this.descriptor,
      name: repository.name,
      revision: commit.sha,
      trustKey: `github:${this.owner}/${this.repo}@${commit.sha}`,
      detail: `${this.owner}/${this.repo} · ${targetRef}`,
      config: { owner: this.owner, repo: this.repo, ref: targetRef },
    }
  }

  async close() {
    this.tree.clear()
  }

  async list(path: string): Promise<WorkspaceEntry[]> {
    const parent = normalizeWorkspacePath(path)
    return [...this.tree.values()]
      .filter((entry) => dirname(entry.path) === parent)
      .map((entry) => ({ path: entry.path, name: basename(entry.path), kind: entry.type === 'tree' ? 'directory' as const : 'file' as const }))
      .sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name))
  }

  private rawUrl(path: string) {
    return `https://raw.githubusercontent.com/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}/${this.revision}/${normalizeWorkspacePath(path).split('/').map(encodeURIComponent).join('/')}`
  }

  async readText(path: string) {
    const response = await fetch(this.rawUrl(path))
    if (!response.ok) throw githubError(response)
    return response.text()
  }

  async readBinary(path: string) {
    const response = await fetch(this.rawUrl(path))
    if (!response.ok) throw githubError(response)
    return response.arrayBuffer()
  }

  async stat(path: string): Promise<WorkspaceFileStat> {
    const normalized = normalizeWorkspacePath(path)
    const entry = this.tree.get(normalized)
    if (!entry) throw new Error(`Workspace path not found: ${path}`)
    return { path: normalized, kind: entry.type === 'tree' ? 'directory' : 'file', size: entry.size }
  }

  async resolveAssetUrl(path: string, fromDocument: string) {
    if (/^(?:https?:|data:|blob:)/i.test(path)) return path
    const resolved = path.startsWith('/')
      ? normalizeWorkspacePath(path)
      : resolveWorkspacePath(fromDocument, path)
    return this.rawUrl(resolved)
  }
}
