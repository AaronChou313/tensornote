import { lazy, Suspense, useEffect, useRef } from 'react'
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { BundledWorkspaceProvider } from '../workspace/providers/BundledWorkspaceProvider'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { SearchDialog } from './SearchDialog'
import { useAppStore } from '../store/useAppStore'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import { computeRuntime } from '../compute/ComputeRuntime'
import { activeComputeProfile, useComputeStore } from '../store/useComputeStore'
import { ComputeSettingsDialog } from './ComputeSettingsDialog'

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
  const profile = activeComputeProfile({ profiles, activeProfileId })
  const location = useLocation()
  const previousPath = useRef(location.pathname)
  const legacyOpenAttempted = useRef(false)

  useEffect(() => {
    if (!session && status === 'idle' && location.pathname.startsWith('/notes/') && !legacyOpenAttempted.current) {
      legacyOpenAttempted.current = true
      void openProvider(new BundledWorkspaceProvider()).catch(() => undefined)
    }
  }, [location.pathname, openProvider, session, status])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        if (session) setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [session, setSearchOpen])

  useEffect(() => {
    computeRuntime.onStatus(setKernelStatus)
    return () => { void computeRuntime.shutdown() }
  }, [setKernelStatus])

  useEffect(() => {
    if (previousPath.current !== location.pathname) {
      setActiveLabId(null)
      setScratchOpen(false)
      window.scrollTo({ top: 0 })
      previousPath.current = location.pathname
    }
  }, [location.pathname, setActiveLabId, setScratchOpen])

  useEffect(() => {
    if (!session) return
    const noteId = location.pathname.match(/^\/notes\/([^/]+)/)?.[1]
    void computeRuntime.handleContextChange(profile, {
      workspaceId: session.descriptor.id,
      noteId: noteId ? decodeURIComponent(noteId) : undefined,
    })
  }, [location.pathname, profile, session])

  if (!session) {
    if (status === 'idle' && (location.pathname === '/workspace' || location.pathname === '/knowledge')) return <Navigate to="/" replace />
    return (
      <main className="route-status-page">
        <span className="workspace-spinner" />
        <h1>{status === 'error' ? 'Workspace 打开失败' : '正在准备 Workspace'}</h1>
        <p>{error || '正在读取 Markdown、索引和 Workspace 配置。'}</p>
        {status === 'error' && <Link to="/">返回 Workspace 首页</Link>}
      </main>
    )
  }

  return (
    <div className="app-workbench">
      <Sidebar />
      <div className="workbench-main">
        <TopBar />
        <Outlet />
      </div>
      <SearchDialog />
      <Suspense fallback={null}><LabDrawer /></Suspense>
      <ComputeSettingsDialog />
    </div>
  )
}
