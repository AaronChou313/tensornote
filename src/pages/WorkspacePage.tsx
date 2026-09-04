import { ArrowRight, BracketsCurly, FilePlus, FileText, Flask, ShareNetwork, Tag, WarningCircle } from '@phosphor-icons/react'
import { Link, useNavigate } from 'react-router-dom'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import { createDocumentTemplate } from '../content/document'
import { joinWorkspacePath } from '../workspace/path'
import { Button } from '../components/ui/Button'
import { WorkspaceImage } from '../components/WorkspaceImage'

export function WorkspacePage() {
  const navigate = useNavigate()
  const session = useWorkspaceStore((state) => state.session)
  const createNote = useWorkspaceStore((state) => state.createNote)
  if (!session) return null

  const labCount = session.documents.reduce((total, note) => total + note.labs.length, 0)
  const cellCount = session.documents.reduce((total, note) => total + note.labs.reduce((sum, lab) => sum + lab.cells.length, 0), 0)
  const tagCount = new Set(session.documents.flatMap((note) => note.frontmatter.tags)).size
  const recentDocuments = session.documents.slice(0, 8)

  const createFirstNote = async () => {
    const path = joinWorkspacePath(session.manifest.content.root, 'welcome.md')
    const note = await createNote(path, createDocumentTemplate('welcome', 'Welcome'))
    navigate(`/notes/${note.id}`)
  }

  return (
    <main className="workspace-overview">
      <div className="workspace-overview__inner">
        <header>
          {session.manifest.publishing.logo && <div className="workspace-public-logo"><WorkspaceImage src={session.manifest.publishing.logo} alt="" documentPath="tensornote.yaml" resolveAssetUrl={useWorkspaceStore.getState().provider?.resolveAssetUrl.bind(useWorkspaceStore.getState().provider)} /></div>}
          <span className="workspace-kicker">Workspace</span>
          <h1>{session.manifest.publishing.title || session.manifest.workspace.name}</h1>
          <p>{session.manifest.publishing.description || session.manifest.workspace.description || '一个保持 Markdown 可移植性的 TensorNote Workspace。'}</p>
          <div className="source-line">
            <span className={`source-dot source-dot--${session.descriptor.type}`} />
            {session.descriptor.sourceLabel}
            {session.descriptor.detail && <span>· {session.descriptor.detail}</span>}
          </div>
        </header>

        {session.compatibility.warnings.length > 0 && <section className="workspace-compatibility" role="status">
          <WarningCircle size={19} weight="duotone" />
          <div><strong>{session.compatibility.status === 'future' ? 'Compatibility mode' : 'Workspace migrated in memory'}</strong>{session.compatibility.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div>
        </section>}

        <section className="workspace-stats" aria-label="Workspace 统计">
          <div><FileText size={19} /><strong>{session.documents.length}</strong><span>Documents</span></div>
          <div><Flask size={19} /><strong>{labCount}</strong><span>Labs</span></div>
          <div><BracketsCurly size={19} /><strong>{cellCount}</strong><span>Cells</span></div>
          <div><Tag size={19} /><strong>{tagCount}</strong><span>Tags</span></div>
        </section>

        <section className="workspace-documents">
          <div className="section-heading"><h2>Start reading</h2><span>{session.manifest.content.root || 'Workspace root'}</span></div>
          <div className="document-list">
            {recentDocuments.length ? recentDocuments.map((note) => (
              <Link key={note.id} to={`/notes/${note.id}`}>
                <span className="document-icon"><FileText size={17} /></span>
                <span><strong>{note.frontmatter.title}</strong><small>{note.frontmatter.summary || note.frontmatter.section}</small></span>
                <ArrowRight size={16} />
              </Link>
            )) : <div className="workspace-empty-state"><span><FilePlus size={22} /></span><div><strong>This workspace is empty</strong><p>创建第一篇 Markdown 笔记，内容仍会直接保存在所选文件夹中。</p></div>{session.capabilities.write && <Button variant="primary" size="sm" onClick={() => void createFirstNote()}>New note</Button>}</div>}
          </div>
        </section>

        <Link className="workspace-knowledge-link" to="/knowledge">
          <span><ShareNetwork size={19} /></span>
          <span><strong>Explore knowledge index</strong><small>WikiLinks、Backlinks、Tags、Properties 与局部图谱</small></span>
          <ArrowRight size={16} />
        </Link>
      </div>
    </main>
  )
}
