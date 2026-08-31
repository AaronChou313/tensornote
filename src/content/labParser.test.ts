import { describe, expect, it } from 'vitest'
import { createExecutableLabMarkdown, extractLabs, insertScratchLab, updateLabCells } from './labParser'

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

describe('updateLabCells', () => {
  it('writes edited Python back to the matching executable fence only', () => {
    const source = '```python exec lab="demo" cell="1" title="One"\nprint(1)\n```\n\n```python exec lab="other" cell="1"\nprint(2)\n```'
    const updated = updateLabCells(source, 'demo', { 'demo-1': 'value = 3\nprint(value)' })

    expect(updated).toContain('value = 3\nprint(value)')
    expect(updated).toContain('lab="other" cell="1"\nprint(2)')
  })
})

describe('insertScratchLab', () => {
  it('appends portable executable fences that are parsed as a regular Lab', () => {
    const updated = insertScratchLab('# Note\n', 'scratch-demo', [
      { title: 'Prepare', code: 'value = 3' },
      { title: 'Empty draft', code: '   ' },
      { title: 'Inspect', code: 'print(value)' },
    ])
    const parsed = extractLabs(updated)

    expect(parsed.labs.find((lab) => lab.id === 'scratch-demo')?.cells).toHaveLength(2)
    expect(updated).toContain('cell="2" title="Inspect"')
  })

  it('refuses code containing a Markdown fence', () => {
    expect(() => insertScratchLab('# Note', 'scratch', [{ title: 'Unsafe', code: '```' }])).toThrow('Fence')
  })
})

describe('createExecutableLabMarkdown', () => {
  it('builds an approachable multi-cell executable lab template', () => {
    const markdown = createExecutableLabMarkdown({
      id: 'loss curves!',
      difficulty: 'medium',
      cells: [{ title: 'Prepare data', code: 'x = 1' }, { title: 'Plot', code: '' }],
    })

    expect(markdown).toContain('lab="loss-curves" cell="1" title="Prepare data" difficulty="medium"')
    expect(markdown).toContain('lab="loss-curves" cell="2" title="Plot" difficulty="medium"')
    expect(markdown).toContain('# 在这里编写 Python 代码')
  })
})
