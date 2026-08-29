import { parseDocument, searchDocuments, slugify } from './document'

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

export function searchNotes(query: string) {
  return searchDocuments(notes, query)
}

export { slugify }
