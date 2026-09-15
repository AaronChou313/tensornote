import { basename, dirname, normalizeWorkspacePath, resolveWorkspacePath } from '../path'
import { REMOTE_PROVIDER_LABELS, remoteRepositoryUrl, type RemoteProviderKind } from '../remote'
import type { WorkspaceCapabilities, WorkspaceDescriptor, WorkspaceEntry, WorkspaceFileStat, WorkspaceProvider } from '../types'
import type { RemoteMetadata, RemoteTreeEntry } from './remoteCache'

export abstract class RemoteWorkspaceProvider implements WorkspaceProvider {
  readonly capabilities: WorkspaceCapabilities = { read: true, write: false, watch: false, binary: true, git: false, authentication: false }
  readonly id: string
  descriptor: WorkspaceDescriptor
  protected tree = new Map<string, RemoteTreeEntry>()
  protected revision = ''
  private objectUrls = new Map<string, string>()

  protected constructor(readonly type: RemoteProviderKind, readonly project: string, readonly ref?: string) {
    this.id = `${type}:${project}${ref ? `@${ref}` : ''}`
    const name = project.split('/').at(-1) || project
    this.descriptor = {
      id: this.id,
      type,
      name,
      sourceLabel: `${REMOTE_PROVIDER_LABELS[type]} · 只读`,
      detail: `${project}${ref ? ` · ${ref}` : ''}`,
      config: { provider: type, project, repositoryUrl: this.repositoryUrl(), ...(ref ? { ref } : {}) },
    }
  }

  protected repositoryUrl() { return remoteRepositoryUrl(this.type, this.project) }

  protected applyMetadata(metadata: RemoteMetadata) {
    this.revision = metadata.revision
    this.tree = new Map(metadata.tree.map((entry) => [normalizeWorkspacePath(entry.path), entry]))
    this.descriptor = {
      ...this.descriptor,
      name: metadata.name,
      revision: metadata.revision,
      trustKey: `${this.type}:${this.project}@${metadata.revision}`,
      detail: `${this.project} · ${metadata.ref}`,
      config: { provider: this.type, project: this.project, repositoryUrl: this.repositoryUrl(), ref: metadata.ref },
    }
  }

  abstract open(): Promise<void>
  protected abstract readRemote(path: string): Promise<Response>

  async close() { this.tree.clear(); for (const url of this.objectUrls.values()) URL.revokeObjectURL(url); this.objectUrls.clear() }
  async list(path: string): Promise<WorkspaceEntry[]> {
    const parent = normalizeWorkspacePath(path)
    return [...this.tree.values()].filter((entry) => dirname(entry.path) === parent)
      .map((entry) => ({ path: entry.path, name: basename(entry.path), kind: entry.type === 'tree' ? 'directory' as const : 'file' as const }))
      .sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name, 'zh-CN', { numeric: true }))
  }
  async readText(path: string) { return (await this.readRemote(normalizeWorkspacePath(path))).text() }
  async readBinary(path: string) { return (await this.readRemote(normalizeWorkspacePath(path))).arrayBuffer() }
  async stat(path: string): Promise<WorkspaceFileStat> {
    const normalized = normalizeWorkspacePath(path)
    const entry = this.tree.get(normalized)
    if (!entry) throw new Error(`Workspace path not found: ${path}`)
    return { path: normalized, kind: entry.type === 'tree' ? 'directory' : 'file', size: entry.size }
  }
  async resolveAssetUrl(path: string, fromDocument: string) {
    if (/^(?:https?:|data:|blob:)/i.test(path)) return path
    const resolved = path.startsWith('/') ? normalizeWorkspacePath(path) : resolveWorkspacePath(fromDocument, path)
    const cached = this.objectUrls.get(resolved)
    if (cached) return cached
    const url = URL.createObjectURL(new Blob([await this.readBinary(resolved)]))
    this.objectUrls.set(resolved, url)
    return url
  }
}
