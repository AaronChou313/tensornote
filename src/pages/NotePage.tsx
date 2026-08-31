import { lazy, Suspense } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { MarkdownRenderer } from '../components/MarkdownRenderer'
import { NoteProgress } from '../components/NoteProgress'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import { useWorkbenchStore } from '../workbench/useWorkbenchStore'
import { WorkbenchRightSidebar } from '../components/workbench/WorkbenchRightSidebar'
import { WorkbenchPaneTabs } from '../components/workbench/WorkbenchTabs'
import type { Note } from '../types'
import type { WorkspaceProvider } from '../workspace/types'

const NoteEditor = lazy(() => import('../components/NoteEditor').then((module) => ({ default: module.NoteEditor })))

function ReadingSurface({ note, provider }: { note: Note; provider: WorkspaceProvider }) {
  const session = useWorkspaceStore((state) => state.session)
  return <main className="note-page note-page--knowledge"><div className="note-reading-layout"><article className="note-prose"><header className="note-header"><p className="note-section">{note.frontmatter.section}</p><h1>{note.frontmatter.title}</h1>{note.frontmatter.summary && <p className="note-summary">{note.frontmatter.summary}</p>}<div className="note-tags">{note.frontmatter.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></header><MarkdownRenderer content={note.renderedContent} labs={note.labs} documentTitle={note.frontmatter.title} documentPath={note.path} resolveAssetUrl={(path, fromDocument) => provider.resolveAssetUrl(path, fromDocument)} knowledgeIndex={session?.knowledgeIndex} noteId={note.id} /><NoteProgress noteId={`${session?.descriptor.id}:${note.id}`} hasLab={note.labs.length > 0} /></article></div></main>
}

export function NotePage() {
  const { noteId } = useParams()
  const session = useWorkspaceStore((state) => state.session)
  const provider = useWorkspaceStore((state) => state.provider)
  const note = noteId ? session?.documentById.get(noteId) : undefined
  const { panes, activePane, secondaryOpen, secondaryPosition, setActivePane } = useWorkbenchStore()

  if (!session || !provider) return <Navigate to="/" replace />
  if (noteId && !note) return <Navigate to="/workspace" replace />

  const main = panes.main ? session.documentById.get(panes.main) : note
  const secondary = secondaryOpen && panes.secondary ? session.documentById.get(panes.secondary) : undefined
  const showPane = (pane: 'main' | 'secondary', paneNote?: Note) => <section className="workbench-pane" data-active={activePane === pane} onMouseDown={() => setActivePane(pane)}>
    <WorkbenchPaneTabs pane={pane} />
    <div className="workbench-pane__content">{paneNote ? session.capabilities.write ? <Suspense fallback={<main className="route-status-page"><span className="workspace-spinner" /></main>}><NoteEditor key={`${pane}:${paneNote.path}`} note={paneNote} provider={provider} isActive={activePane === pane} /></Suspense> : <ReadingSurface note={paneNote} provider={provider} /> : <div className="workbench-pane-empty"><p>请选择一个笔记进行阅读或编辑</p></div>}</div>
  </section>
  return <div className={`workbench-panes ${secondaryOpen ? 'workbench-panes--split' : ''} ${secondaryPosition === 'left' ? 'workbench-panes--secondary-left' : ''}`}>
    {secondaryOpen && secondaryPosition === 'left' && showPane('secondary', secondary)}
    {showPane('main', main)}
    {secondaryOpen && secondaryPosition === 'right' && showPane('secondary', secondary)}
    <WorkbenchRightSidebar noteId={(activePane === 'secondary' ? secondary : main)?.id} />
  </div>
}
