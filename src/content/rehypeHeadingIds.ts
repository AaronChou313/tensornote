import type { Root, RootContent } from 'hast'
import { slugify } from './document'

function textContent(node: RootContent): string {
  if (node.type === 'text') return node.value
  return 'children' in node ? node.children.map(textContent).join('') : ''
}

/** Allocate IDs once per Markdown tree, never as a React render side effect. */
export function rehypeHeadingIds() {
  return (tree: Root, file: { value: unknown }) => {
    const counts = new Map<string, number>()
    const source = String(file.value)
    const visit = (node: RootContent) => {
      if (node.type === 'element' && /^h[1-6]$/.test(node.tagName)) {
        const start = node.position?.start.offset
        const end = node.position?.end.offset
        const raw = start === undefined || end === undefined ? '' : source.slice(start, end)
        // Match the portable document index's ATX heading slug, including inline markup.
        const atx = raw.match(/^#{1,6}\s+(.+)$/)
        const label = atx ? atx[1].replace(/\s+#+\s*$/, '').trim() : textContent(node)
        const base = slugify(label)
        const count = counts.get(base) ?? 0
        counts.set(base, count + 1)
        node.properties.id = count ? `${base}-${count}` : base
      }
      if ('children' in node) node.children.forEach(visit)
    }
    tree.children.forEach(visit)
  }
}
