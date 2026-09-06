import { basename, dirname, joinWorkspacePath, normalizeWorkspacePath, resolveWorkspacePath } from '../path'
import {
  WorkspaceConflictError,
  WorkspaceNotFoundError,
  type WorkspaceCapabilities,
  type WorkspaceDescriptor,
  type WorkspaceEntry,
  type WorkspaceFileStat,
  type WorkspaceProvider,
  type WorkspaceWriteOptions,
} from '../types'

interface WritableFileLike {
  write(data: string | ArrayBuffer | Blob): Promise<void>
  close(): Promise<void>
}

interface FileHandleLike {
  kind: 'file'
  name: string
  getFile(): Promise<File>
  createWritable(): Promise<WritableFileLike>
}

interface DirectoryHandleLike {
  kind: 'directory'
  name: string
  values(): AsyncIterableIterator<FileHandleLike | DirectoryHandleLike>
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileHandleLike>
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<DirectoryHandleLike>
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>
}

interface DirectoryPickerWindow extends Window {
  showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<DirectoryHandleLike>
}

export async function pickLocalWorkspace() {
  const picker = (window as DirectoryPickerWindow).showDirectoryPicker
  if (!picker) throw new Error('当前浏览器不支持直接打开本地目录，请使用最新版 Chrome 或 Edge')
  const handle = await picker.call(window, { mode: 'readwrite' })
  return new LocalWorkspaceProvider(handle)
}

function changed(file: File, options?: WorkspaceWriteOptions) {
  if (!options) return false
  if (options.expectedModifiedAt !== undefined && file.lastModified !== options.expectedModifiedAt) return true
  if (options.expectedSize !== undefined && file.size !== options.expectedSize) return true
  return false
}

export class LocalWorkspaceProvider implements WorkspaceProvider {
  readonly type = 'local' as const
  readonly capabilities: WorkspaceCapabilities = {
    read: true,
    write: true,
    watch: true,
    binary: true,
    git: true,
    authentication: false,
  }
  readonly id: string
  readonly descriptor: WorkspaceDescriptor

  private readonly files = new Map<string, FileHandleLike>()
  private readonly directories = new Map<string, DirectoryHandleLike>()
  private readonly objectUrls = new Map<string, string>()

  constructor(private readonly root: DirectoryHandleLike) {
    this.id = `local:${root.name}`
    this.descriptor = {
      id: this.id,
      type: this.type,
      name: root.name,
      sourceLabel: 'Local workspace',
      detail: root.name,
      config: { provider: 'local' },
    }
  }

  async open() {
    this.files.clear()
    this.directories.clear()
    this.directories.set('', this.root)
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
        this.directories.set(path, entry)
        await this.scan(entry, path)
      } else {
        this.files.set(path, entry)
      }
    }
  }

  async list(path: string): Promise<WorkspaceEntry[]> {
    const parent = normalizeWorkspacePath(path)
    const entries: WorkspaceEntry[] = []
    for (const directoryPath of this.directories.keys()) {
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
    throw new WorkspaceNotFoundError(path)
  }

  private async ensureDirectory(path: string) {
    const normalized = normalizeWorkspacePath(path)
    if (!normalized) return this.root
    const cached = this.directories.get(normalized)
    if (cached) return cached
    let current = this.root
    let currentPath = ''
    for (const segment of normalized.split('/')) {
      currentPath = joinWorkspacePath(currentPath, segment)
      current = this.directories.get(currentPath) ?? await current.getDirectoryHandle(segment, { create: true })
      this.directories.set(currentPath, current)
    }
    return current
  }

  async createDirectory(path: string) {
    await this.ensureDirectory(path)
  }

  async writeText(path: string, content: string, options?: WorkspaceWriteOptions) {
    const normalized = normalizeWorkspacePath(path)
    const existing = this.files.get(normalized)
    if (!existing && options && (options.expectedModifiedAt !== undefined || options.expectedSize !== undefined)) {
      throw new WorkspaceConflictError(normalized)
    }
    if (existing && changed(await existing.getFile(), options)) throw new WorkspaceConflictError(normalized)
    const parent = await this.ensureDirectory(dirname(normalized))
    const handle = existing ?? await parent.getFileHandle(basename(normalized), { create: true })
    const writable = await handle.createWritable()
    await writable.write(content)
    await writable.close()
    this.files.set(normalized, handle)
    this.revokeObjectUrl(normalized)
    return this.stat(normalized)
  }

  async writeBinary(path: string, content: ArrayBuffer) {
    const normalized = normalizeWorkspacePath(path)
    const parent = await this.ensureDirectory(dirname(normalized))
    const handle = this.files.get(normalized) ?? await parent.getFileHandle(basename(normalized), { create: true })
    const writable = await handle.createWritable()
    await writable.write(content)
    await writable.close()
    this.files.set(normalized, handle)
    this.revokeObjectUrl(normalized)
    return this.stat(normalized)
  }

  private revokeObjectUrl(path: string) {
    const url = this.objectUrls.get(path)
    if (url) URL.revokeObjectURL(url)
    this.objectUrls.delete(path)
  }

  private forget(path: string) {
    const normalized = normalizeWorkspacePath(path)
    for (const filePath of [...this.files.keys()]) {
      if (filePath === normalized || filePath.startsWith(`${normalized}/`)) {
        this.files.delete(filePath)
        this.revokeObjectUrl(filePath)
      }
    }
    for (const directoryPath of [...this.directories.keys()]) {
      if (directoryPath === normalized || directoryPath.startsWith(`${normalized}/`)) this.directories.delete(directoryPath)
    }
  }

  async removeEntry(path: string) {
    const normalized = normalizeWorkspacePath(path)
    if (!normalized) throw new Error('不能删除 Workspace 根目录')
    const parent = this.directories.get(dirname(normalized))
    if (!parent) throw new Error(`Workspace directory not found: ${dirname(normalized)}`)
    await parent.removeEntry(basename(normalized), { recursive: true })
    this.forget(normalized)
  }

  async copyEntry(source: string, destination: string): Promise<void> {
    const from = normalizeWorkspacePath(source)
    const to = normalizeWorkspacePath(destination)
    if (!from || from === to || to.startsWith(`${from}/`)) throw new Error('目标路径不能与来源相同，也不能位于来源目录内部')
    if (this.files.has(to) || this.directories.has(to)) throw new Error(`目标路径已存在：${to}`)
    const file = this.files.get(from)
    if (file) {
      await this.writeBinary(to, await (await file.getFile()).arrayBuffer())
      return
    }
    if (!this.directories.has(from)) throw new Error(`Workspace path not found: ${source}`)
    await this.createDirectory(to)
    for (const entry of await this.list(from)) {
      await this.copyEntry(entry.path, joinWorkspacePath(to, entry.name))
    }
  }

  async moveEntry(source: string, destination: string) {
    await this.copyEntry(source, destination)
    await this.removeEntry(source)
  }

  watch(path: string, onChange: (stat: WorkspaceFileStat) => void) {
    let previous: WorkspaceFileStat | undefined
    let stopped = false
    void this.stat(path).then((stat) => { previous = stat }).catch(() => undefined)
    const timer = window.setInterval(() => {
      void this.stat(path).then((stat) => {
        if (!stopped && previous && (stat.modifiedAt !== previous.modifiedAt || stat.size !== previous.size)) onChange(stat)
        previous = stat
      }).catch(() => undefined)
    }, 2000)
    return () => { stopped = true; window.clearInterval(timer) }
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
