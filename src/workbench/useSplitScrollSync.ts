import { useEffect, type RefObject } from 'react'
import type { EditorView } from '@codemirror/view'
import { headingSourceOffset } from './headingNavigation'
import { alignScroll, type ScrollAnchor } from './scrollAlignment'

export function useSplitScrollSync(enabled: boolean, view: EditorView | null, previewRef: RefObject<HTMLElement | null>, source: string) {
  useEffect(() => {
    const preview = previewRef.current
    if (!enabled || !view || !preview) return
    const editor = view.scrollDOM
    let frame = 0
    let lastDriver: 'source' | 'preview' = 'source'
    const expected: Partial<Record<'source' | 'preview', number>> = {}
    const offsets = new Map<string, number | null>()
    const sync = (driver: 'source' | 'preview') => {
      const sourceMax = Math.max(0, editor.scrollHeight - editor.clientHeight)
      const previewMax = Math.max(0, preview.scrollHeight - preview.clientHeight)
      const anchors: ScrollAnchor[] = [{ source: 0, preview: 0 }]
      const previewTop = preview.getBoundingClientRect().top
      for (const heading of preview.querySelectorAll<HTMLElement>('h1[id],h2[id],h3[id],h4[id],h5[id],h6[id]')) {
        if (!heading.getClientRects().length) continue
        if (!offsets.has(heading.id)) offsets.set(heading.id, headingSourceOffset(source, heading.id))
        const offset = offsets.get(heading.id) ?? null
        if (offset === null || offset > view.state.doc.length) continue
        const sourceY = view.lineBlockAt(offset).top + view.documentTop - editor.getBoundingClientRect().top + editor.scrollTop
        const previewY = heading.getBoundingClientRect().top - previewTop + preview.scrollTop
        if (sourceY > 0 && previewY > 0 && sourceY < sourceMax && previewY < previewMax) anchors.push({ source: sourceY, preview: previewY })
      }
      anchors.push({ source: sourceMax, preview: previewMax })
      const target = driver === 'source' ? preview : editor
      const targetKey = driver === 'source' ? 'preview' : 'source'
      target.scrollTop = alignScroll(driver === 'source' ? editor.scrollTop : preview.scrollTop, anchors, driver === 'preview')
      expected[targetKey] = target.scrollTop
    }
    const schedule = (driver: 'source' | 'preview') => {
      lastDriver = driver
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => sync(driver))
    }
    const scroll = (driver: 'source' | 'preview', element: HTMLElement) => () => {
      if (expected[driver] !== undefined && Math.abs(element.scrollTop - expected[driver]!) < 1) return
      delete expected[driver]
      schedule(driver)
    }
    const sourceScroll = scroll('source', editor), previewScroll = scroll('preview', preview)
    editor.addEventListener('scroll', sourceScroll, { passive: true })
    preview.addEventListener('scroll', previewScroll, { passive: true })
    const observer = new ResizeObserver(() => schedule(lastDriver))
    observer.observe(editor)
    observer.observe(view.contentDOM)
    observer.observe(preview)
    if (preview.firstElementChild) observer.observe(preview.firstElementChild)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      editor.removeEventListener('scroll', sourceScroll)
      preview.removeEventListener('scroll', previewScroll)
    }
  }, [enabled, source, view, previewRef])
}
