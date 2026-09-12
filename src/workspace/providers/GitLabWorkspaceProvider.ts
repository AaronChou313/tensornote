import { RemoteWorkspaceProvider } from './RemoteWorkspaceProvider'
import { readRemoteMetadataCache, writeRemoteMetadataCache, type RemoteTreeEntry } from './remoteCache'

function gitLabError(response: Response) {
  if (response.status === 404) return new Error('仓库不存在、不是公开仓库，或指定分支 / Ref 不存在')
  if (response.status === 429) return new Error('GitLab 公开访问额度已用完，请稍后重试')
  return new Error('当前网络无法访问 GitLab')
}

export class GitLabWorkspaceProvider extends RemoteWorkspaceProvider {
  private readonly encodedProject: string
  constructor(project: string, ref?: string) { super('gitlab', project, ref); this.encodedProject = encodeURIComponent(project) }

  private async api<T>(path: string): Promise<{ data: T; response: Response }> {
    const response = await fetch(`https://gitlab.com/api/v4${path}`)
    if (!response.ok) throw gitLabError(response)
    return { data: await response.json() as T, response }
  }

  async open() {
    const cached = readRemoteMetadataCache(this.type, this.project, this.ref)
    if (cached) { this.applyMetadata(cached); return }
    const { data: repository } = await this.api<{ default_branch: string; name: string }>(`/projects/${this.encodedProject}`)
    const targetRef = this.ref || repository.default_branch
    const { data: commit } = await this.api<{ id: string }>(`/projects/${this.encodedProject}/repository/commits/${encodeURIComponent(targetRef)}`)
    const tree: RemoteTreeEntry[] = []
    for (let page = 1; page <= 100; page += 1) {
      const { data, response } = await this.api<Array<{ id: string; path: string; type: 'blob' | 'tree' }>>(`/projects/${this.encodedProject}/repository/tree?recursive=true&per_page=100&page=${page}&ref=${encodeURIComponent(commit.id)}`)
      tree.push(...data.map((entry) => ({ path: entry.path, type: entry.type, sha: entry.id })))
      if (!response.headers.get('x-next-page') || data.length === 0) break
      if (page === 100) throw new Error('Repository 文件树过大')
    }
    const metadata = { name: repository.name, ref: targetRef, revision: commit.id, tree }
    writeRemoteMetadataCache(this.type, this.project, this.ref, metadata)
    this.applyMetadata(metadata)
  }

  protected async readRemote(path: string) {
    const response = await fetch(`https://gitlab.com/api/v4/projects/${this.encodedProject}/repository/files/${encodeURIComponent(path)}/raw?ref=${encodeURIComponent(this.revision)}`)
    if (!response.ok) throw gitLabError(response)
    return response
  }
}
