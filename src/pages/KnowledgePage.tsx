import { ArrowRight, FileText, Hash, LinkBreak, LinkSimple, Network } from '@phosphor-icons/react'
import { Link, useSearchParams } from 'react-router-dom'
import { useWorkspaceStore } from '../store/useWorkspaceStore'

export function KnowledgePage() {
  const session = useWorkspaceStore((state) => state.session)
  const [searchParams, setSearchParams] = useSearchParams()
  if (!session) return null
  const index = session.knowledgeIndex
  const activeTag = searchParams.get('tag')?.toLocaleLowerCase() ?? ''
  const activeEntry = index.tags.find((tag) => tag.name === activeTag)
  const visibleDocuments = activeEntry
    ? activeEntry.documentIds.flatMap((id) => session.documentById.get(id) ?? [])
    : [...session.documents].sort((a, b) => {
      const aLinks = (index.linksBySource.get(a.id)?.length ?? 0) + (index.backlinksByTarget.get(a.id)?.length ?? 0)
      const bLinks = (index.linksBySource.get(b.id)?.length ?? 0) + (index.backlinksByTarget.get(b.id)?.length ?? 0)
      return bLinks - aLinks || a.frontmatter.title.localeCompare(b.frontmatter.title)
    }).slice(0, 16)
  const propertyKeys = [...new Set(session.documents.flatMap((note) => Object.keys(note.properties)))]

  return (
    <main className="knowledge-page">
      <div className="knowledge-page__inner">
        <header className="knowledge-page__header">
          <span className="workspace-kicker">Knowledge index</span>
          <h1>Connections, not containers.</h1>
          <p>TensorNote 从普通 Markdown 重建链接、标签、目录与属性索引。没有专有数据库，也不会改变原始文件。</p>
        </header>

        <section className="knowledge-stats" aria-label="知识索引统计">
          <div><FileText size={18} /><strong>{session.documents.length}</strong><span>documents</span></div>
          <div><LinkSimple size={18} /><strong>{index.links.filter((link) => link.targetNoteId).length}</strong><span>resolved links</span></div>
          <div><Hash size={18} /><strong>{index.tags.length}</strong><span>tags</span></div>
          <div><LinkBreak size={18} /><strong>{index.unresolvedLinks.length}</strong><span>unresolved</span></div>
        </section>

        <div className="knowledge-dashboard">
          <section className="tag-atlas">
            <div className="section-heading"><div><span>Browse</span><h2>Tag atlas</h2></div>{activeTag && <button onClick={() => setSearchParams({})}>Clear filter</button>}</div>
            {index.tags.length ? <div className="tag-cloud">{index.tags.map((tag) => (
              <button key={tag.name} className={activeTag === tag.name ? 'is-active' : ''} onClick={() => setSearchParams({ tag: tag.name })}>
                <span>#{tag.name}</span><small>{tag.documentIds.length}</small>
              </button>
            ))}</div> : <div className="knowledge-empty"><Hash size={18} /><span>Frontmatter 或正文里的 Tag 会出现在这里。</span></div>}
          </section>

          <aside className="property-index-card">
            <span>Indexed properties</span>
            <strong>{propertyKeys.length}</strong>
            <div>{propertyKeys.slice(0, 10).map((key) => <code key={key}>{key}</code>)}</div>
            <p>所有属性仍保存在每篇笔记的 YAML Frontmatter 中。</p>
          </aside>
        </div>

        <section className="connected-documents">
          <div className="section-heading"><div><span>{activeEntry ? `#${activeEntry.name}` : 'Network'}</span><h2>{activeEntry ? 'Tagged documents' : 'Most connected notes'}</h2></div><small>{visibleDocuments.length} shown</small></div>
          <div className="knowledge-document-grid">
            {visibleDocuments.map((note) => {
              const incoming = index.backlinksByTarget.get(note.id)?.length ?? 0
              const outgoing = index.linksBySource.get(note.id)?.length ?? 0
              return (
                <Link key={note.id} to={`/notes/${note.id}`}>
                  <span className="document-icon"><Network size={16} /></span>
                  <span><strong>{note.frontmatter.title}</strong><small>{incoming} in · {outgoing} out · {note.headings.length} headings</small></span>
                  <ArrowRight size={15} />
                </Link>
              )
            })}
          </div>
        </section>

        {index.unresolvedLinks.length > 0 && (
          <section className="unresolved-links-card">
            <div className="section-heading"><div><span>Review</span><h2>Unresolved links</h2></div><small>{index.unresolvedLinks.length}</small></div>
            <div>{index.unresolvedLinks.slice(0, 12).map((link, itemIndex) => {
              const source = session.documentById.get(link.sourceNoteId)
              return <Link key={`${link.sourceNoteId}-${link.rawTarget}-${itemIndex}`} to={`/notes/${link.sourceNoteId}`}><span>{link.rawTarget}</span><small>from {source?.frontmatter.title ?? link.sourceNoteId}</small></Link>
            })}</div>
          </section>
        )}
      </div>
    </main>
  )
}
