import { Navigate, useParams } from 'react-router-dom'
import { MarkdownRenderer } from '../components/MarkdownRenderer'
import { NoteProgress } from '../components/NoteProgress'
import { useWorkspaceStore } from '../store/useWorkspaceStore'

export function NotePage() {
  const { noteId } = useParams()
  const session = useWorkspaceStore((state) => state.session)
  const provider = useWorkspaceStore((state) => state.provider)
  const note = noteId ? session?.documentById.get(noteId) : undefined

  if (!session || !provider) return <Navigate to="/" replace />
  if (!note) return <Navigate to="/workspace" replace />

  return (
    <main className="note-page">
      <article className="note-prose">
        <header className="note-header">
          <p className="note-section">{note.frontmatter.section}</p>
          <h1>{note.frontmatter.title}</h1>
          {note.frontmatter.summary && <p className="note-summary">{note.frontmatter.summary}</p>}
          <div className="note-tags">
            {note.frontmatter.tags.map((tag) => <span key={tag}>{tag}</span>)}
          </div>
        </header>
        <MarkdownRenderer
          content={note.renderedContent}
          labs={note.labs}
          documentPath={note.path}
          resolveAssetUrl={(path) => provider.resolveAssetUrl(path, note.path)}
        />
        <NoteProgress noteId={`${session.descriptor.id}:${note.id}`} hasLab={note.labs.length > 0} />
      </article>
    </main>
  )
}
