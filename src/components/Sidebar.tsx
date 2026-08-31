import { useEffect, useRef, useState } from 'react'
import { ArrowClockwise, ArrowsOutLineHorizontal, CaretDown, CaretUpDown, Copy, DotsThree, FilePlus, FileText, FolderOpen, FolderPlus, GitBranch, House, MagnifyingGlass, PencilSimple, PuzzlePiece, Rows, ShareNetwork, SidebarSimple, Trash, X } from '@phosphor-icons/react'
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
import { deploymentAdapter } from '../deployment/config'

const treePageSize = 200

function TreeChildren({ items, depth = 0, onAction, onOpenNote }: { items: NoteTreeItem[]; depth?: number; onAction: (request: FileDialogRequest) => void; onOpenNote: (noteId: string) => void }) {
  const [visible, setVisible] = useState(treePageSize)
  const shown = items.slice(0, visible)
  return <>
    {shown.map((child) => <TreeItem key={`${child.path || child.label}:${child.noteId || 'folder'}`} item={child} depth={depth} onAction={onAction} onOpenNote={onOpenNote} />)}
    {shown.length < items.length && <button className="workspace-tree__more" onClick={() => setVisible((count) => count + treePageSize)}>显示更多 <span>{items.length - shown.length}</span></button>}
  </>
}

function TreeItem({ item, depth = 0, onAction, onOpenNote }: { item: NoteTreeItem; depth?: number; onAction: (request: FileDialogRequest) => void; onOpenNote: (noteId: string) => void }) {
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
            onClick={() => { onOpenNote(item.noteId!); closeSidebar(false) }}
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
      {hasChildren && expanded && <div><TreeChildren items={item.children ?? []} depth={depth + 1} onAction={onAction} onOpenNote={onOpenNote} /></div>}
    </div>
  )
}

export function Sidebar({ onSwitchWorkspace }: { onSwitchWorkspace: () => Promise<boolean> }) {
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
  const workspaceMenu = useRef<HTMLDetailsElement>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [workspaceActionError, setWorkspaceActionError] = useState<string | null>(null)
  useEffect(() => {
    return useAppStore.subscribe((state, previous) => {
      if (state.newNoteRequestNonce !== previous.newNoteRequestNonce && session?.capabilities.write) setFileDialog({ action: 'new-note' })
    })
  }, [session?.capabilities.write])
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (workspaceMenu.current?.open && !workspaceMenu.current.contains(event.target as Node)) workspaceMenu.current.removeAttribute('open')
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') workspaceMenu.current?.removeAttribute('open')
    }
    document.addEventListener('pointerdown', dismiss)
    window.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      window.removeEventListener('keydown', escape)
    }
  }, [])
  if (!session) return null

  const refreshWorkspace = async () => {
    if (refreshing) return
    setRefreshing(true)
    setWorkspaceActionError(null)
    try {
      await useWorkspaceStore.getState().refreshWorkspace()
      workspaceMenu.current?.removeAttribute('open')
    } catch (reason) {
      setWorkspaceActionError(reason instanceof Error ? reason.message : '无法刷新 Workspace')
    } finally {
      setRefreshing(false)
    }
  }

  const switchWorkspace = async () => {
    setWorkspaceActionError(null)
    try {
      if (await onSwitchWorkspace()) workspaceMenu.current?.removeAttribute('open')
    } catch (reason) {
      setWorkspaceActionError(reason instanceof Error ? reason.message : '无法关闭当前 Workspace')
    }
  }

  const openNote = (noteId: string) => {
    const note = session.documentById.get(noteId)
    if (note) useWorkbenchStore.getState().openNote(note.id, note.frontmatter.title)
  }

  return (
    <>
      {sidebarOpen && <button className="sidebar-scrim" onClick={() => setSidebarOpen(false)} aria-label="关闭目录" />}
      <aside className={cn('workspace-sidebar', sidebarOpen ? 'translate-x-0' : '-translate-x-full', !leftSidebar && !sidebarOpen && 'workspace-sidebar--collapsed')}>
        <div className="sidebar-brand">
          <details className="sidebar-workspace-menu" ref={workspaceMenu}>
            <summary className="sidebar-workspace-name" aria-label={`切换 Workspace：${session.manifest.workspace.name}`}>
              <span>{session.manifest.workspace.name.slice(0, 1).toUpperCase()}</span>
              <div><strong>{session.manifest.workspace.name}</strong><span className="sidebar-workspace-meta"><small>{session.documents.length} Markdown files</small><em>{session.descriptor.type === 'bundled' ? 'Built-in' : session.descriptor.type === 'github' ? 'GitHub' : 'Local'}</em><em>{session.capabilities.write ? 'Editable' : 'Read only'}</em></span></div>
              <CaretUpDown size={14} weight="bold" />
            </summary>
            <div className="sidebar-workspace-menu__popover">
              <button type="button" onClick={() => void refreshWorkspace()} disabled={refreshing}><ArrowClockwise size={15} className={refreshing ? 'is-spinning' : ''} />{refreshing ? '正在刷新…' : '刷新文件'}</button>
              <button type="button" onClick={() => void switchWorkspace()}><FolderOpen size={15} />切换工作区</button>
              {workspaceActionError && <p role="alert">{workspaceActionError}</p>}
            </div>
          </details>
          <div><button className="sidebar-icon-action" onClick={() => setSearchOpen(true)} aria-label="搜索文件" title="Search (⌘K)"><MagnifyingGlass size={16} /></button><button className="sidebar-icon-action sidebar-icon-action--collapse" onClick={() => setLeftSidebar('left', false)} aria-label="收起侧栏" title="Collapse sidebar"><SidebarSimple size={16} /></button><Button className="lg:hidden" variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} aria-label="关闭目录"><X size={18} /></Button></div>
        </div>

        <div className="sidebar-overview-link">
          <NavLink to="/workspace" onClick={() => setSidebarOpen(false)} className={({ isActive }) => cn(isActive && 'is-active')}>
            <House size={15} />Overview
          </NavLink>
          <NavLink to="/knowledge" onClick={() => setSidebarOpen(false)} className={({ isActive }) => cn(isActive && 'is-active')}>
            <ShareNetwork size={15} />Knowledge
          </NavLink>
          <NavLink to="/database" onClick={() => setSidebarOpen(false)} className={({ isActive }) => cn(isActive && 'is-active')}>
            <Rows size={15} />Database
          </NavLink>
          {deploymentAdapter.capabilities.gitBridge && session.capabilities.git && session.descriptor.type === 'local' && <NavLink to="/git" onClick={() => setSidebarOpen(false)} className={({ isActive }) => cn(isActive && 'is-active')}>
            <GitBranch size={15} />Git
          </NavLink>}
        </div>

        {recent.length > 0 && <details className="sidebar-recent" open><summary><span>Recent files</span><CaretDown size={12} weight="bold" /></summary><div>{recent.slice(0, 4).map((noteId) => {
          const note = session.documentById.get(noteId)
          return note ? <NavLink key={noteId} to={`/notes/${noteId}`} onClick={() => { openNote(note.id); setSidebarOpen(false) }}><FileText size={13} />{note.frontmatter.title}</NavLink> : null
        })}</div></details>}

        <details className="sidebar-collapsible sidebar-files" open>
          <summary className="sidebar-section-label"><span>Files</span><CaretDown size={12} weight="bold" /></summary>
          {session.capabilities.write && <div className="sidebar-file-actions"><button onClick={() => setFileDialog({ action: 'new-note' })} aria-label="新建笔记"><FilePlus size={14} /></button><button onClick={() => setFileDialog({ action: 'new-folder' })} aria-label="新建文件夹"><FolderPlus size={14} /></button></div>}
          <nav className="workspace-tree" aria-label="Workspace 文件"><TreeChildren items={session.navigation} onAction={setFileDialog} onOpenNote={openNote} /></nav>
        </details>

        {extensionItems.length > 0 && <details className="sidebar-collapsible sidebar-extension-items" open><summary><span>Extensions</span><CaretDown size={12} weight="bold" /></summary><div>{extensionItems.map((item) => <button key={`${item.extensionId}:${item.id}`} onClick={() => registry.execute(item.commandId)}><PuzzlePiece size={14} />{item.label}</button>)}</div></details>}

      </aside>
      <WorkspaceFileDialog key={fileDialog ? `${fileDialog.action}:${fileDialog.path || ''}` : 'closed'} request={fileDialog} onClose={() => setFileDialog(null)} />
    </>
  )
}
