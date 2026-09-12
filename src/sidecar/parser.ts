import type { LabCell } from '../types'
import type { Sidecar, SidecarDiagnostic, SidecarType } from './types'

const OPENING = /^:::tensornote\{([^}]*)\}\s*$/
const CLOSING = /^:::\s*$/
const ATTRIBUTE = /([\w-]+)="([^"]*)"/g
const CODE_FENCE = /```python(?:\s+exec)?([^\n]*)\n([\s\S]*?)```/g

function attributes(source: string) {
  return Object.fromEntries([...source.matchAll(ATTRIBUTE)].map((match) => [match[1], match[2]]))
}

function safeId(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function jupyterCells(id: string, body: string): LabCell[] {
  const cells: LabCell[] = []
  for (const match of body.matchAll(CODE_FENCE)) {
    const metadata = attributes(match[1])
    const order = cells.length + 1
    cells.push({
      id: `${id}-${order}`,
      lab: id,
      order,
      title: metadata.title || `Cell ${order}`,
      difficulty: 'basic',
      code: match[2].trim(),
    })
  }
  return cells
}

export function createUniqueSidecarId(title: string, type: SidecarType, existingIds: Iterable<string>, currentId?: string) {
  const occupied = new Set([...existingIds].filter((id) => id !== currentId))
  const localizedDefault = title.trim() === '完整推导' ? 'full-derivation' : title.trim() === 'Python 实验' ? 'python-experiment' : ''
  const base = localizedDefault || safeId(title) || (type === 'derivation' ? 'derivation' : 'python-experiment')
  if (!occupied.has(base)) return base
  let suffix = 2
  while (occupied.has(`${base}-${suffix}`)) suffix += 1
  return `${base}-${suffix}`
}

export function replaceSidecarSource(content: string, source: { start: number; end: number }, directive: string) {
  const original = content.slice(source.start, source.end)
  const lineEnding = original.endsWith('\r\n') ? '\r\n' : original.endsWith('\n') ? '\n' : ''
  const replacement = lineEnding && !directive.endsWith(lineEnding) ? `${directive}${lineEnding}` : directive
  return `${content.slice(0, source.start)}${replacement}${content.slice(source.end)}`
}

export function deleteSidecarSource(content: string, source: { start: number; end: number }) {
  const before = content.slice(0, source.start)
  const after = content.slice(source.end)
  return before.endsWith('\n\n') && after.startsWith('\n') ? `${before}${after.slice(1)}` : `${before}${after}`
}

export function sourceLineAtOffset(content: string, offset: number) {
  return content.slice(0, Math.max(0, offset)).split('\n').length
}

export function createSidecarDirective(sidecar: { type: SidecarType; id: string; title: string; body: string }) {
  const id = safeId(sidecar.id) || `${sidecar.type}-sidecar`
  const title = sidecar.title.trim().replaceAll('"', "'") || (sidecar.type === 'derivation' ? '推导' : 'Python 实验')
  return `:::tensornote{type="${sidecar.type}" id="${id}" title="${title}"}\n${sidecar.body.trim()}\n:::`
}

export function parseSidecarDirectives(content: string): {
  sidecars: Sidecar[]
  renderedContent: string
  diagnostics: SidecarDiagnostic[]
} {
  const sidecars: Sidecar[] = []
  const diagnostics: SidecarDiagnostic[] = []
  const ids = new Set<string>()
  const lines = content.match(/.*(?:\n|$)/g)?.filter(Boolean) ?? []
  let offset = 0
  let cursor = 0
  let renderedContent = ''

  while (cursor < lines.length) {
    const line = lines[cursor]
    const opening = line.replace(/\r?\n$/, '').match(OPENING)
    if (!opening) {
      renderedContent += line
      offset += line.length
      cursor += 1
      continue
    }

    const start = offset
    let closing = cursor + 1
    while (closing < lines.length && !CLOSING.test(lines[closing].replace(/\r?\n$/, ''))) closing += 1
    if (closing >= lines.length) {
      diagnostics.push({ offset: start, message: 'Sidecar 缺少结束标记 :::' })
      renderedContent += line
      offset += line.length
      cursor += 1
      continue
    }

    const rawBlock = lines.slice(cursor, closing + 1).join('')
    const body = lines.slice(cursor + 1, closing).join('').trim()
    const values = attributes(opening[1])
    const type = values.type
    const id = safeId(values.id || '')
    const nested = lines.slice(cursor + 1, closing).some((candidate) => OPENING.test(candidate.replace(/\r?\n$/, '')))
    if ((type !== 'derivation' && type !== 'jupyter') || !id || ids.has(id) || nested) {
      const reason = nested ? 'Sidecar 不支持嵌套' : !id ? 'Sidecar 缺少有效 id' : ids.has(id) ? `Sidecar id 重复：${id}` : `不支持的 Sidecar 类型：${type || '(空)'}`
      diagnostics.push({ offset: start, message: reason })
      renderedContent += rawBlock
    } else {
      ids.add(id)
      const base = { id, title: values.title?.trim() || id, source: { start, end: start + rawBlock.length } }
      sidecars.push(type === 'derivation'
        ? { ...base, type, markdown: body }
        : { ...base, type, cells: jupyterCells(id, body) })
      renderedContent += `\n\`\`\`tensornote-sidecar\n${id}\n\`\`\`\n`
    }
    offset += rawBlock.length
    cursor = closing + 1
  }

  return { sidecars, renderedContent, diagnostics }
}
