import { useEffect, useState } from 'react'
import { ArrowsOutLineHorizontal, CaretDown, Copy, DotsThree, FilePlus, FileText, FolderPlus, House, MagnifyingGlass, PencilSimple, PuzzlePiece, ShareNetwork, Trash, X } from '@phosphor-icons/react'
import { useWorkbenchStore } from '../workbench/useWorkbenchStore'
import { NavLink } from 'react-router-dom'
import type { NoteTreeItem } from '../content/noteTree'
import { cn } from '../lib/cn'
import { useAppStore } from '../store/useAppStore'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import { Button } from './ui/Button'
import { WorkspaceFileDialog, type FileDialogRequest } from './WorkspaceFileDialog'
import { joinWorkspacePath } from '../workspace/path'
import { useExtensionSnapshot } from '../extensions/ExtensionContext'
import { useCommandRegistry } from '../commands/CommandContext'

function TreeItem({ item, depth = 0, onAction }: { item: NoteTreeItem; depth?: number; onAction: (request: FileDialogRequest) => void }) {
  const [expanded, setExpanded] = useState(depth < 2)
  const [menuOpen, setMenuOpen] = useState(false)
  const closeSidebar = useAppStore((state) => state.setSidebarOpen)
  const session = useWorkspaceStore((state) => state.session)
  const hasChildren = Boolean(item.children?.length)
  const notePath = item.noteId ? session?.documentById.get(item.noteId)?.path : undefined
  const workspacePath = notePath ?? (item.path ? joinWorkspacePath(session?.manifest.content.root || '', item.path) : '')
  const kind = item.noteId ? 'file' as const : 'directory' as const

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
        {session?.capabilities.write && workspacePath && (
          <div className="tree-actions">
            <button onClick={() => setMenuOpen((value) => !value)} aria-label={`${item.label} 文件操作`}><DotsThree size={15} weight="bold" /></button>
            {menuOpen && (
              <div className="tree-action-menu">
                <button onClick={() => { onAction({ action: 'rename', path: workspacePath, kind, noteId: item.noteId }); setMenuOpen(false) }}><PencilSimple size={14} />Rename</button>
                <button onClick={() => { onAction({ action: 'move', path: workspacePath, kind, noteId: item.noteId }); setMenuOpen(false) }}><ArrowsOutLineHorizontal size={14} />Move</button>
                {kind === 'file' && <button onClick={() => { onAction({ action: 'duplicate', path: workspacePath, kind, noteId: item.noteId }); setMenuOpen(false) }}><Copy size={14} />Duplicate</button>}
                <button className="is-danger" onClick={() => { onAction({ action: 'delete', path: workspacePath, kind, noteId: item.noteId }); setMenuOpen(false) }}><Trash size={14} />Delete</button>
              </div>
            )}
          </div>
        )}
      </div>
      {hasChildren && expanded && <div>{item.children?.map((child) => <TreeItem key={`${item.path || item.label}-${child.path || child.label}`} item={child} depth={depth + 1} onAction={onAction} />)}</div>}
    </div>
  )
}

export function Sidebar() {
  const sidebarOpen = useAppStore((state) => state.sidebarOpen)
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen)
  const session = useWorkspaceStore((state) => state.session)
  const [fileDialog, setFileDialog] = useState<FileDialogRequest | null>(null)
  const leftSidebar = useWorkbenchStore((state) => state.leftSidebar)
  const setLeftSidebar = useWorkbenchStore((state) => state.setSidebar)
  const recent = useWorkbenchStore((state) => state.recent)
  const setSearchOpen = useAppStore((state) => state.setSearchOpen)
  const registry = useCommandRegistry()
  const extensionItems = useExtensionSnapshot().sidebarItems
  useEffect(() => {
    return useAppStore.subscribe((state, previous) => {
      if (state.newNoteRequestNonce !== previous.newNoteRequestNonce && session?.capabilities.write) setFileDialog({ action: 'new-note' })
    })
  }, [session?.capabilities.write])
  if (!session) return null

  return (
    <>
      {sidebarOpen && <button className="sidebar-scrim" onClick={() => setSidebarOpen(false)} aria-label="关闭目录" />}
      <aside className={cn('workspace-sidebar', sidebarOpen ? 'translate-x-0' : '-translate-x-full', !leftSidebar && 'workspace-sidebar--collapsed')}>
        <div className="sidebar-brand">
          <NavLink to="/workspace" onClick={() => setSidebarOpen(false)} aria-label="Workspace 首页">
            <span className="brand-mark">T</span>
            <span><strong>TensorNote</strong><small>Executable workspace</small></span>
          </NavLink>
          <div><button className="sidebar-icon-action" onClick={() => setSearchOpen(true)} aria-label="搜索文件" title="Search (⌘K)"><MagnifyingGlass size={16} /></button><button className="sidebar-icon-action" onClick={() => setLeftSidebar('left', !leftSidebar)} aria-label={leftSidebar ? '收起侧栏' : '展开侧栏'} title={leftSidebar ? 'Collapse sidebar' : 'Expand sidebar'}><X size={16} /></button><Button className="lg:hidden" variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} aria-label="关闭目录"><X size={18} /></Button></div>
        </div>

        <div className="sidebar-workspace-name">
          <span>{session.manifest.workspace.name.slice(0, 1).toUpperCase()}</span>
          <div><strong>{session.manifest.workspace.name}</strong><small>{session.documents.length} Markdown files</small></div>
        </div>

        <div className="sidebar-overview-link">
          <NavLink to="/workspace" onClick={() => setSidebarOpen(false)} className={({ isActive }) => cn(isActive && 'is-active')}>
            <House size={15} />Overview
          </NavLink>
          <NavLink to="/knowledge" onClick={() => setSidebarOpen(false)} className={({ isActive }) => cn(isActive && 'is-active')}>
            <ShareNetwork size={15} />Knowledge
          </NavLink>
        </div>

        {recent.length > 0 && <div className="sidebar-recent"><span>Recent files</span>{recent.slice(0, 4).map((noteId) => {
          const note = session.documentById.get(noteId)
          return note ? <NavLink key={noteId} to={`/notes/${noteId}`} onClick={() => setSidebarOpen(false)}><FileText size={13} />{note.frontmatter.title}</NavLink> : null
        })}</div>}

        <div className="sidebar-section-label">
          <span>Files</span>
          {session.capabilities.write && <div><button onClick={() => setFileDialog({ action: 'new-note' })} aria-label="新建笔记"><FilePlus size={14} /></button><button onClick={() => setFileDialog({ action: 'new-folder' })} aria-label="新建文件夹"><FolderPlus size={14} /></button></div>}
        </div>
        <nav className="workspace-tree" aria-label="Workspace 文件">
          {session.navigation.map((item) => <TreeItem key={item.path || item.label} item={item} onAction={setFileDialog} />)}
        </nav>

        {extensionItems.length > 0 && <div className="sidebar-extension-items"><span>Extensions</span>{extensionItems.map((item) => <button key={`${item.extensionId}:${item.id}`} onClick={() => registry.execute(item.commandId)}><PuzzlePiece size={14} />{item.label}</button>)}</div>}

        <div className="sidebar-source">
          <span className={`source-dot source-dot--${session.descriptor.type}`} />
          <div><strong>{session.descriptor.sourceLabel}</strong><small>{session.descriptor.detail || 'Workspace Provider'}</small></div>
        </div>
      </aside>
      <WorkspaceFileDialog key={fileDialog ? `${fileDialog.action}:${fileDialog.path || ''}` : 'closed'} request={fileDialog} onClose={() => setFileDialog(null)} />
    </>
  )
}
