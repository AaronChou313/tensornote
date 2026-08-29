import { parseDocument, slugify } from './document'
import { buildKnowledgeIndex } from './knowledgeIndex'

const modules = import.meta.glob('../../notes/**/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

/**
 * Compatibility exports for tests and callers that still need the bundled
 * learning notes. Runtime workspaces use WorkspaceProvider instead.
 */
export const notes = Object.entries(modules)
  .map(([modulePath, raw]) => {
    const workspacePath = modulePath.replace(/^\.\.\/\.\.\//, '')
    return parseDocument(workspacePath, raw)
  })
  .sort((a, b) => a.path.localeCompare(b.path, 'zh-CN'))

export const noteById = new Map(notes.map((note) => [note.id, note]))
const bundledKnowledgeIndex = buildKnowledgeIndex(notes)

export function searchNotes(query: string) {
  return bundledKnowledgeIndex.search(query).map((result) => result.note)
}

export { slugify }
