import { describe, expect, it } from 'vitest'
import { transformEditorCommand } from './editor'

describe('editor command transforms', () => {
  it('toggles bold around the selection', () => {
    const first = transformEditorCommand('editor.bold', 'hello world', { from: 0, to: 5 })
    expect(first.value).toBe('**hello** world')
    expect(transformEditorCommand('editor.bold', first.value, first.selection).value).toBe('hello world')
  })
  it('applies heading prefixes to each selected line', () => expect(transformEditorCommand('editor.heading2', 'one\ntwo', { from: 0, to: 7 }).value).toBe('## one\n## two'))
  it('keeps selected content inside code fences', () => expect(transformEditorCommand('editor.codeFence', 'sum(x)', { from: 0, to: 6 }).value).toContain('sum(x)'))
  it('preserves indentation while transforming multiple lines', () => {
    expect(transformEditorCommand('editor.blockquote', '  one\n    two', { from: 0, to: 13 }).value).toBe('  > one\n    > two')
    expect(transformEditorCommand('editor.heading3', '  one\n    two', { from: 0, to: 13 }).value).toBe('  ### one\n    ### two')
    expect(transformEditorCommand('editor.taskList', '  one\n    two', { from: 0, to: 13 }).value).toBe('  - [ ] one\n    - [ ] two')
  })
  it('wraps a multi-line callout and supports an explicit fence language', () => {
    const callout = transformEditorCommand('editor.callout', 'one\ntwo', { from: 0, to: 7 })
    expect(callout.value).toBe('> [!NOTE]\n> one\n> two')
    expect(transformEditorCommand('editor.callout', callout.value, { from: 0, to: callout.value.length }).value).toBe('one\ntwo')
    expect(transformEditorCommand('editor.codeFence', 'x', { from: 0, to: 1 }, { codeLanguage: 'typescript' }).value).toContain('```typescript')
  })
})
