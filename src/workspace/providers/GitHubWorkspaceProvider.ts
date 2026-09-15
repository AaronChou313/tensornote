import { RemoteWorkspaceProvider } from './RemoteWorkspaceProvider'
import { readRemoteMetadataCache, writeRemoteMetadataCache, type RemoteTreeEntry } from './remoteCache'

function githubError(response: Response) {
  if (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0') {
    const reset = Number(response.headers.get('x-ratelimit-reset')) * 1000
    const time = Number.isFinite(reset) && reset > Date.now()
      ? new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' }).format(reset)
      : null
    return new Error(`GitHub 匿名访问额度已用完。${time ? `预计 ${time} 后恢复。` : '请稍后重试。'}`)
  }
  if (response.status === 404) return new Error('仓库不存在、不是公开仓库，或指定分支 / Ref 不存在')
  if (response.status === 422) return new Error('指定分支 / Ref 不存在')
  return new Error('当前网络无法读取 GitHub 知识库')
}

export class GitHubWorkspaceProvider extends RemoteWorkspaceProvider {
  constructor(readonly owner: string, readonly repo: string, ref?: string) { super('github', `${owner}/${repo}`, ref) }

  private async api<T>(path: string): Promise<T> {
    const response = await fetch(`https://api.github.com${path}`, { headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' } })
    if (!response.ok) throw githubError(response)
    return response.json() as Promise<T>
  }

  async open() {
    const cached = readRemoteMetadataCache(this.type, this.project, this.ref)
    if (cached) { this.applyMetadata(cached); return }
    const repository = await this.api<{ default_branch: string; name: string }>(`/repos/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}`)
    const targetRef = this.ref || repository.default_branch
    const commit = await this.api<{ sha: string; commit: { tree: { sha: string } } }>(`/repos/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}/commits/${encodeURIComponent(targetRef)}`)
    const result = await this.api<{ tree: RemoteTreeEntry[]; truncated: boolean }>(`/repos/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}/git/trees/${commit.commit.tree.sha}?recursive=1`)
    if (result.truncated) throw new Error('Repository 文件树过大，GitHub 返回了不完整结果')
    const metadata = { name: repository.name, ref: targetRef, revision: commit.sha, tree: result.tree }
    writeRemoteMetadataCache(this.type, this.project, this.ref, metadata)
    this.applyMetadata(metadata)
  }

  protected async readRemote(path: string) {
    const encodedPath = path.split('/').map(encodeURIComponent).join('/')
    const response = await fetch(`https://raw.githubusercontent.com/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}/${this.revision}/${encodedPath}`)
    if (!response.ok) throw githubError(response)
    return response
  }
}
