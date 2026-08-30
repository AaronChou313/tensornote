export interface TextSelection { from: number; to: number }
export interface EditorTransformResult { value: string; selection: TextSelection }

const selected = (value: string, selection: TextSelection) => value.slice(selection.from, selection.to)
const replace = (value: string, selection: TextSelection, insert: string, cursorStart = insert.length, cursorEnd = cursorStart): EditorTransformResult => ({
  value: `${value.slice(0, selection.from)}${insert}${value.slice(selection.to)}`,
  selection: { from: selection.from + cursorStart, to: selection.from + cursorEnd },
})
const lineRange = (value: string, selection: TextSelection) => {
  const from = value.lastIndexOf('\n', Math.max(0, selection.from - 1)) + 1
  const lineEnd = value.indexOf('\n', selection.to)
  return { from, to: lineEnd < 0 ? value.length : lineEnd }
}
const toggleWrap = (value: string, selection: TextSelection, before: string, after = before, placeholder = 'text') => {
  const body = selected(value, selection)
  const wrappedAroundSelection = value.slice(Math.max(0, selection.from - before.length), selection.from) === before
    && value.slice(selection.to, selection.to + after.length) === after
  if (wrappedAroundSelection) {
    const from = selection.from - before.length
    const to = selection.to + after.length
    return replace(value, { from, to }, body, 0, body.length)
  }
  if (body.startsWith(before) && body.endsWith(after) && body.length >= before.length + after.length) {
    return replace(value, selection, body.slice(before.length, -after.length), 0, body.length - before.length - after.length)
  }
  const content = body || placeholder
  return replace(value, selection, `${before}${content}${after}`, before.length, before.length + content.length)
}
const toggleLinePrefix = (value: string, selection: TextSelection, prefix: string, matcher: RegExp) => {
  const range = lineRange(value, selection)
  const text = value.slice(range.from, range.to)
  const lines = text.split('\n')
  const remove = lines.every((line) => matcher.test(line))
  const next = lines.map((line) => {
    if (remove) return line.replace(matcher, '$1')
    const indent = line.match(/^\s*/)?.[0] ?? ''
    return `${indent}${prefix}${line.slice(indent.length)}`
  }).join('\n')
  return replace(value, range, next, selection.from - range.from, selection.to - range.from + (next.length - text.length))
}

export type EditorCommandId =
  | 'editor.paragraph' | 'editor.heading1' | 'editor.heading2' | 'editor.heading3' | 'editor.heading4' | 'editor.heading5' | 'editor.heading6'
  | 'editor.bold' | 'editor.italic' | 'editor.strikethrough' | 'editor.inlineCode' | 'editor.link' | 'editor.image'
  | 'editor.blockquote' | 'editor.callout' | 'editor.bulletList' | 'editor.numberedList' | 'editor.taskList'
  | 'editor.codeFence' | 'editor.table' | 'editor.horizontalRule' | 'editor.mathBlock'

export const editorCommandLabels: Record<EditorCommandId, string> = {
  'editor.paragraph': 'Paragraph', 'editor.heading1': 'Heading 1', 'editor.heading2': 'Heading 2', 'editor.heading3': 'Heading 3', 'editor.heading4': 'Heading 4', 'editor.heading5': 'Heading 5', 'editor.heading6': 'Heading 6',
  'editor.bold': 'Bold', 'editor.italic': 'Italic', 'editor.strikethrough': 'Strikethrough', 'editor.inlineCode': 'Inline code', 'editor.link': 'Link', 'editor.image': 'Image',
  'editor.blockquote': 'Blockquote', 'editor.callout': 'Callout', 'editor.bulletList': 'Bullet list', 'editor.numberedList': 'Numbered list', 'editor.taskList': 'Task list',
  'editor.codeFence': 'Code fence', 'editor.table': 'Table', 'editor.horizontalRule': 'Horizontal rule', 'editor.mathBlock': 'Math block',
}

export interface EditorCommandOptions { codeLanguage?: string }

export function transformEditorCommand(id: EditorCommandId, value: string, selection: TextSelection, options: EditorCommandOptions = {}): EditorTransformResult {
  if (id === 'editor.bold') return toggleWrap(value, selection, '**')
  if (id === 'editor.italic') return toggleWrap(value, selection, '*')
  if (id === 'editor.strikethrough') return toggleWrap(value, selection, '~~')
  if (id === 'editor.inlineCode') return toggleWrap(value, selection, '`')
  if (id === 'editor.link') return toggleWrap(value, selection, '[', '](url)', 'link text')
  if (id === 'editor.image') return replace(value, selection, `![${selected(value, selection) || 'image'}](url)`, 2, 2 + (selected(value, selection) || 'image').length)
  if (id === 'editor.blockquote') return toggleLinePrefix(value, selection, '> ', /^(\s*)>\s?/)
  if (id === 'editor.bulletList') return toggleLinePrefix(value, selection, '- ', /^(\s*)[-*+]\s+/)
  if (id === 'editor.numberedList') return toggleLinePrefix(value, selection, '1. ', /^(\s*)\d+\.\s+/)
  if (id === 'editor.taskList') return toggleLinePrefix(value, selection, '- [ ] ', /^(\s*)- \[[ xX]\]\s+/)
  if (id === 'editor.callout') {
    const range = lineRange(value, selection)
    const text = value.slice(range.from, range.to)
    const isCallout = /^\s*> \[![^\]]+\]/.test(text)
    const next = isCallout ? text.replace(/^(\s*)> \[![^\]]+\]\n?/, '$1').split('\n').map((line) => line.replace(/^(\s*)>\s?/, '$1')).join('\n') : text.split('\n').map((line, index) => {
      const indent = line.match(/^\s*/)?.[0] ?? ''
      return index === 0 ? `${indent}> [!NOTE]\n${indent}> ${line.slice(indent.length)}` : `${indent}> ${line.slice(indent.length)}`
    }).join('\n')
    return replace(value, range, next, selection.from - range.from, selection.to - range.from + next.length - text.length)
  }
  if (id === 'editor.codeFence') { const body = selected(value, selection) || 'code'; const language = options.codeLanguage === 'plain' ? '' : options.codeLanguage ?? 'python'; const prefix = `\`\`\`${language}\n`; return replace(value, selection, `${prefix}${body}\n\`\`\``, prefix.length, prefix.length + body.length) }
  if (id === 'editor.table') return replace(value, selection, '| Column | Column |\n| --- | --- |\n| Value | Value |', 2, 8)
  if (id === 'editor.horizontalRule') return replace(value, selection, '---\n', 4)
  if (id === 'editor.mathBlock') { const body = selected(value, selection) || 'x = y'; return replace(value, selection, `$$\n${body}\n$$`, 3, 3 + body.length) }
  const range = lineRange(value, selection)
  const text = value.slice(range.from, range.to)
  const level = id === 'editor.paragraph' ? 0 : Number(id.slice(-1))
  const next = text.split('\n').map((line) => {
    const indent = line.match(/^\s*/)?.[0] ?? ''
    const content = line.slice(indent.length).replace(/^#{1,6}\s+/, '')
    return level ? `${indent}${'#'.repeat(level)} ${content}` : `${indent}${content}`
  }).join('\n')
  const mapOffset = (offset: number) => {
    let sourceOffset = 0
    let destinationOffset = 0
    for (const line of text.split('\n')) {
      const indent = line.match(/^\s*/)?.[0] ?? ''
      const oldPrefix = line.slice(indent.length).match(/^#{1,6}\s+/)?.[0] ?? ''
      const newPrefix = level ? `${'#'.repeat(level)} ` : ''
      const lineEnd = sourceOffset + line.length
      if (offset <= lineEnd) {
        const withinLine = offset - sourceOffset
        if (withinLine <= indent.length + oldPrefix.length) return destinationOffset + indent.length + newPrefix.length
        return destinationOffset + withinLine + newPrefix.length - oldPrefix.length
      }
      sourceOffset = lineEnd + 1
      destinationOffset += indent.length + newPrefix.length + line.slice(indent.length + oldPrefix.length).length + 1
    }
    return destinationOffset
  }
  return replace(value, range, next, mapOffset(selection.from - range.from), mapOffset(selection.to - range.from))
}
