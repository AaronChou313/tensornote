import { describe, expect, it } from 'vitest'
import { buildKnowledgeIndex } from '../content/knowledgeIndex'
import { buildNoteTree } from '../content/noteTree'
import { parseDocument } from '../content/document'
import { buildPropertyIndex } from '../content/propertyIndex'

function createDocuments(count: number) {
  return Array.from({ length: count }, (_, index) => parseDocument(`notes/group-${index % 100}/note-${index}.md`, `---
id: note-${index}
title: Note ${index}
section: Group ${index % 100}
tags: [tag-${index % 50}]
status: ${index % 2 ? 'draft' : 'ready'}
---
# Note ${index}

Links to [[note-${(index + 1) % count}]]. Search token-${index % 25}.
`))
}

describe('large workspace performance budgets', () => {
  it('indexes 1,000 representative notes within the interactive budget', { timeout: 30_000 }, () => {
    const documents = createDocuments(1_000)
    const started = performance.now()
    const knowledge = buildKnowledgeIndex(documents)
    const properties = buildPropertyIndex(documents)
    const tree = buildNoteTree(documents, 'notes')
    const duration = performance.now() - started

    expect(knowledge.documents).toHaveLength(1_000)
    expect(properties.rows).toHaveLength(1_000)
    expect(tree.length).toBeGreaterThan(0)
    expect(duration).toBeLessThan(5_000)
  })

  it('keeps 10,000-note indexing bounded for a background workspace load', { timeout: 30_000 }, () => {
    const documents = createDocuments(10_000)
    const started = performance.now()
    const knowledge = buildKnowledgeIndex(documents)
    const properties = buildPropertyIndex(documents)
    const tree = buildNoteTree(documents, 'notes')
    const duration = performance.now() - started

    expect(knowledge.links).toHaveLength(10_000)
    expect(properties.query('status = ready').rows).toHaveLength(5_000)
    expect(tree.length).toBe(100)
    expect(duration).toBeLessThan(15_000)
  })

  it('parses a multi-megabyte Markdown document without truncating content', { timeout: 10_000 }, () => {
    const paragraph = 'Large Markdown content with **formatting**, #tags, and [links](./other.md).\n'
    const source = `---\nid: large\ntitle: Large Markdown\n---\n# Large Markdown\n\n${paragraph.repeat(30_000)}`
    const started = performance.now()
    const document = parseDocument('notes/large.md', source)
    const duration = performance.now() - started

    expect(document.raw.length).toBeGreaterThan(2_000_000)
    expect(document.content.endsWith(paragraph)).toBe(true)
    expect(duration).toBeLessThan(5_000)
  })
})
