import { describe, expect, it } from 'vitest'
import { createSidecarDirective, parseSidecarDirectives } from './parser'

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
})

