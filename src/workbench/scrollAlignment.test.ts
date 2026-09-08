import { expect, it } from 'vitest'
import { alignScroll } from './scrollAlignment'

it('aligns unequal section heights in either scroll direction, including document ends', () => {
  const anchors = [{ source: 0, preview: 0 }, { source: 100, preview: 300 }, { source: 500, preview: 500 }, { source: 900, preview: 1400 }]
  expect(alignScroll(100, anchors)).toBe(300)
  expect(alignScroll(300, anchors)).toBe(400)
  expect(alignScroll(400, anchors, true)).toBe(300)
  expect(alignScroll(-1, anchors)).toBe(0)
  expect(alignScroll(10000, anchors)).toBe(1400)
  expect(alignScroll(1400, anchors, true)).toBe(900)
})

it('handles short documents and coincident anchors without NaN', () => {
  expect(alignScroll(0, [{ source: 0, preview: 0 }, { source: 0, preview: 0 }])).toBe(0)
  expect(alignScroll(4, [])).toBe(0)
})
