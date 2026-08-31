import type { Lab, LabCell } from '../types'

export const EXECUTABLE_MARKDOWN_SYNTAX_VERSION = 1

const EXEC_BLOCK = /```python\s+exec([^\n]*)\n([\s\S]*?)```/g
const ATTRIBUTE = /(lab|cell|title|difficulty)="([^"]+)"/g

function parseAttributes(meta: string) {
  const attributes: Record<string, string> = {}
  for (const match of meta.matchAll(ATTRIBUTE)) {
    attributes[match[1]] = match[2]
  }
  return attributes
}

export interface ExecutableLabDraft {
  id: string
  difficulty: LabCell['difficulty']
  cells: Array<{ title: string; code: string }>
}

export function createExecutableLabMarkdown({ id, difficulty, cells }: ExecutableLabDraft) {
  const safeLabId = id.trim().replace(/[^a-zA-Z0-9_-]/g, '-').replace(/^-+|-+$/g, '') || 'python-experiment'
  const contentCells = cells.length ? cells : [{ title: 'Cell 1', code: '' }]
  if (contentCells.some((cell) => cell.code.includes('```'))) throw new Error('Cell 代码中不能包含 Markdown Fence（```）')
  return contentCells.map((cell, index) => {
    const title = (cell.title.trim() || `Cell ${index + 1}`).replaceAll('"', "'")
    const code = cell.code.trimEnd() || '# 在这里编写 Python 代码'
    return `\`\`\`python exec lab="${safeLabId}" cell="${index + 1}" title="${title}" difficulty="${difficulty}"\n${code}\n\`\`\``
  }).join('\n\n')
}

export function extractLabs(content: string): { labs: Lab[]; renderedContent: string } {
  const grouped = new Map<string, LabCell[]>()
  let match: RegExpExecArray | null

  while ((match = EXEC_BLOCK.exec(content))) {
    const attributes = parseAttributes(match[1])
    const lab = attributes.lab ?? 'default-lab'
    const order = Number(attributes.cell ?? 1)
    const difficulty = (attributes.difficulty ?? 'basic') as LabCell['difficulty']
    const cell: LabCell = {
      id: `${lab}-${order}`,
      lab,
      order,
      title: attributes.title ?? `Cell ${order}`,
      difficulty,
      code: match[2].trim(),
    }
    grouped.set(lab, [...(grouped.get(lab) ?? []), cell])
  }

  const labs: Lab[] = [...grouped.entries()].map(([id, cells]) => {
    const sortedCells = cells.sort((a, b) => a.order - b.order)
    return {
      id,
      title: id
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' '),
      difficulty: sortedCells.some((cell) => cell.difficulty === 'heavy')
        ? 'heavy'
        : sortedCells.some((cell) => cell.difficulty === 'medium')
          ? 'medium'
          : 'basic',
      cells: sortedCells,
    }
  })

  const emitted = new Set<string>()
  const renderedContent = content.replace(EXEC_BLOCK, (_whole, meta: string) => {
    const attributes = parseAttributes(meta)
    const lab = attributes.lab ?? 'default-lab'
    if (emitted.has(lab)) return ''
    emitted.add(lab)
    return `\n\`\`\`tensornote-lab\n${lab}\n\`\`\`\n`
  })

  return { labs, renderedContent }
}

export function updateLabCells(raw: string, labId: string, codeByCellId: Record<string, string>) {
  return raw.replace(EXEC_BLOCK, (whole, meta: string) => {
    const attributes = parseAttributes(meta)
    const lab = attributes.lab ?? 'default-lab'
    const order = Number(attributes.cell ?? 1)
    const replacement = codeByCellId[`${lab}-${order}`]
    if (lab !== labId || replacement === undefined) return whole
    return `\`\`\`python exec${meta}\n${replacement.trimEnd()}\n\`\`\``
  })
}

export function insertScratchLab(raw: string, labId: string, cells: Array<{ title: string; code: string }>) {
  const contentCells = cells.filter((cell) => cell.code.trim())
  if (!contentCells.length) throw new Error('Scratch Lab 至少需要一个非空 Cell')
  if (contentCells.some((cell) => cell.code.includes('```'))) throw new Error('Scratch Cell 中包含 Markdown Fence，无法安全写入笔记')
  const fences = createExecutableLabMarkdown({
    id: labId,
    difficulty: 'basic',
    cells: contentCells.map((cell, index) => ({ ...cell, title: cell.title.trim() || `Scratch Cell ${index + 1}` })),
  })
  return `${raw.trimEnd()}\n\n${fences}\n`
}
