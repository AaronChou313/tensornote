import type { Note } from '../types'
import type { NoteTreeItem } from '../content/noteTree'

export interface WorkspaceCapabilities {
  read: boolean
  write: boolean
  watch: boolean
  binary: boolean
  git: boolean
  authentication: boolean
}

export interface WorkspaceEntry {
  path: string
  name: string
  kind: 'file' | 'directory'
}

export interface WorkspaceFileStat {
  path: string
  kind: 'file' | 'directory'
  size?: number
  modifiedAt?: number
}

export type WorkspaceSourceType = 'bundled' | 'local' | 'github'

export interface WorkspaceDescriptor {
  id: string
  type: WorkspaceSourceType
  name: string
  sourceLabel: string
  detail?: string
  revision?: string
  trustKey?: string
  config?: Record<string, string>
}

export interface WorkspaceProvider {
  readonly id: string
  readonly type: WorkspaceSourceType
  readonly capabilities: WorkspaceCapabilities
  readonly descriptor: WorkspaceDescriptor

  open(): Promise<void>
  close(): Promise<void>
  list(path: string): Promise<WorkspaceEntry[]>
  readText(path: string): Promise<string>
  readBinary(path: string): Promise<ArrayBuffer>
  stat(path: string): Promise<WorkspaceFileStat>
  resolveAssetUrl(path: string, fromDocument: string): Promise<string>
}

export interface WorkspaceManifest {
  schemaVersion: number
  workspace: {
    name: string
    description?: string
  }
  content: {
    root: string
  }
  assets: {
    root: string
  }
  navigation: {
    mode: 'filesystem'
  }
  features: {
    executable: boolean
  }
  extensions: Record<string, unknown>
}

export interface WorkspaceSession {
  descriptor: WorkspaceDescriptor
  capabilities: WorkspaceCapabilities
  manifest: WorkspaceManifest
  documents: Note[]
  documentById: Map<string, Note>
  navigation: NoteTreeItem[]
  trusted: boolean
  openedAt: number
}

export interface RecentWorkspace {
  id: string
  type: WorkspaceSourceType
  name: string
  sourceLabel: string
  detail?: string
  config?: Record<string, string>
  openedAt: number
}
