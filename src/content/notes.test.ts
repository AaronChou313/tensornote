import { describe, expect, it } from 'vitest'
import { noteById, notes, searchNotes } from './notes'

describe('knowledge base', () => {
  it('loads every planned V1 note with unique ids', () => {
    expect(notes).toHaveLength(35)
    expect(new Set(notes.map((note) => note.id)).size).toBe(notes.length)
    expect(notes.every((note) => note.content.trim().length > 200)).toBe(true)
  })

  it('contains the seven-cell Self-Attention acceptance lab', () => {
    const note = noteById.get('self-attention')
    expect(note).toBeDefined()
    expect(note?.labs[0].cells).toHaveLength(7)
    expect(note?.labs[0].cells.at(-1)?.title).toContain('Heatmap')
  })

  it('searches title, tags and body text', () => {
    const results = searchNotes('QKV')
    expect(results.map((note) => note.id)).toContain('self-attention')
    expect(results.map((note) => note.id)).toContain('multi-head-attention')
  })
})
