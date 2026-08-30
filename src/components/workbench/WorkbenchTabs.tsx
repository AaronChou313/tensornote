import { ArrowBendDownLeft, ArrowBendUpRight, ArrowLeft, ArrowRight, PushPin, SidebarSimple, X } from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import { useWorkbenchStore } from '../../workbench/useWorkbenchStore'
import { useWorkspaceStore } from '../../store/useWorkspaceStore'

export function WorkbenchTabs() {
  const navigate = useNavigate()
  const session = useWorkspaceStore((state) => state.session)
  const { tabs, panes, activePane, secondaryOpen, closeTab, togglePin, split, closeSecondary, goBack, goForward, setSidebar } = useWorkbenchStore()
  if (!session || !tabs.length) return null
  const open = (noteId: string, pane = activePane) => { useWorkbenchStore.getState().openNote(noteId, session.documentById.get(noteId)?.frontmatter.title || noteId, pane); navigate(`/notes/${noteId}`) }
  const navigateHistory = (next: string | null) => { if (next) navigate(`/notes/${next}`) }
  const close = (noteId: string) => { const fallback = closeTab(noteId); navigate(fallback ? `/notes/${fallback}` : '/workspace') }
  return <nav className="workbench-tabs" aria-label="打开的笔记">
    <div className="workbench-tabs__history"><button onClick={() => navigateHistory(goBack())} aria-label="后退"><ArrowLeft size={15} /></button><button onClick={() => navigateHistory(goForward())} aria-label="前进"><ArrowRight size={15} /></button></div>
    <div className="workbench-tabs__list">{tabs.map((tab) => <div key={tab.noteId} className={`workbench-tab ${panes[activePane] === tab.noteId ? 'is-active' : ''}`}>
      <button onClick={() => open(tab.noteId)} title={tab.title}>{tab.pinned && <PushPin size={12} weight="fill" />}{tab.title}</button>{!tab.pinned && <button onClick={() => close(tab.noteId)} aria-label={`关闭 ${tab.title}`} title="Close tab"><X size={13} /></button>}
    </div>)}</div>
    <div className="workbench-tabs__tools"><button onClick={() => togglePin(panes[activePane] || '')} aria-label="固定当前标签" title="Pin tab"><PushPin size={15} /></button><button onClick={() => split('left')} aria-label="向左拆分" title="Split left"><SidebarSimple size={15} /></button><button onClick={() => split('right')} aria-label="向右拆分" title="Split right"><SidebarSimple size={15} /></button>{secondaryOpen && <button onClick={closeSecondary} aria-label="关闭次窗格"><ArrowBendDownLeft size={15} /></button>}<button onClick={() => setSidebar('right', true)} aria-label="打开右侧栏"><ArrowBendUpRight size={15} /></button></div>
  </nav>
}
