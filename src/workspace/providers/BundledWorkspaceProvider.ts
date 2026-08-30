import manifestSource from '../../../tensornote.yaml?raw'
import requirementsSource from '../../../requirements-jupyter.txt?raw'
import { basename, dirname, joinWorkspacePath, normalizeWorkspacePath, resolveWorkspacePath } from '../path'
import type { WorkspaceCapabilities, WorkspaceDescriptor, WorkspaceEntry, WorkspaceFileStat, WorkspaceProvider } from '../types'

const noteModules = import.meta.glob('../../../notes/**/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

const assetModules = import.meta.glob('../../../assets/**/*', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

function modulePath(path: string) {
  return normalizeWorkspacePath(path.replace(/^\.\.\/\.\.\/\.\.\//, ''))
}

export class BundledWorkspaceProvider implements WorkspaceProvider {
  readonly id = 'bundled:ai-learning-notes'
  readonly type = 'bundled' as const
  readonly capabilities: WorkspaceCapabilities = {
    read: true,
    write: false,
    watch: false,
    binary: true,
    git: false,
    authentication: false,
  }
  readonly descriptor: WorkspaceDescriptor = {
    id: this.id,
    type: this.type,
    name: 'AI Learning Notes',
    sourceLabel: 'Built-in · Read only',
    detail: 'Bundled with TensorNote',
    config: { provider: 'bundled' },
  }

  private readonly textFiles = new Map<string, string>([
    ['tensornote.yaml', manifestSource],
    ['requirements-jupyter.txt', requirementsSource],
    ...Object.entries(noteModules).map(([path, source]) => [modulePath(path), source] as const),
  ])
  private readonly assetUrls = new Map(
    Object.entries(assetModules).map(([path, url]) => [modulePath(path), url]),
  )

  async open() {}

  async close() {}

  async list(path: string): Promise<WorkspaceEntry[]> {
    const parent = normalizeWorkspacePath(path)
    const entries = new Map<string, WorkspaceEntry>()
    const allPaths = [...this.textFiles.keys(), ...this.assetUrls.keys()]

    for (const filePath of allPaths) {
      if (dirname(filePath) === parent) {
        entries.set(filePath, { path: filePath, name: basename(filePath), kind: 'file' })
        continue
      }
      const relative = parent ? filePath.slice(parent.length + 1) : filePath
      if ((parent && !filePath.startsWith(`${parent}/`)) || !relative.includes('/')) continue
      const directory = relative.split('/')[0]
      const directoryPath = joinWorkspacePath(parent, directory)
      entries.set(directoryPath, { path: directoryPath, name: directory, kind: 'directory' })
    }

    return [...entries.values()].sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name))
  }

  async readText(path: string) {
    const source = this.textFiles.get(normalizeWorkspacePath(path))
    if (source === undefined) throw new Error(`Workspace file not found: ${path}`)
    return source
  }

  async readBinary(path: string) {
    const normalized = normalizeWorkspacePath(path)
    const url = this.assetUrls.get(normalized)
    if (!url) throw new Error(`Workspace asset not found: ${path}`)
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Unable to read workspace asset: ${path}`)
    return response.arrayBuffer()
  }

  async stat(path: string): Promise<WorkspaceFileStat> {
    const normalized = normalizeWorkspacePath(path)
    if (this.textFiles.has(normalized) || this.assetUrls.has(normalized)) {
      return { path: normalized, kind: 'file' }
    }
    const entries = await this.list(normalized)
    if (entries.length) return { path: normalized, kind: 'directory' }
    throw new Error(`Workspace path not found: ${path}`)
  }

  async resolveAssetUrl(path: string, fromDocument: string) {
    if (/^(?:https?:|data:|blob:)/i.test(path)) return path
    const resolved = path.startsWith('/')
      ? normalizeWorkspacePath(path)
      : resolveWorkspacePath(fromDocument, path)
    return this.assetUrls.get(resolved) ?? path
  }
}
