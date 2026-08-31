import { useEffect, useState } from 'react'
import { Flask, Plus, Trash, X } from '@phosphor-icons/react'
import { createExecutableLabMarkdown } from '../content/labParser'
import type { LabCell } from '../types'
import { Button } from './ui/Button'

interface DraftCell {
  key: number
  title: string
  code: string
}

export function LabInsertDialog({ initialCode, onInsert, onClose }: { initialCode: string; onInsert: (markdown: string) => void; onClose: () => void }) {
  const [labId, setLabId] = useState('python-experiment')
  const [difficulty, setDifficulty] = useState<LabCell['difficulty']>('basic')
  const [cells, setCells] = useState<DraftCell[]>([{ key: 1, title: '准备数据', code: initialCode }])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  const updateCell = (key: number, patch: Partial<DraftCell>) => setCells((current) => current.map((cell) => cell.key === key ? { ...cell, ...patch } : cell))
  const addCell = () => setCells((current) => {
    const key = Math.max(0, ...current.map((cell) => cell.key)) + 1
    return [...current, { key, title: `Cell ${current.length + 1}`, code: '' }]
  })
  const removeCell = (key: number) => setCells((current) => current.filter((cell) => cell.key !== key))
  const submit = () => {
    try {
      onInsert(createExecutableLabMarkdown({ id: labId, difficulty, cells }))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '无法创建实验代码')
    }
  }

  return <div className="lab-insert-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="lab-insert-dialog" role="dialog" aria-modal="true" aria-labelledby="lab-insert-title">
      <header>
        <span><Flask size={20} weight="duotone" /></span>
        <div><h2 id="lab-insert-title">插入可执行实验</h2><p>同一实验标识下的多个 Cell 会组合成一张实验卡，并共享当前 Kernel。</p></div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="关闭插入实验窗口"><X size={18} /></Button>
      </header>
      <div className="lab-insert-dialog__body">
        <div className="lab-insert-basics">
          <label><span>实验标识</span><input value={labId} onChange={(event) => setLabId(event.target.value)} placeholder="loss-curves" aria-label="实验标识" autoFocus /><small>使用英文、数字和连字符；它也会生成实验卡标题。</small></label>
          <label><span>运行级别</span><select value={difficulty} onChange={(event) => setDifficulty(event.target.value as LabCell['difficulty'])} aria-label="运行级别"><option value="basic">基础</option><option value="medium">进阶</option><option value="heavy">重型</option></select></label>
        </div>
        <div className="lab-insert-cells__heading"><div><strong>实验 Cell</strong><small>每个 Cell 会写成一个带 TensorNote 元数据的 Python 代码块。</small></div><Button variant="secondary" size="sm" onClick={addCell}><Plus size={14} />添加 Cell</Button></div>
        <div className="lab-insert-cells">
          {cells.map((cell, index) => <section className="lab-insert-cell" key={cell.key}>
            <header><span>Cell {index + 1}</span>{cells.length > 1 && <button type="button" onClick={() => removeCell(cell.key)} aria-label={`删除 Cell ${index + 1}`} title="删除 Cell"><Trash size={15} /></button>}</header>
            <label><span>标题</span><input value={cell.title} onChange={(event) => updateCell(cell.key, { title: event.target.value })} placeholder={`Cell ${index + 1}`} aria-label={`Cell ${index + 1} 标题`} /></label>
            <label><span>Python 代码</span><textarea value={cell.code} onChange={(event) => updateCell(cell.key, { code: event.target.value })} rows={5} placeholder="# 在这里编写 Python 代码" aria-label={`Cell ${index + 1} Python 代码`} spellCheck={false} /></label>
          </section>)}
        </div>
        {error && <p className="lab-insert-error" role="alert">{error}</p>}
      </div>
      <footer><p>插入后可从笔记中的实验卡打开、运行和继续编辑所有 Cell。</p><Button variant="ghost" size="sm" onClick={onClose}>取消</Button><Button variant="primary" size="sm" onClick={submit}><Flask size={15} />插入实验</Button></footer>
    </section>
  </div>
}
