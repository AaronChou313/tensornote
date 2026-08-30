import { Command, Flask, List, MagnifyingGlass, Moon, ShieldCheck, ShieldWarning, SidebarSimple, Sun } from '@phosphor-icons/react'
import { useWorkbenchStore } from '../workbench/useWorkbenchStore'
import { useLocation, useParams } from 'react-router-dom'
import { findTrail } from '../content/noteTree'
import { useAppStore } from '../store/useAppStore'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import { Button } from './ui/Button'
import { activeComputeProfile, useComputeStore } from '../store/useComputeStore'

const statusLabels = {
  offline: 'Offline',
  starting: 'Starting',
  idle: 'Idle',
  busy: 'Busy',
  error: 'Error',
}

export function TopBar() {
  const { noteId } = useParams()
  const location = useLocation()
  const theme = useAppStore((state) => state.theme)
  const toggleTheme = useAppStore((state) => state.toggleTheme)
  const kernelStatus = useAppStore((state) => state.kernelStatus)
  const setSearchOpen = useAppStore((state) => state.setSearchOpen)
  const setCommandPaletteOpen = useAppStore((state) => state.setCommandPaletteOpen)
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen)
  const setActiveLabId = useAppStore((state) => state.setActiveLabId)
  const profiles = useComputeStore((state) => state.profiles)
  const activeProfileId = useComputeStore((state) => state.activeProfileId)
  const setSettingsOpen = useComputeStore((state) => state.setSettingsOpen)
  const setScratchOpen = useComputeStore((state) => state.setScratchOpen)
  const setLeftSidebar = useWorkbenchStore((state) => state.setSidebar)
  const leftSidebar = useWorkbenchStore((state) => state.leftSidebar)
  const profile = activeComputeProfile({ profiles, activeProfileId })
  const session = useWorkspaceStore((state) => state.session)
  const trustActiveWorkspace = useWorkspaceStore((state) => state.trustActiveWorkspace)
  const trail = noteId && session
    ? findTrail(noteId, session.navigation)
    : location.pathname === '/workspace' ? ['Overview'] : location.pathname === '/knowledge' ? ['Knowledge'] : []

  if (!session) return null

  return (
    <header className="workbench-topbar">
      <Button className="mr-1 lg:hidden" variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} aria-label="打开目录"><List size={20} /></Button>
      <div className="workbench-breadcrumbs">
        <span>{session.manifest.workspace.name}</span>
        {trail.map((label, index) => <span key={`${label}-${index}`}><i>/</i><strong>{label}</strong></span>)}
      </div>
      <div className="topbar-actions">
        {session.descriptor.type === 'github' && (
          session.trusted ? (
            <span className="trust-status trust-status--trusted" title="当前 GitHub Revision 已受信任"><ShieldCheck size={14} />Trusted</span>
          ) : (
            <button className="trust-status trust-status--pending" onClick={trustActiveWorkspace} title="信任当前 GitHub Revision 后允许执行代码"><ShieldWarning size={14} />Trust to run</button>
          )
        )}
        <Button variant="ghost" className="search-trigger" onClick={() => setSearchOpen(true)}>
          <span><MagnifyingGlass size={15} />Search</span><kbd>⌘K</kbd>
        </Button>
        <Button variant="ghost" className="command-trigger" onClick={() => setCommandPaletteOpen(true)} aria-label="打开命令面板"><Command size={15} /><span>Command</span><kbd>⌘P</kbd></Button>
        <Button variant="ghost" size="icon" onClick={() => setLeftSidebar('left', !leftSidebar)} aria-label={leftSidebar ? '收起文件侧栏' : '展开文件侧栏'}><SidebarSimple size={17} /></Button>
        <Button variant="ghost" className="scratch-trigger" onClick={() => { setActiveLabId(null); setScratchOpen(true) }}><Flask size={15} />Scratch</Button>
        <button className="kernel-status" title={`${profile.name} · ${profile.scope}`} onClick={() => setSettingsOpen(true)}><span className={`kernel-dot kernel-dot--${kernelStatus}`} /><span>{statusLabels[kernelStatus]}</span><small>{profile.name}</small></button>
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={theme === 'light' ? '切换深色模式' : '切换浅色模式'}>
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </Button>
      </div>
    </header>
  )
}
