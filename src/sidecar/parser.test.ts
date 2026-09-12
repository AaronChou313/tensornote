import { describe, expect, it } from 'vitest'
import { createSidecarDirective, createUniqueSidecarId, deleteSidecarSource, parseSidecarDirectives, replaceSidecarSource } from './parser'

describe('Sidecar directive parser', () => {
  it('extracts derivation and multi-cell jupyter sidecars', () => {
    const source = [
      '# Attention',
      ':::tensornote{type="derivation" id="scale" title="缩放推导"}',
      '$$x / \\sqrt{d}$$',
      ':::',
      ':::tensornote{type="jupyter" id="demo" title="验证"}',
      '```python', 'x = 1', '```', '', '```python', 'x + 1', '```',
      ':::',
    ].join('\n')
    const result = parseSidecarDirectives(source)
    expect(result.sidecars).toHaveLength(2)
    expect(result.sidecars[0]).toMatchObject({ id: 'scale', type: 'derivation' })
    expect(result.sidecars[1]).toMatchObject({ id: 'demo', type: 'jupyter', cells: [{ code: 'x = 1' }, { code: 'x + 1' }] })
    expect(result.renderedContent.match(/```tensornote-sidecar/g)).toHaveLength(2)
    expect(result.diagnostics).toEqual([])
  })

  it('preserves malformed and duplicate directives as Markdown', () => {
    const valid = createSidecarDirective({ type: 'derivation', id: 'same', title: 'A', body: 'first' })
    const source = `${valid}\n\n${valid}\n\n:::tensornote{type="unknown" id="bad"}\nbody\n:::`
    const result = parseSidecarDirectives(source)
    expect(result.sidecars).toHaveLength(1)
    expect(result.diagnostics.map((item) => item.message)).toEqual(['Sidecar id 重复：same', '不支持的 Sidecar 类型：unknown'])
    expect(result.renderedContent).toContain(':::tensornote')
  })

  it('preserves an unclosed directive', () => {
    const source = 'before\n:::tensornote{type="derivation" id="open"}\nbody'
    const result = parseSidecarDirectives(source)
    expect(result.sidecars).toEqual([])
    expect(result.renderedContent).toBe(source)
    expect(result.diagnostics[0].message).toContain('缺少结束标记')
  })

  it('preserves nested Sidecars and reports the unsupported structure', () => {
    const source = [':::tensornote{type="derivation" id="outer"}', 'text', ':::tensornote{type="derivation" id="inner"}', 'nested', ':::', ':::'].join('\n')
    const result = parseSidecarDirectives(source)
    expect(result.sidecars).toEqual([])
    expect(result.diagnostics[0].message).toBe('Sidecar 不支持嵌套')
    expect(result.renderedContent).toContain('id="outer"')
  })

  it('only turns Python fences into executable Jupyter cells', () => {
    const source = [':::tensornote{type="jupyter" id="languages" title="Languages"}', '```javascript', 'alert(1)', '```', '```json', '{}', '```', '```python title="Only Python"', 'answer = 42', '```', ':::'].join('\n')
    const result = parseSidecarDirectives(source)
    expect(result.sidecars[0]).toMatchObject({ type: 'jupyter', cells: [{ title: 'Only Python', code: 'answer = 42' }] })
  })

  it('generates unique IDs and edits only the selected source range', () => {
    expect(createUniqueSidecarId('Full Derivation', 'derivation', ['full-derivation'])).toBe('full-derivation-2')
    const first = createSidecarDirective({ type: 'derivation', id: 'first', title: 'First', body: 'old' })
    const second = createSidecarDirective({ type: 'derivation', id: 'second', title: 'Second', body: 'keep' })
    const source = `before\n\n${first}\n\nmiddle\n\n${second}\n\nafter`
    const parsed = parseSidecarDirectives(source)
    const replacement = createSidecarDirective({ type: 'derivation', id: 'first', title: 'First', body: 'new' })
    const edited = replaceSidecarSource(source, parsed.sidecars[0].source, replacement)
    expect(edited).toContain('new')
    expect(edited).toContain(second)
    expect(parseSidecarDirectives(edited).sidecars).toHaveLength(2)
    expect(deleteSidecarSource(edited, parseSidecarDirectives(edited).sidecars[0].source)).not.toContain('id="first"')
    expect(deleteSidecarSource(edited, parseSidecarDirectives(edited).sidecars[0].source)).toContain(second)
  })
})
