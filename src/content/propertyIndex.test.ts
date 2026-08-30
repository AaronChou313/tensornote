import { describe, expect, it } from 'vitest'
import { parseDocument } from './document'
import { buildPropertyIndex } from './propertyIndex'

describe('PropertyIndex', () => {
  it('indexes frontmatter values and returns every row for an empty query', () => {
    const note = parseDocument('notes/paper.md', `---
id: paper
type: paper
status: reading
---
# Paper
`)
    const index = buildPropertyIndex([note])

    expect(index.rows).toEqual([{ note, values: note.properties }])
    expect(index.fields.find((field) => field.key === 'status')).toMatchObject({ type: 'string', documents: 1, values: ['reading'] })
    expect(index.query('')).toEqual({ rows: index.rows })
  })

  it('builds stable field summaries and treats property keys case-insensitively', () => {
    const paper = parseDocument('notes/paper.md', `---
id: paper
type: paper
status: reading
tags: [ml, ai, ml]
priority: 2
published: true
reviewer: null
---
# Paper
`)
    const book = parseDocument('notes/book.md', `---
id: book
type: book
STATUS: finished
tags: [ai, systems]
priority: 1
published: false
reviewer: Ada
---
# Book
`)
    const index = buildPropertyIndex([paper, book])

    expect(index.fields.find((field) => field.key === 'tags')).toMatchObject({
      type: 'array',
      documents: 2,
      values: ['ml', 'ai', 'systems'],
    })
    expect(index.fields.find((field) => field.key === 'status')).toMatchObject({
      type: 'string',
      documents: 2,
      values: ['reading', 'finished'],
    })
  })

  it('queries string, number, boolean, null and array values with AND', () => {
    const paper = parseDocument('notes/paper.md', `---
id: paper
type: paper
status: reading
tags: [ml, ai]
priority: 2
published: true
reviewer: null
---
# Paper
`)
    const book = parseDocument('notes/book.md', `---
id: book
type: book
status: finished
tags: [systems]
priority: 1
published: false
reviewer: Ada
---
# Book
`)
    const index = buildPropertyIndex([paper, book])
    const noteIds = (expression: string) => index.query(expression).rows.map((row) => row.note.id)

    expect(noteIds('TYPE = paper aNd status = reading')).toEqual(['paper'])
    expect(noteIds('priority = 2')).toEqual(['paper'])
    expect(noteIds('published = true')).toEqual(['paper'])
    expect(noteIds('reviewer = null')).toEqual(['paper'])
    expect(noteIds('tags = ai')).toEqual(['paper'])
    expect(noteIds('type != paper')).toEqual(['book'])
  })

  it('does not split quoted AND values and returns readable errors for invalid expressions', () => {
    const note = parseDocument('notes/and.md', `---
id: and
status: research AND reading
---
# And
`)
    const index = buildPropertyIndex([note])

    expect(index.query('status = "research AND reading"').rows.map((row) => row.note.id)).toEqual(['and'])
    expect(index.query('status = "查询格式无效：reading"').error).toBeUndefined()
    expect(index.query('status =').error).toMatch(/查询格式无效/)
    expect(index.query('status == reading').error).toMatch(/查询格式无效/)
    expect(index.query('status = "reading').error).toMatch(/查询格式无效/)
  })
})
