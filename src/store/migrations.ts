import { extensionPermissions, type ExtensionPermission } from '../extensions/types'
import type { NoteProgress } from '../types'
import type { RecentWorkspace } from '../workspace/types'

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function booleanRecord(value: unknown) {
  return Object.fromEntries(Object.entries(record(value)).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean'))
}

function progressRecord(value: unknown) {
  const result: Record<string, NoteProgress> = {}
  for (const [id, item] of Object.entries(record(value))) {
    const progress = record(item)
    result[id] = {
      read: progress.read === true,
      labRun: progress.labRun === true,
      reviewed: progress.reviewed === true,
    }
  }
  return result
}

export function migrateAppPreferences(persisted: unknown) {
  const state = record(persisted)
  const legacyProgress = state.noteProgress ?? state.progress
  return {
    theme: state.theme === 'dark' || state.theme === 'light' ? state.theme : state.darkMode === true ? 'dark' : 'light',
    editorDefaultMode: state.editorDefaultMode === 'edit' || state.editorDefaultMode === 'split' || state.editorDefaultMode === 'read' ? state.editorDefaultMode : 'read',
    editorLineNumbers: state.editorLineNumbers !== false,
    editorWordWrap: state.editorWordWrap !== false,
    progress: progressRecord(legacyProgress),
  }
}

function recentWorkspace(value: unknown): RecentWorkspace | null {
  const item = record(value)
  if (typeof item.id !== 'string' || typeof item.type !== 'string' || typeof item.name !== 'string') return null
  const config = Object.fromEntries(Object.entries(record(item.config)).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
  return {
    id: item.id,
    type: item.type,
    name: item.name,
    sourceLabel: typeof item.sourceLabel === 'string' ? item.sourceLabel : item.type,
    detail: typeof item.detail === 'string' ? item.detail : undefined,
    config,
    openedAt: typeof item.openedAt === 'number' && Number.isFinite(item.openedAt) ? item.openedAt : 0,
  }
}

export function migrateWorkspaceSettings(persisted: unknown) {
  const state = record(persisted)
  const candidates = Array.isArray(state.recentWorkspaces) ? state.recentWorkspaces : Array.isArray(state.recent) ? state.recent : []
  const recentWorkspaces = candidates.map(recentWorkspace).filter((item): item is RecentWorkspace => item !== null).slice(0, 8)
  const trustedRevisions = Array.isArray(state.trustedRevisions)
    ? [...new Set(state.trustedRevisions.filter((item): item is string => typeof item === 'string' && item.length > 0))]
    : []
  return { recentWorkspaces, trustedRevisions }
}

export function migrateExtensionSettings(persisted: unknown) {
  const state = record(persisted)
  const rawGrants = record(state.grants ?? state.permissions)
  const grants: Record<string, ExtensionPermission[]> = {}
  for (const [id, values] of Object.entries(rawGrants)) {
    if (!Array.isArray(values)) continue
    grants[id] = [...new Set(values.filter((value): value is ExtensionPermission => extensionPermissions.includes(value as ExtensionPermission)))]
  }
  const settings: Record<string, Record<string, boolean | string>> = {}
  for (const [id, values] of Object.entries(record(state.settings))) {
    settings[id] = Object.fromEntries(Object.entries(record(values)).filter((entry): entry is [string, boolean | string] => typeof entry[1] === 'boolean' || typeof entry[1] === 'string'))
  }
  return { enabled: booleanRecord(state.enabled), grants, settings }
}

export function migrateGitSettings(persisted: unknown) {
  const state = record(persisted)
  const candidate = state.bridgeUrl ?? state.url
  return { bridgeUrl: typeof candidate === 'string' && candidate.trim() ? candidate.trim() : 'http://127.0.0.1:4318' }
}
