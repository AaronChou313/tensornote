import { describe, expect, it } from 'vitest'
import { parseDocument } from './document'
import { buildKnowledgeIndex, extractHeadingSection, transformWikiMarkdown } from './knowledgeIndex'

const alpha = parseDocument('notes/alpha.md', `---
id: alpha
title: Alpha Note
aliases: [A Note, First]
tags: [core]
status: growing
---
# Alpha

Connects to [[Beta Note#Details|beta details]], ![[Beta Note]] and [Gamma](gamma.md#Part).

#inline-tag

\`[[Ignored Inline]]\`

\`\`\`md
[[Ignored Fence]]
# Fake heading
\`\`\`

[[Missing Note]]
[[Beta Note#Missing Heading]]
`)

const beta = parseDocument('notes/beta.md', `---
id: beta
title: Beta Note
aliases: Second
tags: [core, model]
---
# Beta

## Details

Useful details and a link to [[A Note]].

## Ending

Done.
`)

const gamma = parseDocument('notes/gamma.md', `---
id: gamma
title: Gamma
tags: [model]
---
# Gamma

## Part

Property search target.
`)

describe('KnowledgeIndex', () => {
  const index = buildKnowledgeIndex([alpha, beta, gamma])

  it('resolves titles, aliases, heading links and relative Markdown links', () => {
    expect(index.resolveReference('A Note')?.note.id).toBe('alpha')
    expect(index.resolveReference('Beta Note#Details', 'alpha')?.heading?.id).toBe('details')
    expect(index.resolveMarkdownHref('gamma.md#Part', 'alpha')?.note.id).toBe('gamma')
  })

  it('builds outgoing links, backlinks, tags and unresolved links from Markdown', () => {
    expect(index.linksBySource.get('alpha')?.map((link) => link.targetNoteId)).toEqual(expect.arrayContaining(['beta', 'gamma']))
    expect(index.backlinksByTarget.get('alpha')?.map((link) => link.sourceNoteId)).toContain('beta')
    expect(index.tagsByDocument.get('alpha')).toEqual(expect.arrayContaining(['core', 'inline-tag']))
    expect(index.unresolvedLinks.map((link) => link.rawTarget)).toContain('Missing Note')
    expect(index.unresolvedLinks.map((link) => link.rawTarget)).toContain('Beta Note#Missing Heading')
    expect(index.unresolvedLinks.map((link) => link.rawTarget)).not.toContain('Ignored Inline')
    expect(alpha.headings.map((heading) => heading.text)).not.toContain('Fake heading')
  })

  it('searches weighted title, alias, tag, property, heading and body fields', () => {
    expect(index.search('First')[0].note.id).toBe('alpha')
    expect(index.search('status growing')[0].note.id).toBe('alpha')
    expect(index.search('details')[0].note.id).toBe('beta')
    expect(index.search('model').map((result) => result.note.id)).toEqual(expect.arrayContaining(['beta', 'gamma']))
  })

  it('transforms wiki links and embeds while preserving code', () => {
    const transformed = transformWikiMarkdown('[[Beta Note#Details|Read]]\n\n![[Beta Note#Details]]\n\n`[[Beta Note]]`', index, 'alpha')
    expect(transformed).toContain('[Read](/notes/beta#details)')
    expect(transformed).toContain('```tensornote-embed\nbeta#details\n```')
    expect(transformed).toContain('`[[Beta Note]]`')
  })

  it('extracts a heading section and builds a one-hop local graph', () => {
    expect(extractHeadingSection(beta, 'details')).toContain('Useful details')
    expect(extractHeadingSection(beta, 'details')).not.toContain('Done.')
    const graph = index.localGraph('alpha')
    expect(graph.nodes.map((node) => node.id)).toEqual(expect.arrayContaining(['alpha', 'beta', 'gamma']))
    expect(graph.edges.some((edge) => edge.kind === 'link')).toBe(true)
  })
})
