import type { Note } from '../types'
import type { NoteTreeItem } from '../content/noteTree'
import type { KnowledgeIndex } from '../content/knowledgeIndex'
import type { PropertyIndex } from '../content/propertyIndex'

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

export interface WorkspaceWriteOptions {
  expectedModifiedAt?: number
  expectedSize?: number
}

export class WorkspaceConflictError extends Error {
  constructor(readonly path: string) {
    super(`文件已在外部发生变化：${path}`)
    this.name = 'WorkspaceConflictError'
  }
}

export type WorkspaceSourceType = 'bundled' | 'local' | 'github' | (string & {})

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
  writeText?(path: string, content: string, options?: WorkspaceWriteOptions): Promise<WorkspaceFileStat>
  writeBinary?(path: string, content: ArrayBuffer): Promise<WorkspaceFileStat>
  createDirectory?(path: string): Promise<void>
  removeEntry?(path: string): Promise<void>
  copyEntry?(source: string, destination: string): Promise<void>
  moveEntry?(source: string, destination: string): Promise<void>
  watch?(path: string, onChange: (stat: WorkspaceFileStat) => void): () => void
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
  environment: {
    files: string[]
  }
  extensions: Record<string, unknown>
}

export interface WorkspaceEnvironmentFile {
  path: string
  kind: 'requirements' | 'pyproject' | 'conda' | 'unknown'
  exists: boolean
  declared: boolean
}

export interface WorkspaceSession {
  descriptor: WorkspaceDescriptor
  capabilities: WorkspaceCapabilities
  manifest: WorkspaceManifest
  documents: Note[]
  documentById: Map<string, Note>
  knowledgeIndex: KnowledgeIndex
  propertyIndex: PropertyIndex
  environmentFiles: WorkspaceEnvironmentFile[]
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
