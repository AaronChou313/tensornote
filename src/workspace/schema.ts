import { parse } from 'yaml'
import type { WorkspaceCompatibility, WorkspaceManifest } from './types'
import { normalizeWorkspacePath } from './path'

export const CURRENT_WORKSPACE_SCHEMA_VERSION = 1

const defaultManifest: WorkspaceManifest = {
  schemaVersion: CURRENT_WORKSPACE_SCHEMA_VERSION,
  workspace: { name: 'Markdown Workspace' },
  content: { root: 'notes' },
  assets: { root: 'assets' },
  navigation: { mode: 'filesystem' },
  features: { executable: false },
  environment: { files: [] },
  publishing: {},
  extensions: {},
}

export interface WorkspaceManifestResult {
  manifest: WorkspaceManifest
  compatibility: WorkspaceCompatibility
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

export function parseWorkspaceManifestWithCompatibility(source?: string, fallbackName?: string): WorkspaceManifestResult {
  if (!source?.trim()) {
    return { manifest: {
      ...defaultManifest,
      workspace: { ...defaultManifest.workspace, name: fallbackName || defaultManifest.workspace.name },
    }, compatibility: {
      sourceVersion: CURRENT_WORKSPACE_SCHEMA_VERSION,
      targetVersion: CURRENT_WORKSPACE_SCHEMA_VERSION,
      status: 'supported',
      readOnly: false,
      warnings: [],
    } }
  }

  const parsed = objectValue(parse(source))
  const workspace = objectValue(parsed.workspace)
  const content = objectValue(parsed.content)
  const assets = objectValue(parsed.assets)
  const navigation = objectValue(parsed.navigation)
  const features = objectValue(parsed.features)
  const environment = objectValue(parsed.environment)
  const publishing = objectValue(parsed.publishing)
  const declaredSchemaVersion = parsed.schemaVersion
  const sourceVersion = declaredSchemaVersion === undefined ? 0 : Number(declaredSchemaVersion)

  if (!Number.isInteger(sourceVersion) || sourceVersion < 0 || declaredSchemaVersion !== undefined && sourceVersion < 1) {
    throw new Error('tensornote.yaml 的 schemaVersion 必须是正整数')
  }

  const futureSchema = sourceVersion > CURRENT_WORKSPACE_SCHEMA_VERSION
  const legacySchema = sourceVersion < CURRENT_WORKSPACE_SCHEMA_VERSION
  const warnings = futureSchema
    ? [`Workspace 使用较新的 Schema v${sourceVersion}；TensorNote 将按 v${CURRENT_WORKSPACE_SCHEMA_VERSION} 读取已知字段，并禁用写入与执行。`]
    : legacySchema
      ? [`未声明 Workspace Schema；已在内存中迁移到 v${CURRENT_WORKSPACE_SCHEMA_VERSION}，原文件不会被自动改写。`]
      : []

  return { manifest: {
    schemaVersion: CURRENT_WORKSPACE_SCHEMA_VERSION,
    workspace: {
      name: String(workspace.name ?? fallbackName ?? defaultManifest.workspace.name),
      description: workspace.description ? String(workspace.description) : undefined,
    },
    content: { root: normalizeWorkspacePath(String(content.root ?? defaultManifest.content.root)) },
    assets: { root: normalizeWorkspacePath(String(assets.root ?? defaultManifest.assets.root)) },
    navigation: { mode: navigation.mode === 'filesystem' ? 'filesystem' : 'filesystem' },
    features: { executable: !futureSchema && features.executable === true },
    environment: {
      files: Array.isArray(environment.files)
        ? environment.files.map(String).map(normalizeWorkspacePath).filter(Boolean)
        : [],
    },
    publishing: {
      ...(publishing.title ? { title: String(publishing.title) } : {}),
      ...(publishing.description ? { description: String(publishing.description) } : {}),
      ...(typeof publishing.logo === 'string' && !/^[/\\]/.test(publishing.logo) && !publishing.logo.split(/[\\/]+/).includes('..')
        ? { logo: normalizeWorkspacePath(publishing.logo) }
        : {}),
      ...(typeof publishing.accent === 'string' && /^#[0-9a-f]{6}$/i.test(publishing.accent)
        ? { accent: publishing.accent.toLowerCase() }
        : {}),
      ...(publishing.defaultNote ? { defaultNote: String(publishing.defaultNote) } : {}),
    },
    extensions: objectValue(parsed.extensions),
  }, compatibility: {
    sourceVersion,
    targetVersion: CURRENT_WORKSPACE_SCHEMA_VERSION,
    status: futureSchema ? 'future' : legacySchema ? 'migrated' : 'supported',
    readOnly: futureSchema,
    warnings,
  } }
}

export function parseWorkspaceManifest(source?: string, fallbackName?: string): WorkspaceManifest {
  return parseWorkspaceManifestWithCompatibility(source, fallbackName).manifest
}
