import { describe, expect, it } from 'vitest'
import { buildNoteTree } from './noteTree'
import { parseDocument } from './document'

describe('buildNoteTree', () => {
  it('keeps empty workspace folders visible for authoring', () => {
    const tree = buildNoteTree([], 'notes', ['notes', 'notes/drafts', 'assets'])

    expect(tree).toEqual([{ label: 'Drafts', kind: 'directory', path: 'drafts' }])
  })
})

it('preserves Chinese filesystem labels and identifies attachment folders without inventing notes', () => {
  const notes = [parseDocument('课程/第一章-课程概述/讲义.md', '# 概述')]
  const tree = buildNoteTree(notes, '', ['课程', '课程/第一章-课程概述', '课程/第一章-课程概述/images'])
  const chapter = tree[0].children![0]
  expect(chapter.label).toBe('第一章-课程概述')
  expect(chapter.children!.find((item) => item.path?.endsWith('/images'))).toMatchObject({ kind: 'directory' })
  expect(chapter.children!.filter((item) => item.noteId)).toHaveLength(1)
  expect(JSON.stringify(tree)).not.toContain('未分类')
})
