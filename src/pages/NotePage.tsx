import { lazy, Suspense, useEffect, useRef } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { MarkdownRenderer } from '../components/MarkdownRenderer'
import { NoteProgress } from '../components/NoteProgress'
import { WorkbenchTabs } from '../components/workbench/WorkbenchTabs'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import { useWorkbenchStore } from '../workbench/useWorkbenchStore'
import { scrollToHeading } from '../workbench/headingNavigation'
import type { Note } from '../types'
import type { WorkspaceProvider } from '../workspace/types'

const NoteEditor = lazy(() => import('../components/NoteEditor').then((module) => ({ default: module.NoteEditor })))

function ReadingSurface({ note, provider }: { note: Note; provider: WorkspaceProvider }) {
  const session = useWorkspaceStore((state) => state.session)
  return <main className="note-page note-page--knowledge"><article className="note-prose"><header className="note-header"><p className="note-section">{note.frontmatter.section}</p><h1>{note.frontmatter.title}</h1>{note.frontmatter.summary && <p className="note-summary">{note.frontmatter.summary}</p>}<div className="note-tags">{note.frontmatter.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></header><MarkdownRenderer content={note.renderedContent} labs={note.labs} documentTitle={note.frontmatter.title} documentPath={note.path} resolveAssetUrl={(path, fromDocument) => provider.resolveAssetUrl(path, fromDocument)} knowledgeIndex={session?.knowledgeIndex} noteId={note.id} /><NoteProgress noteId={`${session?.descriptor.id}:${note.id}`} hasLab={note.labs.length > 0} /></article></main>
}

export function NotePage() {
  const { noteId } = useParams()
  const session = useWorkspaceStore((state) => state.session)
  const provider = useWorkspaceStore((state) => state.provider)
  const headingRequest = useWorkbenchStore((state) => state.headingRequest)
  const activeNoteId = useWorkbenchStore((state) => state.activeNoteId)
  const root = useRef<HTMLDivElement>(null)
  const requested = noteId ? session?.documentById.get(noteId) : undefined
  const note = requested ?? (activeNoteId ? session?.documentById.get(activeNoteId) : undefined)

  useEffect(() => { if (headingRequest && root.current) scrollToHeading(root.current, headingRequest.id) }, [headingRequest])

  if (!session || !provider) return <Navigate to="/" replace />
  if (noteId && !requested) return <Navigate to="/workspace" replace />

  return <div ref={root} className="workbench-panes workbench-panes--single">
    <section className="workbench-pane"><WorkbenchTabs /><div className="workbench-pane__content">{note ? session.capabilities.write ? <Suspense fallback={<main className="route-status-page"><span className="workspace-spinner" /></main>}><NoteEditor key={note.path} note={note} provider={provider} isActive /></Suspense> : <ReadingSurface note={note} provider={provider} /> : <div className="workbench-pane-empty"><p>请选择一个笔记进行阅读或编辑</p></div>}</div></section>
  </div>
}
