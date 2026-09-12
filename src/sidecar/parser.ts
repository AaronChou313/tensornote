import type { LabCell } from '../types'
import type { Sidecar, SidecarDiagnostic, SidecarType } from './types'

const OPENING = /^:::tensornote\{([^}]*)\}\s*$/
const CLOSING = /^:::\s*$/
const ATTRIBUTE = /([\w-]+)="([^"]*)"/g
const CODE_FENCE = /```(?:python)?(?:\s+exec)?([^\n]*)\n([\s\S]*?)```/g

function attributes(source: string) {
  return Object.fromEntries([...source.matchAll(ATTRIBUTE)].map((match) => [match[1], match[2]]))
}

function safeId(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9_-]/g, '-').replace(/^-+|-+$/g, '')
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
  if (!cells.length && body.trim()) {
    cells.push({ id: `${id}-1`, lab: id, order: 1, title: 'Cell 1', difficulty: 'basic', code: body.trim() })
  }
  return cells
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
    if ((type !== 'derivation' && type !== 'jupyter') || !id || ids.has(id)) {
      const reason = !id ? 'Sidecar 缺少有效 id' : ids.has(id) ? `Sidecar id 重复：${id}` : `不支持的 Sidecar 类型：${type || '(空)'}`
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

