import { useMemo, useState } from 'react'
import { ArrowSquareOut, ArrowsInLineVertical, Hash, LinkSimple, ShareNetwork } from '@phosphor-icons/react'
import { Link, useNavigate } from 'react-router-dom'
import type { KnowledgeLink, LocalGraph } from '../content/knowledgeIndex'
import { useWorkspaceStore } from '../store/useWorkspaceStore'

function uniqueLinks(links: KnowledgeLink[]) {
  return links.filter((link, index) => links.findIndex((candidate) =>
    candidate.sourceNoteId === link.sourceNoteId
    && candidate.targetNoteId === link.targetNoteId
    && candidate.rawTarget === link.rawTarget,
  ) === index)
}

function GraphView({ graph }: { graph: LocalGraph }) {
  const navigate = useNavigate()
  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>()
    const current = graph.nodes.find((node) => node.current)
    if (current) map.set(current.id, { x: 130, y: 92 })
    const related = graph.nodes.filter((node) => !node.current)
    related.forEach((node, index) => {
      const angle = (Math.PI * 2 * index) / Math.max(related.length, 1) - Math.PI / 2
      const radiusX = related.length > 7 ? 101 : 92
      const radiusY = related.length > 7 ? 68 : 62
      map.set(node.id, { x: 130 + Math.cos(angle) * radiusX, y: 92 + Math.sin(angle) * radiusY })
    })
    return map
  }, [graph.nodes])

  if (graph.nodes.length <= 1) return <div className="knowledge-empty"><ShareNetwork size={18} /><span>还没有相邻笔记。添加 WikiLink 或共享 Tag 后会出现在这里。</span></div>

  return (
    <svg className="local-graph" viewBox="0 0 260 184" role="img" aria-label="当前笔记的局部知识图谱">
      {graph.edges.map((edge, index) => {
        const source = positions.get(edge.source)
        const target = positions.get(edge.target)
        return source && target ? <line key={`${edge.source}-${edge.target}-${index}`} x1={source.x} y1={source.y} x2={target.x} y2={target.y} className={`graph-edge graph-edge--${edge.kind}`} /> : null
      })}
      {graph.nodes.map((node) => {
        const position = positions.get(node.id)
        if (!position) return null
        const shortLabel = node.label.length > 17 ? `${node.label.slice(0, 16)}…` : node.label
        return (
          <g
            key={node.id}
            className={node.current ? 'graph-node graph-node--current' : 'graph-node'}
            role="link"
            tabIndex={0}
            aria-label={`打开 ${node.label}`}
            onClick={() => navigate(`/notes/${node.id}`)}
            onKeyDown={(event) => { if (event.key === 'Enter') navigate(`/notes/${node.id}`) }}
          >
            <circle cx={position.x} cy={position.y} r={node.current ? 14 : 8} />
            <text x={position.x} y={position.y + (node.current ? 26 : 19)} textAnchor="middle">{shortLabel}</text>
          </g>
        )
      })}
    </svg>
  )
}

export function KnowledgePanel({ noteId, initialView = 'links' }: { noteId: string; initialView?: 'links' | 'outline' | 'backlinks' | 'graph' }) {
  const [view, setView] = useState<'links' | 'outline' | 'backlinks' | 'graph'>(initialView)
  const session = useWorkspaceStore((state) => state.session)
  if (!session) return null
  const note = session.documentById.get(noteId)
  if (!note) return null
  const index = session.knowledgeIndex
  const outgoing = uniqueLinks(index.linksBySource.get(noteId) ?? [])
  const backlinks = uniqueLinks(index.backlinksByTarget.get(noteId) ?? [])
  const tags = index.tagsByDocument.get(noteId) ?? []
  const graph = index.localGraph(noteId)

  return (
    <aside className="knowledge-panel" aria-label="Knowledge context">
      {view !== 'backlinks' && <section className="knowledge-panel__graph">
        <header><span>Local graph</span><small>{graph.nodes.length - 1} related</small></header>
        <GraphView graph={graph} />
      </section>}

      <div className="knowledge-panel__tabs" role="tablist" aria-label="知识导航">
        <button role="tab" aria-selected={view === 'links' || view === 'backlinks'} className={view === 'links' || view === 'backlinks' ? 'is-active' : ''} onClick={() => setView('links')}><LinkSimple size={14} />Links</button>
        <button role="tab" aria-selected={view === 'outline'} className={view === 'outline' ? 'is-active' : ''} onClick={() => setView('outline')}><ArrowsInLineVertical size={14} />Outline</button>
      </div>

      {view === 'graph' ? <div className="knowledge-panel__body"><section><h3>Local graph</h3><GraphView graph={graph} /></section></div> : view === 'backlinks' ? <div className="knowledge-panel__body"><section><h3>Backlinks <span>{backlinks.length}</span></h3>{backlinks.length ? <div className="knowledge-link-list">{backlinks.map((link, indexValue) => { const source = session.documentById.get(link.sourceNoteId); return source ? <Link key={`${source.id}-${indexValue}`} to={`/notes/${source.id}`}><span>{source.frontmatter.title}</span><small>{link.label}</small></Link> : null })}</div> : <p className="knowledge-muted">还没有其他笔记链接到这里。</p>}</section></div> : view === 'links' ? (
        <div className="knowledge-panel__body">
          {tags.length > 0 && <section><h3><Hash size={13} />Tags</h3><div className="knowledge-tags">{tags.map((tag) => <Link key={tag} to={`/knowledge?tag=${encodeURIComponent(tag)}`}>{tag}</Link>)}</div></section>}
          <section>
            <h3>Backlinks <span>{backlinks.length}</span></h3>
            {backlinks.length ? <div className="knowledge-link-list">{backlinks.map((link, indexValue) => {
              const source = session.documentById.get(link.sourceNoteId)
              return source ? <Link key={`${source.id}-${indexValue}`} to={`/notes/${source.id}`}><span>{source.frontmatter.title}</span><small>{link.label}</small></Link> : null
            })}</div> : <p className="knowledge-muted">还没有其他笔记链接到这里。</p>}
          </section>
          <section>
            <h3>Outgoing <span>{outgoing.length}</span></h3>
            {outgoing.length ? <div className="knowledge-link-list">{outgoing.map((link, indexValue) => {
              const target = link.targetNoteId ? session.documentById.get(link.targetNoteId) : undefined
              return target
                ? <Link key={`${link.rawTarget}-${indexValue}`} to={`/notes/${target.id}${index.resolveReference(link.rawTarget, noteId)?.heading ? `#${index.resolveReference(link.rawTarget, noteId)?.heading?.id}` : ''}`}><span>{target.frontmatter.title}</span><small>{link.heading || link.label}</small></Link>
                : <div key={`${link.rawTarget}-${indexValue}`} className="knowledge-unresolved"><span>{link.rawTarget}</span><small>Unresolved</small></div>
            })}</div> : <p className="knowledge-muted">这篇笔记还没有出向链接。</p>}
          </section>
        </div>
      ) : (
        <nav className="knowledge-outline" aria-label="当前笔记目录">
          {note.headings.length ? note.headings.map((heading) => <a key={heading.id} className={`depth-${heading.depth}`} href={`#${heading.id}`}>{heading.text}</a>) : <p className="knowledge-muted">添加 Markdown Heading 后会生成目录。</p>}
        </nav>
      )}

      <Link className="knowledge-explore" to="/knowledge"><span>Explore knowledge index</span><ArrowSquareOut size={14} /></Link>
    </aside>
  )
}
