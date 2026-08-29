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

export function parseDocument(path: string, raw: string): Note {
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
