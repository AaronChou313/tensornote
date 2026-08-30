import { buildNoteTree } from '../content/noteTree'
import { parseDocument } from '../content/document'
import { buildKnowledgeIndex } from '../content/knowledgeIndex'
import { buildPropertyIndex } from '../content/propertyIndex'
import { joinWorkspacePath, normalizeWorkspacePath } from './path'
import { parseWorkspaceManifestWithCompatibility } from './schema'
import type { WorkspaceEntry, WorkspaceProvider, WorkspaceSession } from './types'
import { mapConcurrent } from './concurrency'

const conventionalEnvironmentFiles = ['requirements.txt', 'pyproject.toml', 'environment.yml', 'environment.yaml']

function environmentKind(path: string) {
  const name = path.split('/').pop()?.toLocaleLowerCase()
  if (name?.startsWith('requirements') && name.endsWith('.txt')) return 'requirements' as const
  if (name === 'pyproject.toml') return 'pyproject' as const
  if (name === 'environment.yml' || name === 'environment.yaml') return 'conda' as const
  return 'unknown' as const
}

export function detectEnvironmentFiles(entries: WorkspaceEntry[], declaredFiles: string[]) {
  const files = new Set(entries.filter((entry) => entry.kind === 'file').map((entry) => normalizeWorkspacePath(entry.path)))
  const paths = new Set([
    ...declaredFiles.map(normalizeWorkspacePath),
    ...conventionalEnvironmentFiles.filter((path) => files.has(path)),
  ])
  return [...paths].map((path) => ({
    path,
    kind: environmentKind(path),
    exists: files.has(path),
    declared: declaredFiles.some((declared) => normalizeWorkspacePath(declared) === path),
  }))
}

async function collectEntries(provider: WorkspaceProvider, path = ''): Promise<WorkspaceEntry[]> {
  const direct = await provider.list(path)
  const nested = await mapConcurrent(direct.filter((entry) => entry.kind === 'directory'), 8, (entry) => collectEntries(provider, entry.path))
  return [...direct, ...nested.flat()]
}

const documentCache = new WeakMap<WorkspaceProvider, Map<string, { fingerprint: string; document: ReturnType<typeof parseDocument> }>>()

async function loadDocument(provider: WorkspaceProvider, entry: WorkspaceEntry) {
  const stat = await provider.stat(entry.path)
  const fingerprint = `${provider.descriptor.revision ?? ''}:${stat.modifiedAt ?? ''}:${stat.size ?? ''}`
  const cacheable = provider.type === 'bundled' || Boolean(provider.descriptor.revision) || stat.modifiedAt !== undefined || stat.size !== undefined
  const cache = documentCache.get(provider) ?? new Map()
  documentCache.set(provider, cache)
  const cached = cacheable ? cache.get(entry.path) : undefined
  if (cached?.fingerprint === fingerprint) return cached.document
  const document = parseDocument(entry.path, await provider.readText(entry.path), stat)
  if (cacheable) cache.set(entry.path, { fingerprint, document })
  return document
}

export async function loadWorkspace(provider: WorkspaceProvider, trustedRevisions: string[]): Promise<WorkspaceSession> {
  await provider.open()
  const rootEntries = await provider.list('')
  const hasManifest = rootEntries.some((entry) => entry.kind === 'file' && entry.name === 'tensornote.yaml')
  const manifestSource = hasManifest ? await provider.readText('tensornote.yaml') : undefined
  const { manifest, compatibility } = parseWorkspaceManifestWithCompatibility(manifestSource, provider.descriptor.name)
  const allEntries = await collectEntries(provider)

  if (!hasManifest && !allEntries.some((entry) => entry.kind === 'directory' && entry.path === manifest.content.root)) {
    manifest.content.root = ''
  }

  const contentRoot = normalizeWorkspacePath(manifest.content.root)
  const markdownEntries = allEntries.filter((entry) => {
    if (entry.kind !== 'file' || !entry.path.toLowerCase().endsWith('.md')) return false
    return !contentRoot || entry.path.startsWith(`${contentRoot}/`) || entry.path === contentRoot
  })
  const documents = (await mapConcurrent(markdownEntries, 16, (entry) => loadDocument(provider, entry)))
    .sort((a, b) => a.path.localeCompare(b.path, 'zh-CN'))
  const activePaths = new Set(markdownEntries.map((entry) => entry.path))
  const cache = documentCache.get(provider)
  if (cache) for (const path of cache.keys()) if (!activePaths.has(path)) cache.delete(path)

  const documentById = new Map<string, (typeof documents)[number]>()
  for (const document of documents) {
    if (documentById.has(document.id)) {
      await provider.close()
      throw new Error(`Workspace 中存在重复的文档 id: ${document.id}`)
    }
    documentById.set(document.id, document)
  }

  const descriptor = {
    ...provider.descriptor,
    name: manifest.workspace.name || provider.descriptor.name,
  }
  const trusted = descriptor.type !== 'github'
    || Boolean(descriptor.trustKey && trustedRevisions.includes(descriptor.trustKey))

  return {
    descriptor,
    capabilities: compatibility.readOnly
      ? { ...provider.capabilities, write: false, git: false }
      : provider.capabilities,
    manifest,
    compatibility,
    documents,
    documentById,
    knowledgeIndex: buildKnowledgeIndex(documents),
    propertyIndex: buildPropertyIndex(documents),
    environmentFiles: detectEnvironmentFiles(allEntries, manifest.environment.files),
    navigation: buildNoteTree(
      documents,
      contentRoot,
      allEntries.filter((entry) => entry.kind === 'directory').map((entry) => entry.path),
    ),
    trusted,
    openedAt: Date.now(),
  }
}

export function workspaceDocumentPath(root: string, relative: string) {
  return joinWorkspacePath(root, relative)
}
