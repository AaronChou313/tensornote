import { Navigate, useParams } from 'react-router-dom'
import { noteById } from '../content/notes'
import { MarkdownRenderer } from '../components/MarkdownRenderer'
import { NoteProgress } from '../components/NoteProgress'

export function NotePage() {
  const { noteId } = useParams()
  const note = noteId ? noteById.get(noteId) : undefined

  if (!note) return <Navigate to="/" replace />

  return (
    <main className="px-5 py-10 md:px-10 md:py-14">
      <article className="note-prose mx-auto max-w-[840px]">
        <header className="note-header">
          <p className="note-section">{note.frontmatter.section}</p>
          <h1>{note.frontmatter.title}</h1>
          {note.frontmatter.summary && <p className="note-summary">{note.frontmatter.summary}</p>}
          <div className="note-tags">
            {note.frontmatter.tags.map((tag) => <span key={tag}>{tag}</span>)}
          </div>
        </header>
        <MarkdownRenderer content={note.renderedContent} labs={note.labs} />
        <NoteProgress noteId={note.id} hasLab={note.labs.length > 0} />
      </article>
    </main>
  )
}
