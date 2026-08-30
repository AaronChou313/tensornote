import { Cards, FileText, ListBullets, MagnifyingGlass, Rows, X } from '@phosphor-icons/react'
import { Link, useSearchParams } from 'react-router-dom'
import type { Note } from '../types'
import type { PropertyField, PropertyIndex, PropertyRow } from '../content/propertyIndex'
import { useWorkspaceStore } from '../store/useWorkspaceStore'

type DatabaseView = 'table' | 'card' | 'list'

const viewOptions: Array<{ id: DatabaseView; label: string; icon: typeof Rows }> = [
  { id: 'table', label: 'Table', icon: Rows },
  { id: 'card', label: 'Card', icon: Cards },
  { id: 'list', label: 'List', icon: ListBullets },
]

function textValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  if (Array.isArray(value)) return value.join(', ') || '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function propertyValue(values: Record<string, unknown>, key: string) {
  return Object.entries(values).find(([candidate]) => candidate.toLocaleLowerCase() === key.toLocaleLowerCase())?.[1]
}

function hasPropertyValue(value: unknown) {
  return value !== null && value !== undefined && value !== '' && (!Array.isArray(value) || value.length > 0)
}

function fieldHasInformation(field: PropertyField, rows: PropertyRow[]) {
  return rows.some((row) => hasPropertyValue(propertyValue(row.values, field.key)))
}

function fieldPriority(field: PropertyField) {
  const reserved = ['id', 'title', 'aliases', 'summary']
  const preferred = ['section', 'status', 'type', 'tags', 'year', 'order']
  const key = field.key.toLocaleLowerCase()
  const reservedIndex = reserved.indexOf(key)
  if (reservedIndex >= 0) return 20 + reservedIndex
  const preferredIndex = preferred.indexOf(key)
  return preferredIndex >= 0 ? preferredIndex : 8
}

function NoteLink({ note, className }: { note: Note; className?: string }) {
  return <Link className={className} to={`/notes/${note.id}`} aria-label={`打开笔记：${note.frontmatter.title}`}>{note.frontmatter.title}</Link>
}

function DatabaseTable({ rows, fields }: { rows: PropertyRow[]; fields: PropertyField[] }) {
  return <div className="database-table-scroll">
    <table className="database-table">
      <thead><tr><th scope="col">Document</th>{fields.map((field) => <th key={field.key} scope="col"><span>{field.key}</span><small>{field.type}</small></th>)}</tr></thead>
      <tbody>{rows.map(({ note, values }) => <tr key={note.id}>
        <td><NoteLink note={note} className="database-table__title" /><small>{note.directory || 'Workspace root'}</small></td>
        {fields.map((field) => <td key={field.key} title={textValue(propertyValue(values, field.key))}>{textValue(propertyValue(values, field.key))}</td>)}
      </tr>)}</tbody>
    </table>
  </div>
}

function DatabaseCards({ rows, fields }: { rows: PropertyRow[]; fields: PropertyField[] }) {
  return <div className="database-cards">
    {rows.map(({ note, values }) => {
      const visibleFields = fields.filter((field) => hasPropertyValue(propertyValue(values, field.key))).slice(0, 4)
      return <article className="database-card" key={note.id}>
        <div className="database-card__heading"><span><FileText size={15} /></span><div><NoteLink note={note} /><small>{note.directory || 'Workspace root'}</small></div></div>
        {note.frontmatter.summary && <p>{note.frontmatter.summary}</p>}
        <dl>{visibleFields.map((field) => <div key={field.key}><dt>{field.key}</dt><dd>{textValue(propertyValue(values, field.key))}</dd></div>)}</dl>
      </article>
    })}
  </div>
}

function DatabaseList({ rows, fields }: { rows: PropertyRow[]; fields: PropertyField[] }) {
  return <div className="database-list">
    {rows.map(({ note, values }) => {
      const primary = fields.find((field) => hasPropertyValue(propertyValue(values, field.key)))
      const secondary = fields.find((field) => field.key !== primary?.key && hasPropertyValue(propertyValue(values, field.key)))
      return <article className="database-list__item" key={note.id}>
        <span className="database-list__icon"><FileText size={16} /></span>
        <div className="database-list__content"><NoteLink note={note} /><p>{note.frontmatter.summary || note.directory || 'Markdown document'}</p></div>
        <div className="database-list__properties">
          {primary && <span><small>{primary.key}</small>{textValue(propertyValue(values, primary.key))}</span>}
          {secondary && <span><small>{secondary.key}</small>{textValue(propertyValue(values, secondary.key))}</span>}
        </div>
      </article>
    })}
  </div>
}

export function StructuredKnowledgePage() {
  const session = useWorkspaceStore((state) => state.session)
  const [searchParams, setSearchParams] = useSearchParams()
  if (!session) return null

  const propertyIndex: PropertyIndex = session.propertyIndex
  const query = searchParams.get('q') ?? ''
  const viewParam = searchParams.get('view')
  const view: DatabaseView = viewParam === 'card' || viewParam === 'list' ? viewParam : 'table'
  const result = propertyIndex.query(query)
  const availableFields = propertyIndex.fields
    .filter((field) => fieldHasInformation(field, result.rows))
    .sort((left, right) => fieldPriority(left) - fieldPriority(right) || left.key.localeCompare(right.key, 'zh-CN'))
    .slice(0, 5)
  const updateParams = (next: { q?: string; view?: DatabaseView }) => {
    const params = new URLSearchParams(searchParams)
    const nextQuery = next.q ?? query
    const nextView = next.view ?? view
    if (nextQuery) params.set('q', nextQuery)
    else params.delete('q')
    if (nextView === 'table') params.delete('view')
    else params.set('view', nextView)
    setSearchParams(params, { replace: true })
  }

  return <main className="database-page">
    <div className="database-page__inner">
      <header className="database-page__header">
        <div><span className="workspace-kicker">Structured knowledge</span><h1>Database</h1><p>从 Markdown frontmatter 读取属性，按条件组织笔记。查询不会改动任何源文件。</p></div>
        <span className="database-page__count">{result.rows.length} {result.rows.length === 1 ? 'document' : 'documents'}</span>
      </header>

      <section className="database-workspace" aria-label="Structured Knowledge Database">
        <div className="database-query-bar">
          <label className="database-query-input"><MagnifyingGlass size={17} /><span className="sr-only">查询属性</span><input value={query} onChange={(event) => updateParams({ q: event.target.value })} placeholder="section = Transformer AND status = reading" /></label>
          {query && <button className="database-clear-query" onClick={() => updateParams({ q: '' })}><X size={14} />Clear</button>}
          <div className="database-view-switcher" aria-label="选择数据视图">{viewOptions.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? 'is-active' : ''} onClick={() => updateParams({ view: id })} aria-pressed={view === id}><Icon size={15} /><span>{label}</span></button>)}</div>
        </div>
        <p className="database-query-help">Use property expressions such as <code>section = Transformer AND status = reading</code>.</p>

        {result.error ? <section className="database-state database-state--error" role="alert"><strong>Query needs attention</strong><p>{result.error}</p><button onClick={() => updateParams({ q: '' })}>Clear query</button></section>
          : result.rows.length === 0 ? <section className="database-state"><FileText size={19} /><strong>{query ? 'No documents match this query.' : 'No indexed properties yet.'}</strong><p>{query ? 'Try a different property or clear the current query.' : 'Add YAML frontmatter to a note to start building this view.'}</p>{query && <button onClick={() => updateParams({ q: '' })}>Clear query</button>}</section>
            : <section className="database-results" aria-live="polite">{view === 'table' && <DatabaseTable rows={result.rows} fields={availableFields} />}{view === 'card' && <DatabaseCards rows={result.rows} fields={availableFields} />}{view === 'list' && <DatabaseList rows={result.rows} fields={availableFields} />}</section>}
      </section>
    </div>
  </main>
}
