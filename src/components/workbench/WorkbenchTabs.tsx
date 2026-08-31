import { ArrowBendDownLeft, ArrowBendUpRight, ArrowLeft, ArrowRight, PushPin, SidebarSimple, X } from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import { useWorkbenchStore, type PaneId } from '../../workbench/useWorkbenchStore'
import { useWorkspaceStore } from '../../store/useWorkspaceStore'

export function WorkbenchTabs() {
  const navigate = useNavigate()
  const session = useWorkspaceStore((state) => state.session)
  const { tabs, panes, activePane, secondaryOpen, secondaryPosition, closeTab, togglePin, split, closeSecondary, goBack, goForward, setActivePane, setSidebar } = useWorkbenchStore()
  if (!session || (!tabs.main.length && !secondaryOpen)) return null

  const open = (noteId: string, pane: PaneId) => {
    const note = session.documentById.get(noteId)
    useWorkbenchStore.getState().openNote(noteId, note?.frontmatter.title || noteId, pane)
    navigate(`/notes/${noteId}`)
  }
  const activatePane = (pane: PaneId) => {
    setActivePane(pane)
    const noteId = panes[pane]
    if (noteId) navigate(`/notes/${noteId}`)
  }
  const navigateHistory = (pane: PaneId, next: string | null) => {
    if (!next) return
    setActivePane(pane)
    navigate(`/notes/${next}`)
  }
  const close = (noteId: string, pane: PaneId) => {
    const fallback = closeTab(noteId, pane)
    if (fallback) {
      setActivePane(pane)
      navigate(`/notes/${fallback}`)
      return
    }
    const otherPane: PaneId = pane === 'main' ? 'secondary' : 'main'
    const otherNote = useWorkbenchStore.getState().panes[otherPane]
    if (otherNote) {
      setActivePane(otherPane)
      navigate(`/notes/${otherNote}`)
    } else {
      navigate('/workspace')
    }
  }

  const paneStrip = (pane: PaneId) => (
    <section className={`workbench-pane-tabs ${activePane === pane ? 'is-active' : ''}`} data-pane={pane} onMouseDown={() => activatePane(pane)}>
      <div className="workbench-tabs__history">
        <button onClick={(event) => { event.stopPropagation(); navigateHistory(pane, goBack(pane)) }} aria-label={`${pane === 'main' ? '左侧' : '右侧'}窗格后退`}><ArrowLeft size={15} /></button>
        <button onClick={(event) => { event.stopPropagation(); navigateHistory(pane, goForward(pane)) }} aria-label={`${pane === 'main' ? '左侧' : '右侧'}窗格前进`}><ArrowRight size={15} /></button>
      </div>
      <div className="workbench-tabs__list">
        {tabs[pane].length ? tabs[pane].map((tab) => (
          <div key={tab.noteId} className={`workbench-tab ${panes[pane] === tab.noteId ? 'is-active' : ''}`}>
            <button onClick={(event) => { event.stopPropagation(); open(tab.noteId, pane) }} title={tab.title}>{tab.pinned && <PushPin size={12} weight="fill" />}{tab.title}</button>
            {!tab.pinned && <button onClick={(event) => { event.stopPropagation(); close(tab.noteId, pane) }} aria-label={`关闭 ${tab.title}`} title="关闭标签"><X size={13} /></button>}
          </div>
        )) : <button className="workbench-tabs__empty" onClick={() => activatePane(pane)}>从侧栏选择一篇笔记</button>}
      </div>
      {panes[pane] && <button className="workbench-pane-tabs__pin" onClick={(event) => { event.stopPropagation(); togglePin(panes[pane]!, pane) }} aria-label="固定当前标签" title="固定标签"><PushPin size={15} /></button>}
    </section>
  )

  const orderedPanes: PaneId[] = secondaryOpen && secondaryPosition === 'left' ? ['secondary', 'main'] : secondaryOpen ? ['main', 'secondary'] : ['main']
  return <nav className={`workbench-tabs ${secondaryOpen ? 'workbench-tabs--split' : ''}`} aria-label="打开的笔记">
    <div className="workbench-tabs__panes">{orderedPanes.map((pane) => <div key={pane}>{paneStrip(pane)}</div>)}</div>
    <div className="workbench-tabs__tools">
      <button onClick={() => split('left')} aria-label="向左拆分" title="向左拆分"><SidebarSimple size={15} /></button>
      <button onClick={() => split('right')} aria-label="向右拆分" title="向右拆分"><SidebarSimple size={15} /></button>
      {secondaryOpen && <button onClick={closeSecondary} aria-label="关闭次窗格" title="关闭次窗格"><ArrowBendDownLeft size={15} /></button>}
      <button onClick={() => setSidebar('right', true)} aria-label="打开右侧栏" title="打开右侧栏"><ArrowBendUpRight size={15} /></button>
    </div>
  </nav>
}
