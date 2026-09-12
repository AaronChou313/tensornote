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
  const seen = new Map<string, number>()
  const source = content.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, (block) => block.replace(/[^\n]/g, ' '))
  return [...source.matchAll(/^(#{1,6})\s+(.+)$/gm)].map((match) => {
    const text = match[2].replace(/\s+#+\s*$/, '').trim()
    const baseId = slugify(text)
    const count = seen.get(baseId) ?? 0
    seen.set(baseId, count + 1)
    return {
      depth: match[1].length,
      text,
      id: count ? `${baseId}-${count}` : baseId,
    }
  })
}

function normalizeStringList(value: unknown) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean)
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean)
  return []
}

function extractInlineTags(content: string) {
  const withoutCode = content
    .replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, ' ')
    .replace(/`[^`\n]*`/g, ' ')
  return [...new Set(
    [...withoutCode.matchAll(/(?:^|[\s([{>])#([\p{L}\p{N}_/-]+)/gmu)]
      .map((match) => match[1].replace(/\/$/, ''))
      .filter(Boolean),
  )]
}

function normalizeFrontmatter(data: Record<string, unknown>, path: string): NoteFrontmatter {
  const fallbackId = path.split('/').pop()?.replace(/\.md$/, '') ?? 'note'
  return {
    id: String(data.id ?? fallbackId),
    title: String(data.title ?? fallbackId),
    aliases: normalizeStringList(data.aliases ?? data.alias),
    section: String(data.section ?? '未分类'),
    order: Number(data.order ?? 0),
    tags: normalizeStringList(data.tags).map((tag) => tag.replace(/^#/, '')),
    prerequisites: normalizeStringList(data.prerequisites),
    summary: data.summary ? String(data.summary) : undefined,
  }
}

export function parseDocument(path: string, raw: string, source?: { modifiedAt?: number; size?: number }): Note {
  const parsed = matter(raw)
  const frontmatter = normalizeFrontmatter(parsed.data, path)
  const { labs, renderedContent } = extractLabs(parsed.content)
  const headings = getHeadings(parsed.content)
  const inlineTags = extractInlineTags(parsed.content)
  const directory = path.split('/').slice(0, -1).join('/')

  return {
    id: frontmatter.id,
    path,
    directory,
    frontmatter,
    properties: parsed.data,
    inlineTags,
    raw,
    content: parsed.content,
    renderedContent,
    labs,
    headings,
    searchText: [
      frontmatter.title,
      frontmatter.section,
      ...frontmatter.aliases,
      ...frontmatter.tags,
      ...inlineTags,
      ...Object.entries(parsed.data).flatMap(([key, value]) => [key, String(value)]),
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
  aliases: string[]
  section: string
  tags: string[]
  summary: string
}

/** Returns the Markdown body that belongs in the normal editor, not its YAML. */
export function getDocumentBody(raw: string) {
  const match = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/)
  return match ? raw.slice(match[0].length) : raw
}

/** Replaces only the visible Markdown body while leaving the original YAML intact. */
export function replaceDocumentBody(raw: string, body: string) {
  const match = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/)
  return match ? `${match[0]}${body}` : body
}

export function getDocumentProperties(raw: string): DocumentProperties {
  const data = matter(raw).data
  return {
    title: String(data.title ?? ''),
    aliases: normalizeStringList(data.aliases ?? data.alias),
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
    aliases: properties.aliases.map((alias) => alias.trim()).filter(Boolean),
    section: properties.section.trim(),
    tags: properties.tags.map((tag) => tag.trim()).filter(Boolean),
    ...(properties.summary.trim() ? { summary: properties.summary.trim() } : {}),
  }
  delete (data as Record<string, unknown>).alias
  if (!properties.summary.trim()) delete data.summary
  return matter.stringify(parsed.content.replace(/^\n/, ''), data)
}

export function createDocumentTemplate(id: string, title: string, section = 'Notes') {
  return matter.stringify(`# ${title}\n\n开始记录。\n`, {
    id,
    title,
    aliases: [],
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
