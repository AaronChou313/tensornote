import { useEffect, useState } from 'react'
import { Flask, Function as FunctionIcon, Plus, Trash, X } from '@phosphor-icons/react'
import { createSidecarDirective } from '../sidecar/parser'
import type { SidecarType } from '../sidecar/types'
import { Button } from './ui/Button'

interface DraftCell { key: number; title: string; code: string }

export function LabInsertDialog({ initialCode, onInsert, onClose }: { initialCode: string; onInsert: (markdown: string) => void; onClose: () => void }) {
  const [type, setType] = useState<SidecarType>('jupyter')
  const [id, setId] = useState('python-experiment')
  const [title, setTitle] = useState('Python 实验')
  const [derivation, setDerivation] = useState(initialCode)
  const [cells, setCells] = useState<DraftCell[]>([{ key: 1, title: '准备数据', code: initialCode }])

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  const updateCell = (key: number, patch: Partial<DraftCell>) => setCells((current) => current.map((cell) => cell.key === key ? { ...cell, ...patch } : cell))
  const addCell = () => setCells((current) => [...current, { key: Math.max(0, ...current.map((cell) => cell.key)) + 1, title: `Cell ${current.length + 1}`, code: '' }])
  const body = type === 'derivation' ? derivation : cells.map((cell) => `\`\`\`python title="${cell.title.replaceAll('"', "'")}"\n${cell.code.trimEnd() || '# 在这里编写 Python 代码'}\n\`\`\``).join('\n\n')
  const submit = () => onInsert(createSidecarDirective({ type, id, title, body }))

  return <div className="lab-insert-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="lab-insert-dialog" role="dialog" aria-modal="true" aria-labelledby="sidecar-insert-title">
      <header><span>{type === 'jupyter' ? <Flask size={20} /> : <FunctionIcon size={20} />}</span><div><h2 id="sidecar-insert-title">插入 Sidecar</h2><p>把详细推导或可执行代码放在正文旁，需要时展开。</p></div><Button variant="ghost" size="icon" onClick={onClose} aria-label="关闭"><X size={18} /></Button></header>
      <div className="lab-insert-dialog__body">
        <div className="lab-insert-basics">
          <label><span>类型</span><select value={type} onChange={(event) => { const next = event.target.value as SidecarType; setType(next); setId(next === 'jupyter' ? 'python-experiment' : 'derivation'); setTitle(next === 'jupyter' ? 'Python 实验' : '完整推导') }} aria-label="Sidecar 类型"><option value="jupyter">Jupyter</option><option value="derivation">Derivation</option></select></label>
          <label><span>标识</span><input value={id} onChange={(event) => setId(event.target.value)} aria-label="Sidecar 标识" /></label>
          <label><span>标题</span><input value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Sidecar 标题" /></label>
        </div>
        {type === 'derivation' ? <label><span>Markdown 推导</span><textarea value={derivation} onChange={(event) => setDerivation(event.target.value)} rows={12} aria-label="Markdown 推导" /></label> : <><div className="lab-insert-cells__heading"><div><strong>Python Cell</strong><small>多个 Cell 共享当前 Kernel。</small></div><Button variant="secondary" size="sm" onClick={addCell}><Plus size={14} />添加 Cell</Button></div><div className="lab-insert-cells">{cells.map((cell, index) => <section className="lab-insert-cell" key={cell.key}><header><span>Cell {index + 1}</span>{cells.length > 1 && <button type="button" onClick={() => setCells((current) => current.filter((item) => item.key !== cell.key))} aria-label={`删除 Cell ${index + 1}`}><Trash size={15} /></button>}</header><label><span>标题</span><input value={cell.title} onChange={(event) => updateCell(cell.key, { title: event.target.value })} aria-label={`Cell ${index + 1} 标题`} /></label><label><span>Python 代码</span><textarea value={cell.code} onChange={(event) => updateCell(cell.key, { code: event.target.value })} rows={5} aria-label={`Cell ${index + 1} Python 代码`} /></label></section>)}</div></>}
      </div>
      <footer><p>内容以可读 Markdown 指令保存。</p><Button variant="ghost" size="sm" onClick={onClose}>取消</Button><Button variant="primary" size="sm" onClick={submit}>插入 Sidecar</Button></footer>
    </section>
  </div>
}
