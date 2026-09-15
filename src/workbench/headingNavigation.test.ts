// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { headingSourceOffset, restoreNoteScroll, scrollToHeading } from './headingNavigation'

describe('pane heading navigation', () => {
  it('scrolls only the requested pane even if both render identical IDs', () => {
    const first = document.createElement('section'), second = document.createElement('section')
    first.innerHTML = '<h2 id="same">Same</h2>'
    second.innerHTML = first.innerHTML
    const firstScroll = vi.fn(), secondScroll = vi.fn()
    first.querySelector('h2')!.scrollIntoView = firstScroll
    second.querySelector('h2')!.scrollIntoView = secondScroll
    expect(scrollToHeading(second, 'same')).toBe(true)
    expect(firstScroll).not.toHaveBeenCalled()
    expect(secondScroll).toHaveBeenCalledOnce()
    expect(scrollToHeading(second, 'missing')).toBe(false)
  })
  it('locates a duplicate source heading without counting fenced examples', () => {
    const source = '## Same\n\n```md\n## Same\n```\n\n## Same'
    expect(headingSourceOffset(source, 'same')).toBe(0)
    expect(headingSourceOffset(source, 'same-1')).toBe(source.lastIndexOf('## Same'))
    expect(headingSourceOffset(source, 'missing')).toBeNull()
  })
  it('lets explicit heading navigation override a saved scroll position', () => {
    const pane = document.createElement('section')
    pane.innerHTML = '<h2 id="target">Target</h2>'
    pane.scrollTop = 1000
    const headingScroll = vi.fn()
    pane.querySelector('h2')!.scrollIntoView = headingScroll
    expect(restoreNoteScroll(pane, 400, 'target')).toBe('heading')
    expect(headingScroll).toHaveBeenCalledOnce()
    expect(pane.scrollTop).toBe(1000)
    expect(restoreNoteScroll(pane, 400)).toBe('position')
    expect(pane.scrollTop).toBe(400)
  })
})
