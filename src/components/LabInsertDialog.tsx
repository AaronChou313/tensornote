import { useEffect, useMemo, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { python } from '@codemirror/lang-python'
import { ArrowDown, ArrowUp, Flask, Function as FunctionIcon, Plus, Trash, X } from '@phosphor-icons/react'
import { createSidecarDirective, createUniqueSidecarId } from '../sidecar/parser'
import type { Sidecar, SidecarType } from '../sidecar/types'
import { useAppStore } from '../store/useAppStore'
import { Button } from './ui/Button'
import { MarkdownRenderer } from './MarkdownRenderer'
import type { KnowledgeIndex } from '../content/knowledgeIndex'

interface DraftCell { key: number; title: string; code: string }

interface LabInsertDialogProps {
  initialCode?: string
  existing?: Sidecar
  existingIds?: string[]
  onSave?: (markdown: string) => void
  /** Compatibility alias for earlier callers. */
  onInsert?: (markdown: string) => void
  onDelete?: () => void
  onClose: () => void
  documentPath?: string
  noteId?: string
  knowledgeIndex?: KnowledgeIndex
  resolveAssetUrl?: (path: string, fromDocument: string) => Promise<string>
}

function initialCells(existing?: Sidecar, initialCode = ''): DraftCell[] {
  if (existing?.type === 'jupyter') return existing.cells.map((cell, index) => ({ key: index + 1, title: cell.title, code: cell.code }))
  return [{ key: 1, title: '准备数据', code: initialCode }]
}

export function LabInsertDialog({ initialCode = '', existing, existingIds = [], onSave, onInsert, onDelete, onClose, documentPath, noteId, knowledgeIndex, resolveAssetUrl }: LabInsertDialogProps) {
  const theme = useAppStore((state) => state.theme)
  const initialType = existing?.type ?? 'jupyter'
  const [type, setType] = useState<SidecarType>(initialType)
  const [title, setTitle] = useState(existing?.title ?? (initialType === 'jupyter' ? 'Python 实验' : '完整推导'))
  const [customId, setCustomId] = useState(existing?.id ?? '')
  const [customIdEdited, setCustomIdEdited] = useState(Boolean(existing))
  const [advanced, setAdvanced] = useState(false)
  const [help, setHelp] = useState(false)
  const [preview, setPreview] = useState(false)
  const [derivation, setDerivation] = useState(existing?.type === 'derivation' ? existing.markdown : initialCode)
  const [cells, setCells] = useState<DraftCell[]>(initialCells(existing, initialCode))

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  const generatedId = useMemo(() => createUniqueSidecarId(title, type, existingIds, existing?.id), [existing?.id, existingIds, title, type])
  const id = customIdEdited ? customId : generatedId
  const updateCell = (key: number, patch: Partial<DraftCell>) => setCells((current) => current.map((cell) => cell.key === key ? { ...cell, ...patch } : cell))
  const addCell = () => setCells((current) => [...current, { key: Math.max(0, ...current.map((cell) => cell.key)) + 1, title: `Cell ${current.length + 1}`, code: '' }])
  const moveCell = (index: number, direction: -1 | 1) => setCells((current) => {
    const target = index + direction
    if (target < 0 || target >= current.length) return current
    const next = [...current]; [next[index], next[target]] = [next[target], next[index]]
    return next
  })
  const body = type === 'derivation' ? derivation : cells.map((cell) => `\`\`\`python title="${cell.title.replaceAll('"', "'")}"\n${cell.code.trimEnd() || '# 在这里编写 Python 代码'}\n\`\`\``).join('\n\n')
  const submit = () => (onSave ?? onInsert)?.(createSidecarDirective({ type, id, title, body }))
  const changeType = (next: SidecarType) => {
    setType(next)
    setTitle(next === 'jupyter' ? 'Python 实验' : '完整推导')
    if (!existing) { setCustomId(''); setCustomIdEdited(false) }
  }

  return <div className="lab-insert-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="lab-insert-dialog" role="dialog" aria-modal="true" aria-labelledby="sidecar-insert-title">
      <header><span>{type === 'jupyter' ? <Flask size={20} /> : <FunctionIcon size={20} />}</span><div><h2 id="sidecar-insert-title">{existing ? '编辑侧栏内容' : '插入侧栏内容'}</h2><p>把补充说明或可执行 Python 实验放在主阅读流之外。</p></div><Button variant="ghost" size="icon" onClick={onClose} aria-label="关闭"><X size={18} /></Button></header>
      <div className="lab-insert-dialog__body">
        <div className="sidecar-type-switch" role="group" aria-label="侧栏内容类型">
          <button type="button" className={type === 'derivation' ? 'is-active' : ''} onClick={() => changeType('derivation')}><FunctionIcon size={18} /><span><strong>推导 / 补充</strong><small>富 Markdown，不执行代码</small></span></button>
          <button type="button" className={type === 'jupyter' ? 'is-active' : ''} onClick={() => changeType('jupyter')}><Flask size={18} /><span><strong>Python 实验</strong><small>一个或多个 Cell，共享 Kernel</small></span></button>
        </div>
        <div className="lab-insert-basics"><label><span>标题</span><input value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Sidecar 标题" /></label></div>
        {type === 'derivation' ? <section className="sidecar-markdown-editor"><div className="sidecar-editor-tabs"><button type="button" className={!preview ? 'is-active' : ''} onClick={() => setPreview(false)}>编辑</button><button type="button" className={preview ? 'is-active' : ''} onClick={() => setPreview(true)}>预览</button></div>{preview ? <div className="sidecar-preview note-prose"><MarkdownRenderer content={derivation} labs={[]} documentPath={documentPath} noteId={noteId} knowledgeIndex={knowledgeIndex} resolveAssetUrl={resolveAssetUrl} /></div> : <CodeMirror value={derivation} extensions={[markdown()]} theme={theme} minHeight="260px" basicSetup={{ lineNumbers: true, foldGutter: false }} onChange={setDerivation} aria-label="Markdown 补充内容" />}</section> : <><div className="lab-insert-cells__heading"><div><strong>Python Cell</strong><small>只识别 Python Fence，并按从上到下的顺序执行。</small></div><Button variant="secondary" size="sm" onClick={addCell}><Plus size={14} />添加 Cell</Button></div><div className="lab-insert-cells">{cells.map((cell, index) => <section className="lab-insert-cell" key={cell.key}><header><span>Cell {index + 1}</span><div><button type="button" onClick={() => moveCell(index, -1)} disabled={index === 0} aria-label={`上移 Cell ${index + 1}`}><ArrowUp size={14} /></button><button type="button" onClick={() => moveCell(index, 1)} disabled={index === cells.length - 1} aria-label={`下移 Cell ${index + 1}`}><ArrowDown size={14} /></button>{cells.length > 1 && <button type="button" onClick={() => setCells((current) => current.filter((item) => item.key !== cell.key))} aria-label={`删除 Cell ${index + 1}`}><Trash size={15} /></button>}</div></header><label><span>标题</span><input value={cell.title} onChange={(event) => updateCell(cell.key, { title: event.target.value })} aria-label={`Cell ${index + 1} 标题`} /></label><label><span>Python</span><CodeMirror value={cell.code} extensions={[python()]} theme={theme} minHeight="132px" basicSetup={{ lineNumbers: true, foldGutter: false }} onChange={(code) => updateCell(cell.key, { code })} aria-label={`Cell ${index + 1} Python 代码`} /></label></section>)}</div></>}
        <details className="sidecar-advanced" open={advanced} onToggle={(event) => setAdvanced(event.currentTarget.open)}><summary>高级设置</summary><label><span>ID</span><input value={id} onChange={(event) => { setCustomId(event.target.value); setCustomIdEdited(true) }} aria-label="Sidecar 标识" /><small>仅需在当前笔记内唯一；留给高级引用和源码维护。</small></label></details>
        <button type="button" className="sidecar-format-help" onClick={() => setHelp((value) => !value)}>格式说明</button>
        {help && <aside className="sidecar-help"><p><strong>推导 / 补充</strong>支持 Markdown、公式、表格、图片、Mermaid 和 Callout。</p><p><strong>Python 实验</strong>支持一个或多个 Python Cell，在同一 Kernel 中运行。</p><a href="https://github.com/AaronChou313/tensornote/blob/main/skills/tensornote-knowledge-workspace/references/sidecars.md" target="_blank" rel="noreferrer">查看完整使用说明 ↗</a></aside>}
      </div>
      <footer>{existing && onDelete ? <Button variant="ghost" size="sm" onClick={() => { if (window.confirm(`确定删除“${existing.title}”吗？只会移除对应的 Sidecar 指令。`)) onDelete() }}><Trash size={14} />删除侧栏内容</Button> : <p>内容以可读 Markdown 指令保存。</p>}<span className="sidecar-footer-spacer" /><Button variant="ghost" size="sm" onClick={onClose}>取消</Button><Button variant="primary" size="sm" onClick={submit}>{existing ? '保存修改' : '插入'}</Button></footer>
    </section>
  </div>
}
