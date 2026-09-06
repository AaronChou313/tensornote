import { LinkSimple, List, ShareNetwork, SlidersHorizontal, X } from '@phosphor-icons/react'
import { useWorkbenchStore } from '../../workbench/useWorkbenchStore'
import { useWorkspaceStore } from '../../store/useWorkspaceStore'
import { ModalSurface } from '../ui/ModalSurface'
import { useNarrowViewport } from '../ui/useNarrowViewport'
import { KnowledgePanel } from '../KnowledgePanel'

export function WorkbenchRightSidebar({ noteId }: { noteId?: string }) {
  const { rightSidebar, rightView, setSidebar, setRightView, revealHeading } = useWorkbenchStore()
  const session = useWorkspaceStore((state) => state.session)
  const narrow = useNarrowViewport()
  if (!rightSidebar) return null
  const content = <>
    <header><div className="workbench-side-tabs"><button aria-pressed={rightView === 'properties'} className={rightView === 'properties' ? 'is-active' : ''} onClick={() => setRightView('properties')} aria-label="当前笔记属性"><SlidersHorizontal size={16} /></button><button aria-pressed={rightView === 'outline'} className={rightView === 'outline' ? 'is-active' : ''} onClick={() => setRightView('outline')} aria-label="当前笔记目录"><List size={16} /></button><button aria-pressed={rightView === 'backlinks'} className={rightView === 'backlinks' ? 'is-active' : ''} onClick={() => setRightView('backlinks')} aria-label="当前笔记反向链接"><LinkSimple size={16} /></button><button aria-pressed={rightView === 'graph'} className={rightView === 'graph' ? 'is-active' : ''} onClick={() => setRightView('graph')} aria-label="当前笔记图谱"><ShareNetwork size={16} /></button></div><button onClick={() => setSidebar('right', false)} aria-label="关闭右侧栏"><X size={16} /></button></header>
    {rightView === 'properties' && noteId ? <div className="workbench-properties"><span>Focused note · Markdown frontmatter</span>{Object.entries(session?.documentById.get(noteId)?.frontmatter ?? {}).map(([key, value]) => <div key={key}><small>{key}</small><strong>{Array.isArray(value) ? value.join(', ') : String(value ?? '—')}</strong></div>)}</div> : noteId ? <KnowledgePanel onNavigateHeading={(id) => { revealHeading(id); if (narrow) setSidebar('right', false) }} showNavigation={false} key={`${noteId}:${rightView}`} noteId={noteId} initialView={rightView === 'outline' ? 'outline' : rightView === 'backlinks' ? 'backlinks' : rightView === 'graph' ? 'graph' : 'links'} /> : <div className="workbench-right-sidebar__empty"><strong>Context</strong><p>选择一个阅读编辑区以查看属性、目录、链接和图谱。</p></div>}
  </>
  return narrow
    ? <ModalSurface open onOpenChange={(open) => setSidebar('right', open)} title="当前笔记上下文" layerClassName="workbench-context-layer" className="workbench-right-sidebar">{content}</ModalSurface>
    : <aside className="workbench-right-sidebar" aria-label="当前焦点笔记的上下文栏">{content}</aside>
}
