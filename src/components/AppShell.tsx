import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BundledWorkspaceProvider } from '../workspace/providers/BundledWorkspaceProvider'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { SearchDialog } from './SearchDialog'
import { useAppStore } from '../store/useAppStore'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import { computeRuntime } from '../compute/ComputeRuntime'
import { activeComputeProfile, useComputeStore } from '../store/useComputeStore'
import { ComputeSettingsDialog } from './ComputeSettingsDialog'
import { CommandRegistry } from '../commands/CommandRegistry'
import { CommandRegistryContext } from '../commands/CommandContext'
import { CommandPalette } from './workbench/CommandPalette'
import { WorkbenchTabs } from './workbench/WorkbenchTabs'
import { useWorkbenchStore } from '../workbench/useWorkbenchStore'
import { ExtensionRuntime } from '../extensions/ExtensionRuntime'
import { ExtensionRuntimeContext } from '../extensions/ExtensionContext'
import { focusModeExtension, focusModeManifest } from '../extensions/official/focusMode'
import { useExtensionStore } from '../store/useExtensionStore'
import { ExtensionManagerDialog } from './extensions/ExtensionManagerDialog'
import { ExtensionStatusBar } from './extensions/ExtensionStatusBar'
import { ExtensionViewDialog } from './extensions/ExtensionViewDialog'

const LabDrawer = lazy(() => import('./LabDrawer').then((module) => ({ default: module.LabDrawer })))

export function AppShell() {
  const setSearchOpen = useAppStore((state) => state.setSearchOpen)
  const setCommandPaletteOpen = useAppStore((state) => state.setCommandPaletteOpen)
  const setActiveLabId = useAppStore((state) => state.setActiveLabId)
  const setPendingLabAction = useAppStore((state) => state.setPendingLabAction)
  const requestNewNote = useAppStore((state) => state.requestNewNote)
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
  const navigate = useNavigate()
  const leftSidebar = useWorkbenchStore((state) => state.leftSidebar)
  const previousPath = useRef(location.pathname)
  const legacyOpenAttempted = useRef(false)
  const extensionsInitialised = useRef(false)
  const [registry] = useState(() => new CommandRegistry())
  const [extensionRuntime] = useState(() => new ExtensionRuntime({
    commandRegistry: registry,
    workspace: () => useWorkspaceStore.getState().provider,
    hasPermission: (extensionId, permission) => useExtensionStore.getState().grants[extensionId]?.includes(permission) ?? false,
    getSetting: (extensionId, key) => useExtensionStore.getState().settings[extensionId]?.[key],
    setSetting: (extensionId, key, value) => useExtensionStore.getState().setSetting(extensionId, key, value),
  }))

  useEffect(() => {
    if (extensionsInitialised.current) return
    extensionsInitialised.current = true
    void (async () => {
      await extensionRuntime.install(focusModeManifest, focusModeExtension, 'official')
      if (useExtensionStore.getState().enabled[focusModeManifest.id] !== false) {
        await extensionRuntime.activate(focusModeManifest.id)
        useExtensionStore.getState().setEnabled(focusModeManifest.id, true)
      }
    })().catch(() => undefined)
  }, [extensionRuntime])

  useEffect(() => {
    if (!session && status === 'idle' && location.pathname.startsWith('/notes/') && !legacyOpenAttempted.current) {
      legacyOpenAttempted.current = true
      void openProvider(new BundledWorkspaceProvider()).catch(() => undefined)
    }
  }, [location.pathname, openProvider, session, status])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        const editing = document.activeElement?.closest('.cm-content')
        if (!editing) {
          event.preventDefault()
          if (session) setSearchOpen(true)
        }
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'p') {
        event.preventDefault()
        setCommandPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [session, setCommandPaletteOpen, setSearchOpen])

  useEffect(() => {
    if (!session) return
    const activeNote = () => {
      const state = useWorkbenchStore.getState()
      const id = state.panes[state.activePane]
      return id ? session.documentById.get(id) : undefined
    }
    const open = (noteId: string) => {
      const note = session.documentById.get(noteId)
      if (!note) return
      useWorkbenchStore.getState().openNote(note.id, note.frontmatter.title)
      navigate(`/notes/${note.id}`)
    }
    const unregister = [
      ...session.documents.map((note) => registry.register({ id: `note.open.${note.id}`, label: `Open note: ${note.frontmatter.title}`, category: 'Navigation' as const, description: note.path, execute: () => open(note.id) })),
      registry.register({ id: 'note.new', label: 'New note', category: 'Workspace', description: 'Open the New note dialog', isAvailable: () => session.capabilities.write, execute: requestNewNote }),
      registry.register({ id: 'view.graph', label: 'Open graph', category: 'View', execute: () => navigate('/knowledge') }),
      registry.register({ id: 'view.database', label: 'Open database', category: 'View', description: 'Browse structured note properties', execute: () => navigate('/database') }),
      registry.register({ id: 'view.toggleSidebar', label: 'Toggle sidebar', category: 'View', execute: () => useWorkbenchStore.getState().setSidebar('left', !useWorkbenchStore.getState().leftSidebar) }),
      registry.register({ id: 'navigate.back', label: 'Go back', category: 'Navigation', execute: () => { const note = useWorkbenchStore.getState().goBack(); if (note) navigate(`/notes/${note}`) } }),
      registry.register({ id: 'navigate.forward', label: 'Go forward', category: 'Navigation', execute: () => { const note = useWorkbenchStore.getState().goForward(); if (note) navigate(`/notes/${note}`) } }),
      registry.register({ id: 'compute.runAll', label: 'Run all labs in current note', category: 'Compute', description: 'Open the note Lab and queue Run all', isAvailable: () => Boolean(activeNote()?.labs[0]), execute: () => { const lab = activeNote()?.labs[0]; if (!lab) return; setScratchOpen(false); setActiveLabId(lab.id); setPendingLabAction({ labId: lab.id, action: 'runAll' }) } }),
    ]
    return () => unregister.forEach((remove) => remove())
  }, [navigate, registry, requestNewNote, session, setActiveLabId, setPendingLabAction, setScratchOpen])

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
    if (status === 'idle' && (location.pathname === '/workspace' || location.pathname === '/knowledge' || location.pathname === '/database')) return <Navigate to="/" replace />
    return (
      <main className="route-status-page">
        <span className="workspace-spinner" />
        <h1>{status === 'error' ? 'Workspace 打开失败' : '正在准备 Workspace'}</h1>
        <p>{error || '正在读取 Markdown、索引和 Workspace 配置。'}</p>
        {status === 'error' && <Link to="/">返回 Workspace 首页</Link>}
      </main>
    )
  }

  return <CommandRegistryContext.Provider value={registry}>
    <ExtensionRuntimeContext.Provider value={extensionRuntime}>
      <div className={`app-workbench ${leftSidebar ? '' : 'app-workbench--sidebar-collapsed'}`}>
        <Sidebar />
        <div className="workbench-main">
          <TopBar />
          <WorkbenchTabs />
          <Outlet />
          <ExtensionStatusBar />
        </div>
        <SearchDialog />
        <CommandPalette />
        <Suspense fallback={null}><LabDrawer /></Suspense>
        <ComputeSettingsDialog />
        <ExtensionManagerDialog />
        <ExtensionViewDialog />
      </div>
    </ExtensionRuntimeContext.Provider>
  </CommandRegistryContext.Provider>
}
