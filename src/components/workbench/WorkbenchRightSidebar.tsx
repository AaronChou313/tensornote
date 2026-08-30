import { Flask, LinkSimple, List, ShareNetwork, SlidersHorizontal, X } from '@phosphor-icons/react'
import { useAppStore } from '../../store/useAppStore'
import { useWorkbenchStore } from '../../workbench/useWorkbenchStore'
import { useWorkspaceStore } from '../../store/useWorkspaceStore'
import { KnowledgePanel } from '../KnowledgePanel'
import { useComputeStore } from '../../store/useComputeStore'

export function WorkbenchRightSidebar({ noteId }: { noteId?: string }) {
  const { rightSidebar, rightView, setSidebar, setRightView } = useWorkbenchStore()
  const setActiveLabId = useAppStore((state) => state.setActiveLabId)
  const setScratchOpen = useComputeStore((state) => state.setScratchOpen)
  const session = useWorkspaceStore((state) => state.session)
  if (!rightSidebar) return null
  return <aside className="workbench-right-sidebar" aria-label="工作台右侧栏">
    <header><div className="workbench-side-tabs"><button className={rightView === 'properties' ? 'is-active' : ''} onClick={() => setRightView('properties')} aria-label="属性"><SlidersHorizontal size={16} /></button><button className={rightView === 'outline' ? 'is-active' : ''} onClick={() => setRightView('outline')} aria-label="目录"><List size={16} /></button><button className={rightView === 'backlinks' ? 'is-active' : ''} onClick={() => setRightView('backlinks')} aria-label="反向链接"><LinkSimple size={16} /></button><button className={rightView === 'graph' ? 'is-active' : ''} onClick={() => setRightView('graph')} aria-label="图谱"><ShareNetwork size={16} /></button><button onClick={() => { const lab = noteId ? session?.documentById.get(noteId)?.labs[0] : undefined; setRightView('lab'); setScratchOpen(!lab); setActiveLabId(lab?.id ?? null) }} aria-label="Python Lab"><Flask size={16} /></button></div><button onClick={() => setSidebar('right', false)} aria-label="关闭右侧栏"><X size={16} /></button></header>
    {rightView === 'lab' ? <div className="workbench-right-sidebar__empty"><Flask size={20} /><strong>Python Lab</strong><p>{noteId && session?.documentById.get(noteId)?.labs[0] ? '已打开当前笔记的第一个 Lab。' : '当前笔记没有 Lab，已打开 Scratch。'}</p></div> : rightView === 'properties' && noteId ? <div className="workbench-properties"><span>Markdown frontmatter</span>{Object.entries(session?.documentById.get(noteId)?.frontmatter ?? {}).map(([key, value]) => <div key={key}><small>{key}</small><strong>{Array.isArray(value) ? value.join(', ') : String(value || '—')}</strong></div>)}</div> : noteId ? <KnowledgePanel key={`${noteId}:${rightView}`} noteId={noteId} initialView={rightView === 'outline' ? 'outline' : rightView === 'backlinks' ? 'backlinks' : rightView === 'graph' ? 'graph' : 'links'} /> : <div className="workbench-right-sidebar__empty"><strong>Context</strong><p>打开一篇笔记以查看属性、目录、链接和图谱。</p></div>}
  </aside>
}
