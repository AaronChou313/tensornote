import { lazy, Suspense, useLayoutEffect, useRef } from 'react'
import { Navigate, useLocation, useParams } from 'react-router-dom'
import { MarkdownRenderer } from '../components/MarkdownRenderer'
import { NoteProgress } from '../components/NoteProgress'
import { WorkbenchTabs } from '../components/workbench/WorkbenchTabs'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import { useWorkbenchStore } from '../workbench/useWorkbenchStore'
import { restoreNoteScroll, scrollToHeading } from '../workbench/headingNavigation'
import type { Note } from '../types'
import type { WorkspaceProvider } from '../workspace/types'

const NoteEditor = lazy(() => import('../components/NoteEditor').then((module) => ({ default: module.NoteEditor })))

function ReadingSurface({ note, provider }: { note: Note; provider: WorkspaceProvider }) {
  const session = useWorkspaceStore((state) => state.session)
  return <main className="note-page note-page--knowledge"><article className="note-prose"><header className="note-header"><p className="note-section">{note.frontmatter.section}</p><h1>{note.frontmatter.title}</h1>{note.frontmatter.summary && <p className="note-summary">{note.frontmatter.summary}</p>}<div className="note-tags">{note.frontmatter.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></header><MarkdownRenderer content={note.renderedContent} labs={note.labs} sidecars={note.sidecars} documentTitle={note.frontmatter.title} documentPath={note.path} resolveAssetUrl={(path, fromDocument) => provider.resolveAssetUrl(path, fromDocument)} knowledgeIndex={session?.knowledgeIndex} noteId={note.id} /><NoteProgress noteId={`${session?.descriptor.id}:${note.id}`} hasLab={note.labs.length > 0} /></article></main>
}

export function NotePage() {
  const { noteId } = useParams()
  const location = useLocation()
  const session = useWorkspaceStore((state) => state.session)
  const provider = useWorkspaceStore((state) => state.provider)
  const headingRequest = useWorkbenchStore((state) => state.headingRequest)
  const activeNoteId = useWorkbenchStore((state) => state.activeNoteId)
  const contentRef = useRef<HTMLDivElement>(null)
  const activeScrollNoteRef = useRef<string | null>(null)
  const scrollFrameRef = useRef<number | null>(null)
  const requested = noteId ? session?.documentById.get(noteId) : undefined
  const note = requested ?? (activeNoteId ? session?.documentById.get(activeNoteId) : undefined)

  useLayoutEffect(() => {
    const container = contentRef.current
    const nextNoteId = note?.id ?? null
    const previousNoteId = activeScrollNoteRef.current
    if (container && previousNoteId && previousNoteId !== nextNoteId) {
      useWorkbenchStore.getState().saveNoteScroll(previousNoteId, container.scrollTop)
    }
    activeScrollNoteRef.current = nextNoteId
    if (!container || !nextNoteId) return
    let routeHeading = location.hash.slice(1)
    try { routeHeading = decodeURIComponent(routeHeading) } catch { /* Keep malformed fragments inert. */ }
    restoreNoteScroll(container, useWorkbenchStore.getState().getNoteScroll(nextNoteId), routeHeading || undefined)
  }, [note?.id, location.hash])

  useLayoutEffect(() => {
    const container = contentRef.current
    if (headingRequest && container) scrollToHeading(container, headingRequest.id)
  }, [headingRequest])

  useLayoutEffect(() => () => {
    if (scrollFrameRef.current !== null) cancelAnimationFrame(scrollFrameRef.current)
    const container = contentRef.current
    const noteIdToSave = activeScrollNoteRef.current
    if (container && noteIdToSave) useWorkbenchStore.getState().saveNoteScroll(noteIdToSave, container.scrollTop)
  }, [])

  const recordScroll = () => {
    if (scrollFrameRef.current !== null) return
    scrollFrameRef.current = requestAnimationFrame(() => {
      scrollFrameRef.current = null
      const container = contentRef.current
      const currentNoteId = activeScrollNoteRef.current
      if (container && currentNoteId) useWorkbenchStore.getState().saveNoteScroll(currentNoteId, container.scrollTop)
    })
  }

  if (!session || !provider) return <Navigate to="/" replace />
  if (noteId && !requested) return <Navigate to="/workspace" replace />

  return <div className="workbench-panes workbench-panes--single">
    <section className="workbench-pane"><WorkbenchTabs /><div ref={contentRef} className="workbench-pane__content" onScroll={recordScroll}>{note ? session.capabilities.write ? <Suspense fallback={<main className="route-status-page"><span className="workspace-spinner" /></main>}><NoteEditor key={note.path} note={note} provider={provider} isActive /></Suspense> : <ReadingSurface note={note} provider={provider} /> : <div className="workbench-pane-empty"><p>请选择一个笔记进行阅读或编辑</p></div>}</div></section>
  </div>
}
