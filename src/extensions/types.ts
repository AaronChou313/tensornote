import type { Extension as CodeMirrorExtension } from '@uiw/react-codemirror'
import type { Command } from '../commands/CommandRegistry'
import type { ComputeProvider } from '../compute/types'
import type { WorkspaceProvider } from '../workspace/types'

export const extensionPermissions = ['workspace:read', 'workspace:write', 'network', 'compute', 'secret'] as const
export type ExtensionPermission = typeof extensionPermissions[number]
export type ExtensionSource = 'official' | 'local'
export type ExtensionStatus = 'loaded' | 'active' | 'disabled' | 'error'

export interface ExtensionManifest {
  id: string
  name: string
  version: string
  minTensorNoteVersion: string
  description?: string
  author?: string
  entry?: string
  permissions?: ExtensionPermission[]
}

export interface ExtensionViewContribution {
  id: string
  title: string
  description?: string
  body: string
}

export interface SidebarItemContribution {
  id: string
  label: string
  commandId: string
}

export interface MarkdownProcessorContext {
  documentPath: string
  noteId?: string
}

export type MarkdownProcessor = (markdown: string, context: MarkdownProcessorContext) => string

export interface ExtensionSetting {
  key: string
  label: string
  description?: string
  type: 'boolean' | 'text' | 'select'
  default: boolean | string
  options?: Array<{ label: string; value: string }>
}

export interface StatusBarItemContribution {
  id: string
  label: string
  tooltip?: string
  commandId?: string
  align?: 'left' | 'right'
}

export interface WorkspaceProviderContribution {
  id: string
  label: string
  create: (config?: Record<string, string>) => WorkspaceProvider
}

export interface ComputeProviderContribution {
  id: string
  label: string
  create: () => ComputeProvider
}

export interface ExtensionAPI {
  readonly extensionId: string
  commands: { register(command: Command): () => void }
  views: { register(view: ExtensionViewContribution): () => void; open(id: string): void }
  sidebar: { register(item: SidebarItemContribution): () => void }
  markdown: { registerProcessor(id: string, processor: MarkdownProcessor): () => void }
  editor: { registerExtension(id: string, extension: CodeMirrorExtension): () => void }
  settings: {
    register(setting: ExtensionSetting): () => void
    get<T extends boolean | string>(key: string, fallback: T): T
    set(key: string, value: boolean | string): void
  }
  statusBar: { register(item: StatusBarItemContribution): () => void }
  workspace: {
    readText(path: string): Promise<string>
    list(path: string): Promise<Array<{ path: string; name: string; kind: 'file' | 'directory' }>>
    writeText(path: string, content: string): Promise<void>
    registerProvider(provider: WorkspaceProviderContribution): () => void
  }
  network: { fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> }
  compute: { registerProvider(provider: ComputeProviderContribution): () => void }
  secrets: {
    get(key: string): string | null
    set(key: string, value: string): void
    delete(key: string): void
  }
}

export interface ExtensionModule {
  load?: () => void | Promise<void>
  activate: (api: ExtensionAPI) => void | Promise<void>
  deactivate?: () => void | Promise<void>
  dispose?: () => void | Promise<void>
}

export interface ExtensionRecord {
  manifest: ExtensionManifest
  source: ExtensionSource
  status: ExtensionStatus
  error?: string
}

export interface ExtensionContributionSnapshot {
  views: Array<ExtensionViewContribution & { extensionId: string }>
  sidebarItems: Array<SidebarItemContribution & { extensionId: string }>
  markdownProcessors: Array<{ id: string; extensionId: string; process: MarkdownProcessor }>
  editorExtensions: Array<{ id: string; extensionId: string; extension: CodeMirrorExtension }>
  settings: Array<ExtensionSetting & { extensionId: string }>
  statusBarItems: Array<StatusBarItemContribution & { extensionId: string }>
  workspaceProviders: Array<WorkspaceProviderContribution & { extensionId: string }>
  computeProviders: Array<ComputeProviderContribution & { extensionId: string }>
}
