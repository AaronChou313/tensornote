import type { Heading, Note } from '../types'
import { basename, dirname, joinWorkspacePath, normalizeWorkspacePath } from '../workspace/path'
import { slugify } from './document'

export type KnowledgeLinkSyntax = 'wiki' | 'markdown' | 'embed'

export interface KnowledgeLink {
  sourceNoteId: string
  syntax: KnowledgeLinkSyntax
  rawTarget: string
  label: string
  targetNoteId?: string
  heading?: string
  blockId?: string
}

export interface KnowledgeSearchResult {
  note: Note
  score: number
  matches: string[]
  snippet: string
}

export interface KnowledgeTag {
  name: string
  documentIds: string[]
}

export interface LocalGraphNode {
  id: string
  label: string
  current: boolean
}

export interface LocalGraphEdge {
  source: string
  target: string
  kind: 'link' | 'tag'
}

export interface LocalGraph {
  nodes: LocalGraphNode[]
  edges: LocalGraphEdge[]
}

export interface ResolvedKnowledgeReference {
  note: Note
  heading?: Heading
  blockId?: string
}

export interface KnowledgeIndex {
  documents: Note[]
  links: KnowledgeLink[]
  linksBySource: Map<string, KnowledgeLink[]>
  backlinksByTarget: Map<string, KnowledgeLink[]>
  headingsByDocument: Map<string, Heading[]>
  tags: KnowledgeTag[]
  tagsByDocument: Map<string, string[]>
  propertiesByDocument: Map<string, Record<string, unknown>>
  unresolvedLinks: KnowledgeLink[]
  resolveReference: (reference: string, sourceNoteId?: string) => ResolvedKnowledgeReference | undefined
  resolveMarkdownHref: (href: string, sourceNoteId: string) => ResolvedKnowledgeReference | undefined
  search: (query: string) => KnowledgeSearchResult[]
  localGraph: (noteId: string) => LocalGraph
}

function normalizeLookup(value: string) {
  return decodeURIComponent(value)
    .trim()
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')
    .replace(/\.md$/i, '')
    .replace(/\\/g, '/')
    .toLocaleLowerCase()
}

function noteLookupKeys(note: Note) {
  const fileName = basename(note.path).replace(/\.md$/i, '')
  return new Set([
    note.id,
    note.frontmatter.title,
    ...note.frontmatter.aliases,
    note.path,
    note.path.replace(/\.md$/i, ''),
    fileName,
  ].map(normalizeLookup).filter(Boolean))
}

function splitReference(reference: string) {
  const decoded = decodeURIComponent(reference.trim())
  const hashIndex = decoded.indexOf('#')
  const target = hashIndex >= 0 ? decoded.slice(0, hashIndex) : decoded
  const fragment = hashIndex >= 0 ? decoded.slice(hashIndex + 1).trim() : ''
  return {
    target: target.trim(),
    heading: fragment && !fragment.startsWith('^') ? fragment : undefined,
    blockId: fragment.startsWith('^') ? fragment.slice(1) : undefined,
  }
}

function contentWithoutCode(content: string) {
  return content
    .replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, ' ')
    .replace(/`[^`\n]*`/g, ' ')
}

function extractRawLinks(note: Note) {
  const source = contentWithoutCode(note.content)
  const links: Array<Omit<KnowledgeLink, 'targetNoteId'>> = []
  const wikiPattern = /(!?)\[\[([^\]]+)]]/g
  for (const match of source.matchAll(wikiPattern)) {
    const [targetPart, labelPart] = match[2].split('|', 2)
    const { target, heading, blockId } = splitReference(targetPart)
    links.push({
      sourceNoteId: note.id,
      syntax: match[1] ? 'embed' : 'wiki',
      rawTarget: targetPart.trim(),
      label: labelPart?.trim() || heading || target || targetPart.trim(),
      heading,
      blockId,
    })
  }

  const markdownPattern = /(?<!!)\[([^\]]+)]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g
  for (const match of source.matchAll(markdownPattern)) {
    const href = match[2]
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href)) continue
    const { target, heading, blockId } = splitReference(href)
    if (target && !target.toLowerCase().endsWith('.md')) continue
    links.push({
      sourceNoteId: note.id,
      syntax: 'markdown',
      rawTarget: href,
      label: match[1].trim(),
      heading,
      blockId,
    })
  }
  return links
}

function plainText(content: string) {
  return content
    .replace(/!?(?:\[\[|\]\])/g, ' ')
    .replace(/[#>*_[\]()`~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function propertyText(properties: Record<string, unknown>) {
  const representedElsewhere = new Set(['title', 'aliases', 'alias', 'tags', 'summary'])
  return Object.entries(properties)
    .filter(([key]) => !representedElsewhere.has(key.toLocaleLowerCase()))
    .flatMap(([key, value]) => [key, Array.isArray(value) ? value.join(' ') : String(value ?? '')])
    .join(' ')
}

function searchSnippet(note: Note, terms: string[]) {
  const body = plainText(note.content)
  const lower = body.toLocaleLowerCase()
  const occurrences = terms.map((term) => lower.indexOf(term)).filter((value) => value >= 0)
  const index = occurrences.length ? Math.min(...occurrences) : 0
  const start = Math.max(0, index - 55)
  const snippet = body.slice(start, start + 150)
  return `${start ? '…' : ''}${snippet}${start + 150 < body.length ? '…' : ''}`
}

export function buildKnowledgeIndex(documents: Note[]): KnowledgeIndex {
  const noteById = new Map(documents.map((note) => [note.id, note]))
  const lookup = new Map<string, Note[]>()
  const pathLookup = new Map<string, Note>()
  for (const note of documents) {
    pathLookup.set(normalizeWorkspacePath(note.path).toLocaleLowerCase(), note)
    for (const key of noteLookupKeys(note)) lookup.set(key, [...(lookup.get(key) ?? []), note])
  }

  const resolveReference = (reference: string, sourceNoteId?: string): ResolvedKnowledgeReference | undefined => {
    const sourceNote = sourceNoteId ? noteById.get(sourceNoteId) : undefined
    const { target, heading, blockId } = splitReference(reference)
    let note: Note | undefined

    if (!target && sourceNote) note = sourceNote
    if (!note && sourceNote && (target.includes('/') || /\.md$/i.test(target))) {
      const relativePath = joinWorkspacePath(dirname(sourceNote.path), target)
      note = pathLookup.get(normalizeWorkspacePath(relativePath).toLocaleLowerCase())
    }
    if (!note && target) {
      const matches = lookup.get(normalizeLookup(target)) ?? []
      if (matches.length === 1) note = matches[0]
      else if (matches.length > 1) {
        note = matches.find((candidate) => candidate.id.toLocaleLowerCase() === target.toLocaleLowerCase())
      }
    }
    if (!note) return undefined

    const resolvedHeading = heading
      ? note.headings.find((item) => item.text.toLocaleLowerCase() === heading.toLocaleLowerCase() || item.id === slugify(heading))
      : undefined
    return { note, heading: resolvedHeading, blockId }
  }

  const resolveMarkdownHref = (href: string, sourceNoteId: string) => {
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href)) return undefined
    return resolveReference(href, sourceNoteId)
  }

  const links = documents.flatMap(extractRawLinks).map((link) => ({
    ...link,
    targetNoteId: resolveReference(link.rawTarget, link.sourceNoteId)?.note.id,
  }))
  const linksBySource = new Map<string, KnowledgeLink[]>()
  const backlinksByTarget = new Map<string, KnowledgeLink[]>()
  for (const link of links) {
    const outgoing = linksBySource.get(link.sourceNoteId) ?? []
    outgoing.push(link)
    linksBySource.set(link.sourceNoteId, outgoing)
    if (link.targetNoteId) {
      const incoming = backlinksByTarget.get(link.targetNoteId) ?? []
      incoming.push(link)
      backlinksByTarget.set(link.targetNoteId, incoming)
    }
  }

  const tagsByDocument = new Map<string, string[]>()
  const tagDocuments = new Map<string, Set<string>>()
  for (const note of documents) {
    const tags = [...new Set([...note.frontmatter.tags, ...note.inlineTags].map((tag) => tag.replace(/^#/, '').trim()).filter(Boolean))]
    tagsByDocument.set(note.id, tags)
    for (const tag of tags) {
      const key = tag.toLocaleLowerCase()
      const documentIds = tagDocuments.get(key) ?? new Set<string>()
      documentIds.add(note.id)
      tagDocuments.set(key, documentIds)
    }
  }
  const tags = [...tagDocuments.entries()]
    .map(([name, ids]) => ({ name, documentIds: [...ids] }))
    .sort((a, b) => b.documentIds.length - a.documentIds.length || a.name.localeCompare(b.name))

  const searchFields = new Map(documents.map((note) => [note.id, [
    { label: 'Title', value: note.frontmatter.title.toLocaleLowerCase(), weight: 12 },
    { label: 'Alias', value: note.frontmatter.aliases.join(' ').toLocaleLowerCase(), weight: 11 },
    { label: 'Tag', value: (tagsByDocument.get(note.id)?.join(' ') ?? '').toLocaleLowerCase(), weight: 9 },
    { label: 'Heading', value: note.headings.map((heading) => heading.text).join(' ').toLocaleLowerCase(), weight: 7 },
    { label: 'Path', value: note.path.toLocaleLowerCase(), weight: 6 },
    { label: 'Property', value: propertyText(note.properties).toLocaleLowerCase(), weight: 4 },
    { label: 'Body', value: plainText(note.content).toLocaleLowerCase(), weight: 1 },
  ]]))

  const search = (query: string): KnowledgeSearchResult[] => {
    const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
    if (!terms.length) return []
    return documents.flatMap((note) => {
      const fields = searchFields.get(note.id) ?? []
      const termScores = terms.map((term) => fields.reduce((score, field) => field.value.includes(term) ? score + field.weight : score, 0))
      if (termScores.some((score) => score === 0)) return []
      const matches = fields.filter((field) => terms.some((term) => field.value.includes(term))).map((field) => field.label)
      return [{ note, score: termScores.reduce((sum, value) => sum + value, 0), matches, snippet: searchSnippet(note, terms) }]
    }).sort((a, b) => b.score - a.score || a.note.frontmatter.title.localeCompare(b.note.frontmatter.title))
  }

  const localGraph = (noteId: string): LocalGraph => {
    const current = noteById.get(noteId)
    if (!current) return { nodes: [], edges: [] }
    const relatedIds = new Set<string>([noteId])
    const edges: LocalGraphEdge[] = []
    for (const link of linksBySource.get(noteId) ?? []) {
      if (!link.targetNoteId || link.targetNoteId === noteId) continue
      relatedIds.add(link.targetNoteId)
      edges.push({ source: noteId, target: link.targetNoteId, kind: 'link' })
    }
    for (const link of backlinksByTarget.get(noteId) ?? []) {
      if (link.sourceNoteId === noteId) continue
      relatedIds.add(link.sourceNoteId)
      edges.push({ source: link.sourceNoteId, target: noteId, kind: 'link' })
    }
    const currentTags = new Set(tagsByDocument.get(noteId) ?? [])
    for (const candidate of documents) {
      if (relatedIds.size >= 9) break
      if (candidate.id === noteId || relatedIds.has(candidate.id)) continue
      if ((tagsByDocument.get(candidate.id) ?? []).some((tag) => currentTags.has(tag))) {
        relatedIds.add(candidate.id)
        edges.push({ source: noteId, target: candidate.id, kind: 'tag' })
      }
    }
    return {
      nodes: [...relatedIds].flatMap((id) => {
        const note = noteById.get(id)
        return note ? [{ id, label: note.frontmatter.title, current: id === noteId }] : []
      }),
      edges: edges.filter((edge, index) => edges.findIndex((item) => item.source === edge.source && item.target === edge.target && item.kind === edge.kind) === index),
    }
  }

  return {
    documents,
    links,
    linksBySource,
    backlinksByTarget,
    headingsByDocument: new Map(documents.map((note) => [note.id, note.headings])),
    tags,
    tagsByDocument,
    propertiesByDocument: new Map(documents.map((note) => [note.id, note.properties])),
    unresolvedLinks: links.filter((link) => {
      const resolved = resolveReference(link.rawTarget, link.sourceNoteId)
      return !resolved || Boolean(link.heading && !resolved.heading)
    }),
    resolveReference,
    resolveMarkdownHref,
    search,
    localGraph,
  }
}

function replaceWikiLinks(line: string, index: KnowledgeIndex, sourceNoteId: string) {
  const parts = line.split(/(`[^`\n]*`)/g)
  return parts.map((part, partIndex) => {
    if (partIndex % 2) return part
    return part.replace(/\[\[([^\]]+)]]/g, (_match, body: string) => {
      const [target, label] = body.split('|', 2)
      const resolved = index.resolveReference(target, sourceNoteId)
      if (!resolved) return `\`[[${body}]]\``
      const fragment = resolved.heading ? `#${resolved.heading.id}` : ''
      return `[${label?.trim() || resolved.heading?.text || resolved.note.frontmatter.title}](/notes/${encodeURIComponent(resolved.note.id)}${fragment})`
    })
  }).join('')
}

export function transformWikiMarkdown(content: string, index: KnowledgeIndex, sourceNoteId: string) {
  let fence: string | null = null
  return content.split('\n').flatMap((line) => {
    const marker = line.match(/^\s*(```|~~~)/)?.[1]
    if (marker) {
      if (!fence) fence = marker
      else if (fence === marker) fence = null
      return [line]
    }
    if (fence) return [line]

    const embed = line.trim().match(/^!\[\[([^\]]+)]]$/)
    if (embed) {
      const resolved = index.resolveReference(embed[1], sourceNoteId)
      if (!resolved) return [`\`![[${embed[1]}]]\``]
      return ['```tensornote-embed', `${resolved.note.id}${resolved.heading ? `#${resolved.heading.id}` : ''}`, '```']
    }
    return [replaceWikiLinks(line, index, sourceNoteId)]
  }).join('\n')
}

export function extractHeadingSection(note: Note, headingId?: string) {
  if (!headingId) return note.renderedContent
  const lines = note.renderedContent.split('\n')
  const start = lines.findIndex((line) => {
    const match = line.match(/^(#{1,6})\s+(.+)$/)
    return Boolean(match && slugify(match[2].replace(/\s+#+\s*$/, '')) === headingId)
  })
  if (start < 0) return note.renderedContent
  const depth = lines[start].match(/^(#{1,6})/)?.[1].length ?? 6
  const endOffset = lines.slice(start + 1).findIndex((line) => {
    const match = line.match(/^(#{1,6})\s+/)
    return Boolean(match && match[1].length <= depth)
  })
  return lines.slice(start, endOffset < 0 ? undefined : start + 1 + endOffset).join('\n')
}
