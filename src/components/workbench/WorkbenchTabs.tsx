import { useLayoutEffect, useRef } from 'react'
import { ArrowLeft, ArrowRight, X } from '@phosphor-icons/react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useWorkbenchStore } from '../../workbench/useWorkbenchStore'
import { useWorkspaceStore } from '../../store/useWorkspaceStore'

export function WorkbenchTopTools() { return null }

export function WorkbenchTabs() {
  const navigate = useNavigate()
  const location = useLocation()
  const session = useWorkspaceStore((state) => state.session)
  const { tabs, activeNoteId, leftSidebar, closeTab, goBack, goForward, history, historyIndex } = useWorkbenchStore()
  const tabList = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const list = tabList.current
    const active = list?.querySelector<HTMLElement>('.workbench-tab.is-active')
    active?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [activeNoteId, leftSidebar, tabs.length])
  if (!session) return null

  const open = (noteId: string) => {
    const note = session.documentById.get(noteId)
    useWorkbenchStore.getState().openNote(noteId, note?.frontmatter.title || noteId)
    const route = `/notes/${encodeURIComponent(noteId)}`
    if (location.pathname !== route) navigate(route)
  }
  const close = (noteId: string) => {
    const fallback = closeTab(noteId)
    navigate(fallback ? `/notes/${encodeURIComponent(fallback)}` : '/notes')
  }
  const navigateHistory = (next: string | null) => { if (next) { const route = `/notes/${encodeURIComponent(next)}`; if (location.pathname !== route) navigate(route) } }

  return <section className="workbench-pane-tabs is-active">
    <div className="workbench-tabs__history"><button onClick={() => navigateHistory(goBack())} aria-label="后退" title="后退" disabled={historyIndex <= 0}><ArrowLeft size={16} /></button><button onClick={() => navigateHistory(goForward())} aria-label="前进" title="前进" disabled={historyIndex < 0 || historyIndex >= history.length - 1}><ArrowRight size={16} /></button></div>
    <div className="workbench-tabs__list" ref={tabList} aria-label="笔记标签">{tabs.map((tab) => <div key={tab.noteId} className={`workbench-tab ${activeNoteId === tab.noteId ? 'is-active' : ''}`}><button onClick={() => open(tab.noteId)} aria-pressed={activeNoteId === tab.noteId} title={session.documentById.get(tab.noteId)?.path || tab.title}><span>{tab.title}</span></button><button onClick={() => close(tab.noteId)} aria-label={`关闭 ${tab.title}`} title="关闭标签"><X size={13} /></button></div>)}</div>
  </section>
}
