import { describe, expect, it } from 'vitest'
import { buildNoteTree } from './noteTree'
import { parseDocument } from './document'

describe('buildNoteTree', () => {
  it('keeps empty workspace folders visible for authoring', () => {
    const tree = buildNoteTree([], 'notes', ['notes', 'notes/drafts', 'assets'])

    expect(tree).toEqual([{ label: 'drafts', kind: 'directory', path: 'drafts' }])
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

  it('keeps physical folder names and sorts folders and files by their filesystem names', () => {
    const notes = [
      parseDocument('docs/chapter10/10-note.md', '---\ntitle: First by title\nsection: 第一部分 / 理论基础\n---\n'),
      parseDocument('docs/chapter2/10-note.md', '---\ntitle: A title\nsection: 第一部分 / 理论基础\n---\n'),
      parseDocument('docs/chapter2/2-note.md', '---\ntitle: Z title\nsection: 第一部分 / 理论基础\n---\n'),
      parseDocument('docs/chapter2/overview.md', '---\ntitle: Chapter overview\n---\n'),
    ]
    const tree = buildNoteTree(notes, 'docs', ['docs/chapter10', 'docs/chapter2'])

    expect(tree.map((item) => [item.label, item.path])).toEqual([
      ['chapter2', 'chapter2'],
      ['chapter10', 'chapter10'],
    ])
    expect(tree[0].children?.map((item) => item.path)).toEqual([
      'chapter2/2-note.md',
      'chapter2/10-note.md',
      'chapter2/overview.md',
    ])
    expect(tree[0].noteId).toBeUndefined()
  })
})
