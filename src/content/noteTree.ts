import type { Note } from '../types'
import { basename, normalizeWorkspacePath } from '../workspace/path'

export interface NoteTreeItem {
  label: string
  kind?: 'file' | 'directory'
  noteId?: string
  path?: string
  children?: NoteTreeItem[]
}

interface MutableTreeItem extends NoteTreeItem {
  children: MutableTreeItem[]
}

const fileNameCollator = new Intl.Collator('zh-CN', { numeric: true, sensitivity: 'base' })

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
        folder = { label: segment, kind: 'directory', path: folderPath, children: [] }
        folders.set(folderPath, folder)
        parent.children.push(folder)
      }
      parent = folder
      parentPath = folderPath
    }
    return parent
  }

  for (const directoryPath of [...directoryPaths].sort(fileNameCollator.compare)) {
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

    parent.children.push({
      label: note.frontmatter.title || fallbackLabel(fileName.replace(/\.md$/i, '')),
      kind: 'file',
      noteId: note.id,
      path: relativePath,
      children: [],
    })
  }

  const sortChildren = (item: MutableTreeItem) => {
    item.children.sort((left, right) => {
      const kindOrder = Number(left.kind !== 'directory') - Number(right.kind !== 'directory')
      if (kindOrder) return kindOrder
      return fileNameCollator.compare(basename(left.path ?? left.label), basename(right.path ?? right.label))
    })
    item.children.forEach(sortChildren)
  }
  sortChildren(root)

  const stripEmptyChildren = (items: MutableTreeItem[]): NoteTreeItem[] => items.map((item) => ({
    label: item.label,
    kind: item.kind,
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
