import { useState } from 'react'
import { CaretDown, FileText, House, X } from '@phosphor-icons/react'
import { NavLink } from 'react-router-dom'
import type { NoteTreeItem } from '../content/noteTree'
import { cn } from '../lib/cn'
import { useAppStore } from '../store/useAppStore'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import { Button } from './ui/Button'

function TreeItem({ item, depth = 0 }: { item: NoteTreeItem; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2)
  const closeSidebar = useAppStore((state) => state.setSidebarOpen)
  const hasChildren = Boolean(item.children?.length)

  return (
    <div>
      <div className="workspace-tree__row" style={{ paddingLeft: `${depth * 12}px` }}>
        {hasChildren ? (
          <button className="tree-toggle" onClick={() => setExpanded((value) => !value)} aria-label={`${expanded ? '折叠' : '展开'}${item.label}`} aria-expanded={expanded}>
            <CaretDown size={12} weight="bold" className={cn('transition-transform', !expanded && '-rotate-90')} />
          </button>
        ) : (
          <span className="tree-file-icon"><FileText size={13} /></span>
        )}
        {item.noteId ? (
          <NavLink
            to={`/notes/${item.noteId}`}
            onClick={() => closeSidebar(false)}
            className={({ isActive }) => cn('tree-link', isActive && 'tree-link--active')}
          >
            {item.label}
          </NavLink>
        ) : (
          <button className="tree-folder" onClick={() => hasChildren && setExpanded((value) => !value)}>{item.label}</button>
        )}
      </div>
      {hasChildren && expanded && <div>{item.children?.map((child) => <TreeItem key={`${item.path || item.label}-${child.path || child.label}`} item={child} depth={depth + 1} />)}</div>}
    </div>
  )
}

export function Sidebar() {
  const sidebarOpen = useAppStore((state) => state.sidebarOpen)
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen)
  const session = useWorkspaceStore((state) => state.session)
  if (!session) return null

  return (
    <>
      {sidebarOpen && <button className="sidebar-scrim" onClick={() => setSidebarOpen(false)} aria-label="关闭目录" />}
      <aside className={cn('workspace-sidebar', sidebarOpen ? 'translate-x-0' : '-translate-x-full')}>
        <div className="sidebar-brand">
          <NavLink to="/workspace" onClick={() => setSidebarOpen(false)} aria-label="Workspace 首页">
            <span className="brand-mark">T</span>
            <span><strong>TensorNote</strong><small>Executable workspace</small></span>
          </NavLink>
          <Button className="lg:hidden" variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} aria-label="关闭目录"><X size={18} /></Button>
        </div>

        <div className="sidebar-workspace-name">
          <span>{session.manifest.workspace.name.slice(0, 1).toUpperCase()}</span>
          <div><strong>{session.manifest.workspace.name}</strong><small>{session.documents.length} Markdown files</small></div>
        </div>

        <div className="sidebar-overview-link">
          <NavLink to="/workspace" onClick={() => setSidebarOpen(false)} className={({ isActive }) => cn(isActive && 'is-active')}>
            <House size={15} />Overview
          </NavLink>
        </div>

        <div className="sidebar-section-label">Files</div>
        <nav className="workspace-tree" aria-label="Workspace 文件">
          {session.navigation.map((item) => <TreeItem key={item.path || item.label} item={item} />)}
        </nav>

        <div className="sidebar-source">
          <span className={`source-dot source-dot--${session.descriptor.type}`} />
          <div><strong>{session.descriptor.sourceLabel}</strong><small>{session.descriptor.detail || 'Workspace Provider'}</small></div>
        </div>
      </aside>
    </>
  )
}
