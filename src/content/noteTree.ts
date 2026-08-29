import type { Note } from '../types'
import { basename, normalizeWorkspacePath } from '../workspace/path'

export interface NoteTreeItem {
  label: string
  noteId?: string
  path?: string
  children?: NoteTreeItem[]
}

interface MutableTreeItem extends NoteTreeItem {
  children: MutableTreeItem[]
}

function fallbackLabel(value: string) {
  return value
    .replace(/^\d+[-_. ]*/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function buildNoteTree(documents: Note[], contentRoot: string, directoryPaths: string[] = []): NoteTreeItem[] {
  const root: MutableTreeItem = { label: 'Workspace', children: [] }
  const folders = new Map<string, MutableTreeItem>([['', root]])
  const normalizedRoot = normalizeWorkspacePath(contentRoot)

  const ensureFolder = (segments: string[]) => {
    let parentPath = ''
    let parent = root
    for (const segment of segments) {
      const folderPath = parentPath ? `${parentPath}/${segment}` : segment
      let folder = folders.get(folderPath)
      if (!folder) {
        folder = { label: fallbackLabel(segment), path: folderPath, children: [] }
        folders.set(folderPath, folder)
        parent.children.push(folder)
      }
      parent = folder
      parentPath = folderPath
    }
    return parent
  }

  for (const directoryPath of directoryPaths.sort((a, b) => a.localeCompare(b))) {
    const normalized = normalizeWorkspacePath(directoryPath)
    if (!normalized || normalized === normalizedRoot) continue
    if (normalizedRoot && !normalized.startsWith(`${normalizedRoot}/`)) continue
    const relative = normalizedRoot ? normalized.slice(normalizedRoot.length + 1) : normalized
    ensureFolder(relative.split('/').filter(Boolean))
  }

  for (const note of documents) {
    const relativePath = normalizedRoot && note.path.startsWith(`${normalizedRoot}/`)
      ? note.path.slice(normalizedRoot.length + 1)
      : note.path
    const segments = relativePath.split('/')
    const fileName = segments.pop() ?? basename(note.path)
    const parent = ensureFolder(segments)

    if (/^(?:\d+[-_. ]*)?overview\.md$/i.test(fileName) && parent !== root) {
      parent.noteId = note.id
      parent.label = note.frontmatter.title
      continue
    }

    if (parent !== root && parent.label === fallbackLabel(segments.at(-1) ?? '')) {
      const sectionLabel = note.frontmatter.section.split('/').map((part) => part.trim()).filter(Boolean).at(-1)
      if (sectionLabel) parent.label = sectionLabel
    }

    parent.children.push({
      label: note.frontmatter.title || fallbackLabel(fileName.replace(/\.md$/i, '')),
      noteId: note.id,
      path: relativePath,
      children: [],
    })
  }

  const stripEmptyChildren = (items: MutableTreeItem[]): NoteTreeItem[] => items.map((item) => ({
    label: item.label,
    ...(item.noteId ? { noteId: item.noteId } : {}),
    ...(item.path ? { path: item.path } : {}),
    ...(item.children.length ? { children: stripEmptyChildren(item.children) } : {}),
  }))

  return stripEmptyChildren(root.children)
}

export function findTrail(noteId: string, items: NoteTreeItem[], trail: string[] = []): string[] {
  for (const item of items) {
    const nextTrail = [...trail, item.label]
    if (item.noteId === noteId) return nextTrail
    if (item.children) {
      const found = findTrail(noteId, item.children, nextTrail)
      if (found.length) return found
    }
  }
  return []
}
