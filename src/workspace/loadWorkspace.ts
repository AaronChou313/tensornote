import { buildNoteTree } from '../content/noteTree'
import { parseDocument } from '../content/document'
import { buildKnowledgeIndex } from '../content/knowledgeIndex'
import { joinWorkspacePath, normalizeWorkspacePath } from './path'
import { parseWorkspaceManifest } from './schema'
import type { WorkspaceEntry, WorkspaceProvider, WorkspaceSession } from './types'

async function collectEntries(provider: WorkspaceProvider, path = ''): Promise<WorkspaceEntry[]> {
  const direct = await provider.list(path)
  const nested = await Promise.all(
    direct.filter((entry) => entry.kind === 'directory').map((entry) => collectEntries(provider, entry.path)),
  )
  return [...direct, ...nested.flat()]
}

export async function loadWorkspace(provider: WorkspaceProvider, trustedRevisions: string[]): Promise<WorkspaceSession> {
  await provider.open()
  const rootEntries = await provider.list('')
  const hasManifest = rootEntries.some((entry) => entry.kind === 'file' && entry.name === 'tensornote.yaml')
  const manifestSource = hasManifest ? await provider.readText('tensornote.yaml') : undefined
  const manifest = parseWorkspaceManifest(manifestSource, provider.descriptor.name)
  const allEntries = await collectEntries(provider)

  if (!hasManifest && !allEntries.some((entry) => entry.kind === 'directory' && entry.path === manifest.content.root)) {
    manifest.content.root = ''
  }

  const contentRoot = normalizeWorkspacePath(manifest.content.root)
  const markdownEntries = allEntries.filter((entry) => {
    if (entry.kind !== 'file' || !entry.path.toLowerCase().endsWith('.md')) return false
    return !contentRoot || entry.path.startsWith(`${contentRoot}/`) || entry.path === contentRoot
  })
  const documents = (await Promise.all(markdownEntries.map(async (entry) => {
    const [raw, stat] = await Promise.all([provider.readText(entry.path), provider.stat(entry.path)])
    return parseDocument(entry.path, raw, stat)
  }))).sort((a, b) => a.path.localeCompare(b.path, 'zh-CN'))

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
    capabilities: provider.capabilities,
    manifest,
    documents,
    documentById,
    knowledgeIndex: buildKnowledgeIndex(documents),
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
