import { parse } from 'yaml'
import type { WorkspaceManifest } from './types'
import { normalizeWorkspacePath } from './path'

const defaultManifest: WorkspaceManifest = {
  schemaVersion: 1,
  workspace: { name: 'Markdown Workspace' },
  content: { root: 'notes' },
  assets: { root: 'assets' },
  navigation: { mode: 'filesystem' },
  features: { executable: false },
  extensions: {},
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

export function parseWorkspaceManifest(source?: string, fallbackName?: string): WorkspaceManifest {
  if (!source?.trim()) {
    return {
      ...defaultManifest,
      workspace: { ...defaultManifest.workspace, name: fallbackName || defaultManifest.workspace.name },
    }
  }

  const parsed = objectValue(parse(source))
  const workspace = objectValue(parsed.workspace)
  const content = objectValue(parsed.content)
  const assets = objectValue(parsed.assets)
  const navigation = objectValue(parsed.navigation)
  const features = objectValue(parsed.features)
  const schemaVersion = Number(parsed.schemaVersion ?? 1)

  if (!Number.isInteger(schemaVersion) || schemaVersion < 1) {
    throw new Error('tensornote.yaml 的 schemaVersion 必须是正整数')
  }

  return {
    schemaVersion,
    workspace: {
      name: String(workspace.name ?? fallbackName ?? defaultManifest.workspace.name),
      description: workspace.description ? String(workspace.description) : undefined,
    },
    content: { root: normalizeWorkspacePath(String(content.root ?? defaultManifest.content.root)) },
    assets: { root: normalizeWorkspacePath(String(assets.root ?? defaultManifest.assets.root)) },
    navigation: { mode: navigation.mode === 'filesystem' ? 'filesystem' : 'filesystem' },
    features: { executable: features.executable === true },
    extensions: objectValue(parsed.extensions),
  }
}
