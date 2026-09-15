import { RemoteWorkspaceProvider } from './RemoteWorkspaceProvider'
import { readRemoteMetadataCache, writeRemoteMetadataCache, type RemoteTreeEntry } from './remoteCache'

function giteeError(response: Response) {
  if (response.status === 404) return new Error('仓库不存在、不是公开仓库，或指定分支 / Ref 不存在')
  if (response.status === 403 || response.status === 429) return new Error('Gitee 公开访问额度已用完，请稍后重试')
  return new Error('当前网络无法访问 Gitee')
}

export class GiteeWorkspaceProvider extends RemoteWorkspaceProvider {
  readonly owner: string
  readonly repo: string
  constructor(project: string, ref?: string) {
    super('gitee', project, ref)
    const [owner, repo] = project.split('/')
    this.owner = owner; this.repo = repo
  }

  private async api<T>(path: string): Promise<T> {
    const response = await fetch(`https://gitee.com/api/v5${path}`)
    if (!response.ok) throw giteeError(response)
    return response.json() as Promise<T>
  }

  async open() {
    const cached = readRemoteMetadataCache(this.type, this.project, this.ref)
    if (cached) { this.applyMetadata(cached); return }
    const repository = await this.api<{ default_branch: string; name: string }>(`/repos/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}`)
    const targetRef = this.ref || repository.default_branch
    const commit = await this.api<{ sha?: string; commit?: { sha?: string } }>(`/repos/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}/commits/${encodeURIComponent(targetRef)}`)
    const revision = commit.sha || commit.commit?.sha
    if (!revision) throw new Error('无法解析 Gitee 分支版本')
    const result = await this.api<{ tree: RemoteTreeEntry[]; truncated?: boolean }>(`/repos/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}/git/trees/${revision}?recursive=1`)
    if (result.truncated) throw new Error('Repository 文件树过大，Gitee 返回了不完整结果')
    const metadata = { name: repository.name, ref: targetRef, revision, tree: result.tree }
    writeRemoteMetadataCache(this.type, this.project, this.ref, metadata)
    this.applyMetadata(metadata)
  }

  protected async readRemote(path: string) {
    const encodedPath = path.split('/').map(encodeURIComponent).join('/')
    const response = await fetch(`https://gitee.com/api/v5/repos/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}/raw/${encodedPath}?ref=${encodeURIComponent(this.revision)}`)
    if (!response.ok) throw giteeError(response)
    return response
  }
}
