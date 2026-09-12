import { lazy, Suspense, useCallback, useEffect, useRef } from 'react'
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { SearchDialog } from './SearchDialog'
import { useAppStore } from '../store/useAppStore'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import { computeRuntime } from '../compute/ComputeRuntime'
import { activeComputeProfile, useComputeStore } from '../store/useComputeStore'
import { useWorkbenchStore } from '../workbench/useWorkbenchStore'
import { SettingsDialog } from './workbench/SettingsDialog'
import { PublishDialog } from './publishing/PublishDialog'

const LabDrawer = lazy(() => import('./LabDrawer').then((module) => ({ default: module.LabDrawer })))

export function AppShell() {
  const setSearchOpen = useAppStore((state) => state.setSearchOpen)
  const setActiveLabId = useAppStore((state) => state.setActiveLabId)
  const setKernelStatus = useAppStore((state) => state.setKernelStatus)
  const session = useWorkspaceStore((state) => state.session)
  const status = useWorkspaceStore((state) => state.status)
  const error = useWorkspaceStore((state) => state.error)
  const openProvider = useWorkspaceStore((state) => state.openProvider)
  const profiles = useComputeStore((state) => state.profiles)
  const activeProfileId = useComputeStore((state) => state.activeProfileId)
  const setScratchOpen = useComputeStore((state) => state.setScratchOpen)
  const setConnectionEvent = useComputeStore((state) => state.setConnectionEvent)
  const profile = activeComputeProfile({ profiles, activeProfileId })
  const location = useLocation()
  const navigate = useNavigate()
  const leftSidebar = useWorkbenchStore((state) => state.leftSidebar)
  const previousPath = useRef(location.pathname)
  const legacyOpenAttempted = useRef(false)

  const switchWorkspace = useCallback(async () => {
    const appState = useAppStore.getState()
    const dirtyNotes = Object.keys(appState.editorDirtyPaths).length
    if ((dirtyNotes > 0 || appState.labDirty) && !window.confirm(
      `${dirtyNotes > 0 ? `${dirtyNotes} 篇笔记有未保存修改` : ''}${dirtyNotes > 0 && appState.labDirty ? '，并且 ' : ''}${appState.labDirty ? 'Python Lab 有未保存修改' : ''}。确定关闭当前 Workspace 吗？`,
    )) return false
    await computeRuntime.shutdown()
    await useWorkspaceStore.getState().closeWorkspace()
    useWorkbenchStore.getState().resetWorkspace()
    useAppStore.getState().resetWorkspaceUi()
    useComputeStore.getState().setScratchOpen(false)
    navigate('/', { replace: true })
    return true
  }, [navigate])

  useEffect(() => {
    if (!session && status === 'idle' && (location.pathname === '/notes' || location.pathname.startsWith('/notes/')) && !legacyOpenAttempted.current) {
      legacyOpenAttempted.current = true
      void import('../workspace/providers/BundledWorkspaceProvider').then(({ BundledWorkspaceProvider }) => openProvider(new BundledWorkspaceProvider())).catch(() => undefined)
    }
  }, [location.pathname, openProvider, session, status])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing || event.defaultPrevented || !(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return
      if (document.querySelector('[role="dialog"]') || document.activeElement?.closest('.cm-content')) return
      event.preventDefault()
      if (session) setSearchOpen(true)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [session, setSearchOpen])

  useEffect(() => {
    computeRuntime.onStatus(setKernelStatus)
    computeRuntime.onConnectionEvent(setConnectionEvent)
    return () => { computeRuntime.onConnectionEvent(() => undefined); void computeRuntime.shutdown() }
  }, [setConnectionEvent, setKernelStatus])

  useEffect(() => {
    if (previousPath.current === location.pathname) return
    setActiveLabId(null)
    setScratchOpen(false)
    window.scrollTo({ top: 0 })
    previousPath.current = location.pathname
  }, [location.pathname, setActiveLabId, setScratchOpen])

  useEffect(() => {
    if (!session) return
    const noteId = location.pathname.match(/^\/notes\/([^/]+)/)?.[1]
    void computeRuntime.handleContextChange(profile, {
      workspaceId: session.descriptor.id,
      noteId: noteId ? decodeURIComponent(noteId) : undefined,
      ...(session.descriptor.type === 'github' && session.descriptor.config?.owner && session.descriptor.config.repo && session.descriptor.revision
        ? { workspaceSource: { provider: 'github' as const, repository: `${session.descriptor.config.owner}/${session.descriptor.config.repo}`, revision: session.descriptor.revision } }
        : {}),
    })
  }, [location.pathname, profile, session])

  useEffect(() => {
    if (!session) return
    const root = document.documentElement
    const previousTitle = document.title
    const previousAccent = root.style.getPropertyValue('--accent')
    document.title = `${session.manifest.publishing.title || session.manifest.workspace.name} · TensorNote`
    if (session.manifest.publishing.accent) root.style.setProperty('--accent', session.manifest.publishing.accent)
    return () => { document.title = previousTitle; if (previousAccent) root.style.setProperty('--accent', previousAccent); else root.style.removeProperty('--accent') }
  }, [session])

  useEffect(() => {
    if (!session) return
    const noteId = location.pathname.match(/^\/notes\/([^/]+)/)?.[1]
    if (noteId) {
      const note = session.documentById.get(decodeURIComponent(noteId))
      const state = useWorkbenchStore.getState()
      if (note && (state.activeView || state.activeNoteId !== note.id)) state.openNote(note.id, note.frontmatter.title)
      return
    }
    if (location.pathname === '/workspace' && useWorkbenchStore.getState().activeView !== 'workspace') useWorkbenchStore.getState().openView('workspace')
  }, [location.pathname, session])

  if (!session) {
    if (status === 'idle' && location.pathname === '/workspace') return <Navigate to="/" replace />
    return <main className="route-status-page"><span className="workspace-spinner" /><h1>{status === 'error' ? 'Workspace 打开失败' : '正在准备 Workspace'}</h1><p>{error || '正在读取 Markdown、索引和 Workspace 配置。'}</p>{status === 'error' && <Link to="/">返回 Workspace 首页</Link>}</main>
  }

  return <div className={`app-workbench ${leftSidebar ? '' : 'app-workbench--sidebar-collapsed'}`}>
    <Sidebar onSwitchWorkspace={switchWorkspace} />
    <div className="workbench-main"><TopBar /><div className="workbench-route"><Outlet /></div></div>
    <SearchDialog />
    <SettingsDialog />
    <PublishDialog />
    <Suspense fallback={null}><LabDrawer /></Suspense>
  </div>
}
