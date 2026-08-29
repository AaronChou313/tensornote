import { describe, expect, it } from 'vitest'
import { createDocumentTemplate, duplicateDocument, getDocumentProperties, parseDocument, updateDocumentProperties } from './document'

describe('document authoring helpers', () => {
  it('updates editable properties while preserving unknown frontmatter', () => {
    const source = '---\nid: demo\ntitle: Old\ncustom: keep-me\n---\n# Body\n'
    const updated = updateDocumentProperties(source, {
      title: 'New title',
      section: 'Research',
      tags: ['one', 'two'],
      summary: 'A summary',
    })

    expect(getDocumentProperties(updated)).toEqual({ title: 'New title', section: 'Research', tags: ['one', 'two'], summary: 'A summary' })
    expect(updated).toContain('custom: keep-me')
    expect(updated).toContain('# Body')
  })

  it('creates and duplicates portable Markdown documents with unique IDs', () => {
    const created = createDocumentTemplate('daily-note', 'Daily note')
    const copied = duplicateDocument(created, 'daily-note-copy', 'Daily note Copy')

    expect(parseDocument('notes/daily.md', created).id).toBe('daily-note')
    expect(parseDocument('notes/daily-copy.md', copied).id).toBe('daily-note-copy')
  })
})
