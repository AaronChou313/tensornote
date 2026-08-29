import matter from 'gray-matter'
import { Buffer } from 'buffer'
import type { Heading, Note, NoteFrontmatter } from '../types'
import { extractLabs } from './labParser'

if (!globalThis.Buffer) globalThis.Buffer = Buffer

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s/]+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
}

function getHeadings(content: string): Heading[] {
  return [...content.matchAll(/^(#{1,3})\s+(.+)$/gm)].map((match) => ({
    depth: match[1].length,
    text: match[2].trim(),
    id: slugify(match[2]),
  }))
}

function normalizeFrontmatter(data: Record<string, unknown>, path: string): NoteFrontmatter {
  const fallbackId = path.split('/').pop()?.replace(/\.md$/, '') ?? 'note'
  return {
    id: String(data.id ?? fallbackId),
    title: String(data.title ?? fallbackId),
    section: String(data.section ?? '未分类'),
    order: Number(data.order ?? 0),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    prerequisites: Array.isArray(data.prerequisites) ? data.prerequisites.map(String) : [],
    summary: data.summary ? String(data.summary) : undefined,
  }
}

export function parseDocument(path: string, raw: string, source?: { modifiedAt?: number; size?: number }): Note {
  const parsed = matter(raw)
  const frontmatter = normalizeFrontmatter(parsed.data, path)
  const { labs, renderedContent } = extractLabs(parsed.content)
  const headings = getHeadings(parsed.content)
  const directory = path.split('/').slice(0, -1).join('/')

  return {
    id: frontmatter.id,
    path,
    directory,
    frontmatter,
    raw,
    content: parsed.content,
    renderedContent,
    labs,
    headings,
    searchText: [
      frontmatter.title,
      frontmatter.section,
      ...frontmatter.tags,
      ...headings.map((heading) => heading.text),
      parsed.content.replace(/[`#>*_[\]()]/g, ' '),
    ]
      .join(' ')
      .toLocaleLowerCase(),
    sourceModifiedAt: source?.modifiedAt,
    sourceSize: source?.size,
  }
}

export function searchDocuments(documents: Note[], query: string) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
  if (!terms.length) return []
  return documents
    .filter((note) => terms.every((term) => note.searchText.includes(term)))
    .sort((a, b) => {
      const aTitle = a.frontmatter.title.toLocaleLowerCase()
      const bTitle = b.frontmatter.title.toLocaleLowerCase()
      return Number(bTitle.includes(terms[0])) - Number(aTitle.includes(terms[0]))
    })
}

export interface DocumentProperties {
  title: string
  section: string
  tags: string[]
  summary: string
}

export function getDocumentProperties(raw: string): DocumentProperties {
  const data = matter(raw).data
  return {
    title: String(data.title ?? ''),
    section: String(data.section ?? ''),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    summary: String(data.summary ?? ''),
  }
}

export function updateDocumentProperties(raw: string, properties: DocumentProperties) {
  const parsed = matter(raw)
  const data = {
    ...parsed.data,
    title: properties.title.trim(),
    section: properties.section.trim(),
    tags: properties.tags.map((tag) => tag.trim()).filter(Boolean),
    ...(properties.summary.trim() ? { summary: properties.summary.trim() } : {}),
  }
  if (!properties.summary.trim()) delete data.summary
  return matter.stringify(parsed.content.replace(/^\n/, ''), data)
}

export function createDocumentTemplate(id: string, title: string, section = 'Notes') {
  return matter.stringify(`# ${title}\n\n开始记录。\n`, {
    id,
    title,
    section,
    order: 0,
    tags: [],
    prerequisites: [],
    summary: '',
  })
}

export function duplicateDocument(raw: string, id: string, title: string) {
  const parsed = matter(raw)
  return matter.stringify(parsed.content.replace(/^\n/, ''), { ...parsed.data, id, title })
}
