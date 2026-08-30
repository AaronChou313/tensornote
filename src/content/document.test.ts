import { describe, expect, it } from 'vitest'
import { createDocumentTemplate, duplicateDocument, getDocumentBody, getDocumentProperties, parseDocument, replaceDocumentBody, updateDocumentProperties } from './document'

describe('document authoring helpers', () => {
  it('updates editable properties while preserving unknown frontmatter', () => {
    const source = '---\nid: demo\ntitle: Old\ncustom: keep-me\n---\n# Body\n'
    const updated = updateDocumentProperties(source, {
      title: 'New title',
      aliases: ['New', 'Demo'],
      section: 'Research',
      tags: ['one', 'two'],
      summary: 'A summary',
    })

    expect(getDocumentProperties(updated)).toEqual({ title: 'New title', aliases: ['New', 'Demo'], section: 'Research', tags: ['one', 'two'], summary: 'A summary' })
    expect(updated).toContain('custom: keep-me')
    expect(updated).toContain('# Body')
  })

  it('creates and duplicates portable Markdown documents with unique IDs', () => {
    const created = createDocumentTemplate('daily-note', 'Daily note')
    const copied = duplicateDocument(created, 'daily-note-copy', 'Daily note Copy')

    expect(parseDocument('notes/daily.md', created).id).toBe('daily-note')
    expect(parseDocument('notes/daily-copy.md', copied).id).toBe('daily-note-copy')
  })

  it('keeps YAML out of the editable body and restores it unchanged around body edits', () => {
    const source = '---\nid: demo\ntitle: Old\ncustom:\n  owner: research\n---\n# Body\n'
    const body = getDocumentBody(source)

    expect(body).toBe('# Body\n')
    expect(replaceDocumentBody(source, '## Revised\n')).toBe('---\nid: demo\ntitle: Old\ncustom:\n  owner: research\n---\n## Revised\n')
  })
})
