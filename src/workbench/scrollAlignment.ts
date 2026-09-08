export interface ScrollAnchor { source: number; preview: number }

/** Interpolate between content anchors rather than matching pixel distances. */
export function alignScroll(position: number, anchors: ScrollAnchor[], reverse = false) {
  const from = reverse ? 'preview' : 'source'
  const to = reverse ? 'source' : 'preview'
  const ordered = anchors.filter((a) => Number.isFinite(a.source) && Number.isFinite(a.preview))
    .sort((a, b) => a[from] - b[from])
  const points: ScrollAnchor[] = []
  for (const anchor of ordered) {
    const previous = points.at(-1)
    if (!previous || (anchor[from] > previous[from] && anchor[to] >= previous[to])) points.push(anchor)
  }
  if (!points.length) return 0
  if (position <= points[0][from]) return points[0][to]
  for (let i = 1; i < points.length; i++) {
    const previous = points[i - 1], next = points[i]
    if (position <= next[from]) return previous[to] + (next[to] - previous[to]) * (position - previous[from]) / (next[from] - previous[from])
  }
  return points.at(-1)![to]
}
