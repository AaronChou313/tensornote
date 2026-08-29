import { ArrowRight, BracketsCurly, FileText, Flask, Tag } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { useWorkspaceStore } from '../store/useWorkspaceStore'

export function WorkspacePage() {
  const session = useWorkspaceStore((state) => state.session)
  if (!session) return null

  const labCount = session.documents.reduce((total, note) => total + note.labs.length, 0)
  const cellCount = session.documents.reduce((total, note) => total + note.labs.reduce((sum, lab) => sum + lab.cells.length, 0), 0)
  const tagCount = new Set(session.documents.flatMap((note) => note.frontmatter.tags)).size
  const recentDocuments = session.documents.slice(0, 8)

  return (
    <main className="workspace-overview">
      <div className="workspace-overview__inner">
        <header>
          <span className="workspace-kicker">Workspace</span>
          <h1>{session.manifest.workspace.name}</h1>
          <p>{session.manifest.workspace.description || '一个保持 Markdown 可移植性的 TensorNote Workspace。'}</p>
          <div className="source-line">
            <span className={`source-dot source-dot--${session.descriptor.type}`} />
            {session.descriptor.sourceLabel}
            {session.descriptor.detail && <span>· {session.descriptor.detail}</span>}
          </div>
        </header>

        <section className="workspace-stats" aria-label="Workspace 统计">
          <div><FileText size={19} /><strong>{session.documents.length}</strong><span>Documents</span></div>
          <div><Flask size={19} /><strong>{labCount}</strong><span>Labs</span></div>
          <div><BracketsCurly size={19} /><strong>{cellCount}</strong><span>Cells</span></div>
          <div><Tag size={19} /><strong>{tagCount}</strong><span>Tags</span></div>
        </section>

        <section className="workspace-documents">
          <div className="section-heading"><h2>Start reading</h2><span>{session.manifest.content.root || 'Workspace root'}</span></div>
          <div className="document-list">
            {recentDocuments.map((note) => (
              <Link key={note.id} to={`/notes/${note.id}`}>
                <span className="document-icon"><FileText size={17} /></span>
                <span><strong>{note.frontmatter.title}</strong><small>{note.frontmatter.summary || note.frontmatter.section}</small></span>
                <ArrowRight size={16} />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
