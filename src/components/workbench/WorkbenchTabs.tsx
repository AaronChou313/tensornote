import { ArrowLeft, ArrowRight, ColumnsPlusLeft, ColumnsPlusRight, PushPin, Sidebar, X } from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import { useWorkbenchStore, type PaneId } from '../../workbench/useWorkbenchStore'
import { useWorkspaceStore } from '../../store/useWorkspaceStore'

export function WorkbenchTopTools() {
  const { split, setSidebar, activeView } = useWorkbenchStore()
  if (activeView) return null
  return <div className="workbench-top-tools" aria-label="当前阅读编辑区操作">
    <button onClick={() => split('left')} aria-label="向左拆分当前窗格" title="向左拆分当前窗格"><ColumnsPlusLeft size={17} /></button>
    <button onClick={() => split('right')} aria-label="向右拆分当前窗格" title="向右拆分当前窗格"><ColumnsPlusRight size={17} /></button>
    <button onClick={() => setSidebar('right', true)} aria-label="打开当前笔记上下文栏" title="打开当前笔记上下文栏"><Sidebar size={17} /></button>
  </div>
}

export function WorkbenchPaneTabs({ pane }: { pane: PaneId }) {
  const navigate = useNavigate()
  const session = useWorkspaceStore((state) => state.session)
  const { tabs, panes, activePane, secondaryOpen, closeTab, closePane, togglePin, goBack, goForward, setActivePane } = useWorkbenchStore()
  if (!session) return null

  const activatePane = () => {
    setActivePane(pane)
    const noteId = panes[pane]
    if (noteId) navigate(`/notes/${noteId}`)
  }
  const open = (noteId: string) => {
    const note = session.documentById.get(noteId)
    useWorkbenchStore.getState().openNote(noteId, note?.frontmatter.title || noteId, pane)
    navigate(`/notes/${noteId}`)
  }
  const navigateHistory = (next: string | null) => {
    if (!next) return
    setActivePane(pane)
    navigate(`/notes/${next}`)
  }
  const close = (noteId: string) => {
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
    } else navigate('/notes')
  }
  const closePaneView = () => {
    const next = closePane(pane)
    navigate(next ? `/notes/${next}` : '/notes')
  }

  return <section className={`workbench-pane-tabs ${activePane === pane ? 'is-active' : ''}`} data-pane={pane} onMouseDown={activatePane}>
    <div className="workbench-tabs__history">
      <button onClick={(event) => { event.stopPropagation(); navigateHistory(goBack(pane)) }} aria-label={`${pane === 'main' ? '左侧' : '右侧'}窗格后退`}><ArrowLeft size={15} /></button>
      <button onClick={(event) => { event.stopPropagation(); navigateHistory(goForward(pane)) }} aria-label={`${pane === 'main' ? '左侧' : '右侧'}窗格前进`}><ArrowRight size={15} /></button>
    </div>
    <div className="workbench-tabs__list">
      {tabs[pane].length ? tabs[pane].map((tab) => (
        <div key={tab.noteId} className={`workbench-tab ${panes[pane] === tab.noteId ? 'is-active' : ''}`}>
          <button onClick={(event) => { event.stopPropagation(); open(tab.noteId) }} title={session.documentById.get(tab.noteId)?.path || tab.title}>{tab.pinned && <PushPin size={12} weight="fill" />}{tab.title}</button>
          {!tab.pinned && <button onClick={(event) => { event.stopPropagation(); close(tab.noteId) }} aria-label={`关闭 ${tab.title}`} title="关闭标签"><X size={13} /></button>}
        </div>
      )) : <span className="workbench-tabs__empty" />}
    </div>
    {panes[pane] && <button className="workbench-pane-tabs__pin" onClick={(event) => { event.stopPropagation(); togglePin(panes[pane]!, pane) }} aria-label="固定当前标签" title="固定标签"><PushPin size={15} /></button>}
    {(secondaryOpen || panes[pane]) && <button className="workbench-pane-tabs__close" onClick={(event) => { event.stopPropagation(); closePaneView() }} aria-label={`关闭${pane === 'main' ? '左侧' : '右侧'}窗格`} title="关闭窗格"><X size={15} /></button>}
  </section>
}

/** @deprecated Tabs now live inside their corresponding Pane. */
export function WorkbenchTabs() {
  return null
}
