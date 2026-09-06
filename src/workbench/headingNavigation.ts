import { slugify } from '../content/document'

/** Scope duplicate Markdown IDs to the chosen pane instead of document.getElementById. */
export function scrollToHeading(root: ParentNode, id: string) {
  const target = [...root.querySelectorAll<HTMLElement>('[id]')].find((element) => element.id === id)
  if (!target) return false
  target.scrollIntoView({ block: 'start', behavior: 'instant' })
  return true
}

export function headingSourceOffset(source: string, id: string): number | null {
  const prose = source.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, (block) => block.replace(/[^\n]/g, ' '))
  const counts = new Map<string, number>()
  for (const match of prose.matchAll(/^(#{1,6})\s+(.+)$/gm)) {
    const base = slugify(match[2].replace(/\s+#+\s*$/, '').trim())
    const count = counts.get(base) ?? 0
    counts.set(base, count + 1)
    if ((count ? `${base}-${count}` : base) === id) return match.index
  }
  return null
}
