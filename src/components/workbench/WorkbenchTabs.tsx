import { ArrowLeft, ArrowRight, ColumnsPlusLeft, ColumnsPlusRight, PushPin, Sidebar, X } from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import { useWorkbenchStore, type PaneId } from '../../workbench/useWorkbenchStore'
import { useWorkspaceStore } from '../../store/useWorkspaceStore'

export function WorkbenchTabs() {
  const navigate = useNavigate()
  const session = useWorkspaceStore((state) => state.session)
  const { tabs, panes, activePane, secondaryOpen, secondaryPosition, closeTab, closePane, togglePin, split, goBack, goForward, setActivePane, setSidebar } = useWorkbenchStore()
  if (!session) return null

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
      navigate('/notes')
    }
  }
  const closePaneView = (pane: PaneId) => {
    const next = closePane(pane)
    navigate(next ? `/notes/${next}` : '/notes')
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
        )) : <span className="workbench-tabs__empty" />}
      </div>
      {panes[pane] && <button className="workbench-pane-tabs__pin" onClick={(event) => { event.stopPropagation(); togglePin(panes[pane]!, pane) }} aria-label="固定当前标签" title="固定标签"><PushPin size={15} /></button>}
      {(secondaryOpen || panes[pane]) && <button className="workbench-pane-tabs__close" onClick={(event) => { event.stopPropagation(); closePaneView(pane) }} aria-label={`关闭${pane === 'main' ? '左侧' : '右侧'}窗格`} title="关闭窗格"><X size={15} /></button>}
    </section>
  )

  const orderedPanes: PaneId[] = secondaryOpen && secondaryPosition === 'left' ? ['secondary', 'main'] : secondaryOpen ? ['main', 'secondary'] : ['main']
  return <nav className={`workbench-tabs ${secondaryOpen ? 'workbench-tabs--split' : ''}`} aria-label="打开的笔记">
    <div className="workbench-tabs__panes">{orderedPanes.map((pane) => <div key={pane}>{paneStrip(pane)}</div>)}</div>
    <div className="workbench-tabs__tools">
      <button onClick={() => split('left')} aria-label="向左拆分" title="向左拆分"><ColumnsPlusLeft size={16} /></button>
      <button onClick={() => split('right')} aria-label="向右拆分" title="向右拆分"><ColumnsPlusRight size={16} /></button>
      <button onClick={() => setSidebar('right', true)} aria-label="打开右侧栏" title="打开右侧栏"><Sidebar size={16} /></button>
    </div>
  </nav>
}
