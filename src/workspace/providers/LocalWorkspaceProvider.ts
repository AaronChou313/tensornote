import { basename, dirname, joinWorkspacePath, normalizeWorkspacePath, resolveWorkspacePath } from '../path'
import type { WorkspaceCapabilities, WorkspaceDescriptor, WorkspaceEntry, WorkspaceFileStat, WorkspaceProvider } from '../types'

interface FileHandleLike {
  kind: 'file'
  name: string
  getFile(): Promise<File>
}

interface DirectoryHandleLike {
  kind: 'directory'
  name: string
  values(): AsyncIterableIterator<FileHandleLike | DirectoryHandleLike>
}

interface DirectoryPickerWindow extends Window {
  showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<DirectoryHandleLike>
}

export async function pickLocalWorkspace() {
  const picker = (window as DirectoryPickerWindow).showDirectoryPicker
  if (!picker) throw new Error('当前浏览器不支持直接打开本地目录，请使用最新版 Chrome 或 Edge')
  const handle = await picker.call(window, { mode: 'read' })
  return new LocalWorkspaceProvider(handle)
}

export class LocalWorkspaceProvider implements WorkspaceProvider {
  readonly type = 'local' as const
  readonly capabilities: WorkspaceCapabilities = {
    read: true,
    write: false,
    watch: false,
    binary: true,
    git: false,
    authentication: false,
  }
  readonly id: string
  readonly descriptor: WorkspaceDescriptor

  private readonly files = new Map<string, FileHandleLike>()
  private readonly directories = new Set<string>([''])
  private readonly objectUrls = new Map<string, string>()

  constructor(private readonly root: DirectoryHandleLike) {
    this.id = `local:${root.name}`
    this.descriptor = {
      id: this.id,
      type: this.type,
      name: root.name,
      sourceLabel: 'Local · Read only',
      detail: root.name,
      config: { provider: 'local' },
    }
  }

  async open() {
    this.files.clear()
    this.directories.clear()
    this.directories.add('')
    await this.scan(this.root, '')
  }

  async close() {
    for (const url of this.objectUrls.values()) URL.revokeObjectURL(url)
    this.objectUrls.clear()
  }

  private async scan(directory: DirectoryHandleLike, parent: string) {
    for await (const entry of directory.values()) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') continue
      const path = joinWorkspacePath(parent, entry.name)
      if (entry.kind === 'directory') {
        this.directories.add(path)
        await this.scan(entry, path)
      } else {
        this.files.set(path, entry)
      }
    }
  }

  async list(path: string): Promise<WorkspaceEntry[]> {
    const parent = normalizeWorkspacePath(path)
    const entries: WorkspaceEntry[] = []
    for (const directoryPath of this.directories) {
      if (directoryPath && dirname(directoryPath) === parent) {
        entries.push({ path: directoryPath, name: basename(directoryPath), kind: 'directory' })
      }
    }
    for (const filePath of this.files.keys()) {
      if (dirname(filePath) === parent) entries.push({ path: filePath, name: basename(filePath), kind: 'file' })
    }
    return entries.sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name))
  }

  async readText(path: string) {
    const handle = this.files.get(normalizeWorkspacePath(path))
    if (!handle) throw new Error(`Workspace file not found: ${path}`)
    return (await handle.getFile()).text()
  }

  async readBinary(path: string) {
    const handle = this.files.get(normalizeWorkspacePath(path))
    if (!handle) throw new Error(`Workspace asset not found: ${path}`)
    return (await handle.getFile()).arrayBuffer()
  }

  async stat(path: string): Promise<WorkspaceFileStat> {
    const normalized = normalizeWorkspacePath(path)
    const fileHandle = this.files.get(normalized)
    if (fileHandle) {
      const file = await fileHandle.getFile()
      return { path: normalized, kind: 'file', size: file.size, modifiedAt: file.lastModified }
    }
    if (this.directories.has(normalized)) return { path: normalized, kind: 'directory' }
    throw new Error(`Workspace path not found: ${path}`)
  }

  async resolveAssetUrl(path: string, fromDocument: string) {
    if (/^(?:https?:|data:|blob:)/i.test(path)) return path
    const resolved = path.startsWith('/')
      ? normalizeWorkspacePath(path)
      : resolveWorkspacePath(fromDocument, path)
    const cached = this.objectUrls.get(resolved)
    if (cached) return cached
    const handle = this.files.get(resolved)
    if (!handle) return path
    const url = URL.createObjectURL(await handle.getFile())
    this.objectUrls.set(resolved, url)
    return url
  }
}
