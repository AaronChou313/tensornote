import { normalizeWorkspacePath, resolveWorkspacePath } from '../path'
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
import type { HostDirectorySelection } from '../../host/types'

type InvokeArgs = Record<string, unknown>

async function invokeNative<T>(command: string, args: InvokeArgs = {}): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core')
  try {
    return await invoke<T>(command, args)
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : String(reason)
    if (message.startsWith('WORKSPACE_NOT_FOUND:')) throw new WorkspaceNotFoundError(message.slice('WORKSPACE_NOT_FOUND:'.length))
    if (message.startsWith('WORKSPACE_CONFLICT:')) {
      throw new WorkspaceConflictError(message.slice('WORKSPACE_CONFLICT:'.length))
    }
    throw new Error(message)
  }
}

function binaryBuffer(value: ArrayBuffer | Uint8Array | number[]) {
  if (value instanceof ArrayBuffer) return value
  const bytes = value instanceof Uint8Array ? value : Uint8Array.from(value)
  return Uint8Array.from(bytes).buffer
}

export class NativeLocalWorkspaceProvider implements WorkspaceProvider {
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

  private readonly objectUrls = new Map<string, string>()

  constructor(readonly selection: HostDirectorySelection) {
    this.id = selection.workspaceId
    this.descriptor = {
      id: selection.workspaceId,
      type: this.type,
      name: selection.name,
      sourceLabel: 'Native local workspace',
      detail: selection.name,
      config: { provider: 'native-local', workspaceId: selection.workspaceId },
    }
  }

  private args(path?: string): InvokeArgs {
    return path === undefined
      ? { workspaceId: this.selection.workspaceId }
      : { workspaceId: this.selection.workspaceId, path: normalizeWorkspacePath(path) }
  }

  async open() {
    await this.list('')
  }

  async close() {
    for (const url of this.objectUrls.values()) URL.revokeObjectURL(url)
    this.objectUrls.clear()
  }

  list(path: string): Promise<WorkspaceEntry[]> {
    return invokeNative('native_workspace_list', this.args(path))
  }

  readText(path: string): Promise<string> {
    return invokeNative('native_workspace_read_text', this.args(path))
  }

  async readBinary(path: string): Promise<ArrayBuffer> {
    return binaryBuffer(await invokeNative<ArrayBuffer | Uint8Array | number[]>('native_workspace_read_binary', this.args(path)))
  }

  stat(path: string): Promise<WorkspaceFileStat> {
    return invokeNative('native_workspace_stat', this.args(path))
  }

  writeText(path: string, content: string, options?: WorkspaceWriteOptions): Promise<WorkspaceFileStat> {
    return invokeNative('native_workspace_write_text', {
      ...this.args(path),
      content,
      expectedModifiedAt: options?.expectedModifiedAt,
      expectedSize: options?.expectedSize,
    })
  }

  writeBinary(path: string, content: ArrayBuffer): Promise<WorkspaceFileStat> {
    return invokeNative('native_workspace_write_binary', {
      ...this.args(path),
      content: Array.from(new Uint8Array(content)),
    })
  }

  createDirectory(path: string): Promise<void> {
    return invokeNative('native_workspace_create_directory', this.args(path))
  }

  removeEntry(path: string): Promise<void> {
    return invokeNative('native_workspace_remove_entry', this.args(path))
  }

  copyEntry(source: string, destination: string): Promise<void> {
    return invokeNative('native_workspace_copy_entry', {
      workspaceId: this.selection.workspaceId,
      source: normalizeWorkspacePath(source),
      destination: normalizeWorkspacePath(destination),
    })
  }

  moveEntry(source: string, destination: string): Promise<void> {
    return invokeNative('native_workspace_move_entry', {
      workspaceId: this.selection.workspaceId,
      source: normalizeWorkspacePath(source),
      destination: normalizeWorkspacePath(destination),
    })
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
    }, 1500)
    return () => { stopped = true; window.clearInterval(timer) }
  }

  async resolveAssetUrl(path: string, fromDocument: string) {
    if (/^(?:https?:|data:|blob:)/i.test(path)) return path
    const resolved = path.startsWith('/')
      ? normalizeWorkspacePath(path)
      : resolveWorkspacePath(fromDocument, path)
    const cached = this.objectUrls.get(resolved)
    if (cached) return cached
    try {
      const content = await this.readBinary(resolved)
      const extension = resolved.split('.').pop()?.toLowerCase()
      const mime = extension === 'png' ? 'image/png'
        : extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg'
          : extension === 'gif' ? 'image/gif'
            : extension === 'svg' ? 'image/svg+xml'
              : extension === 'webp' ? 'image/webp'
                : 'application/octet-stream'
      const url = URL.createObjectURL(new Blob([content], { type: mime }))
      this.objectUrls.set(resolved, url)
      return url
    } catch {
      return path
    }
  }
}
