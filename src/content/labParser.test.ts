import { describe, expect, it } from 'vitest'
import { extractLabs } from './labParser'

describe('extractLabs', () => {
  it('groups cells, sorts them and emits one card placeholder', () => {
    const markdown = [
      'before',
      '```python exec lab="attention" cell="2" title="Second"',
      'print(2)',
      '```',
      'middle',
      '```python exec lab="attention" cell="1" title="First"',
      'print(1)',
      '```',
      'after',
    ].join('\n')

    const result = extractLabs(markdown)

    expect(result.labs).toHaveLength(1)
    expect(result.labs[0].cells.map((cell) => cell.order)).toEqual([1, 2])
    expect(result.labs[0].cells[0].title).toBe('First')
    expect(result.renderedContent.match(/```tensornote-lab/g)).toHaveLength(1)
    expect(result.renderedContent).not.toContain('print(1)')
  })
})
