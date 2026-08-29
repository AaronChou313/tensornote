import { describe, expect, it } from 'vitest'
import { buildNoteTree } from './noteTree'

describe('buildNoteTree', () => {
  it('keeps empty workspace folders visible for authoring', () => {
    const tree = buildNoteTree([], 'notes', ['notes', 'notes/drafts', 'assets'])

    expect(tree).toEqual([{ label: 'Drafts', path: 'drafts' }])
  })
})
