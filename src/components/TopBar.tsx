import { Command, Flask, Gear, List, ShieldCheck, ShieldWarning, SidebarSimple } from '@phosphor-icons/react'
import { useWorkbenchStore } from '../workbench/useWorkbenchStore'
import { useAppStore } from '../store/useAppStore'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import { Button } from './ui/Button'
import { useComputeStore } from '../store/useComputeStore'
import { WorkbenchTopTools } from './workbench/WorkbenchTabs'

export function TopBar() {
  const kernelStatus = useAppStore((state) => state.kernelStatus)
  const setCommandPaletteOpen = useAppStore((state) => state.setCommandPaletteOpen)
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen)
  const setActiveLabId = useAppStore((state) => state.setActiveLabId)
  const setSettingsOpen = useAppStore((state) => state.setSettingsOpen)
  const setScratchOpen = useComputeStore((state) => state.setScratchOpen)
  const setLeftSidebar = useWorkbenchStore((state) => state.setSidebar)
  const leftSidebar = useWorkbenchStore((state) => state.leftSidebar)
  const session = useWorkspaceStore((state) => state.session)
  const trustActiveWorkspace = useWorkspaceStore((state) => state.trustActiveWorkspace)
  if (!session) return null

  return (
    <header className="workbench-topbar">
      <Button className="mr-1 lg:hidden" variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} aria-label="打开目录"><List size={20} /></Button>
      {!leftSidebar && <Button className="sidebar-reopen-trigger" variant="ghost" size="icon" onClick={() => setLeftSidebar('left', true)} aria-label="展开文件侧栏" title="展开文件侧栏"><SidebarSimple size={18} /></Button>}
      <div className="workbench-topbar__spacer" />
      <WorkbenchTopTools />
      <div className="topbar-actions">
        {session.descriptor.type === 'github' && (
          session.trusted ? (
            <span className="trust-status trust-status--trusted" title="当前 GitHub Revision 已受信任"><ShieldCheck size={14} />Trusted</span>
          ) : (
            <button className="trust-status trust-status--pending" onClick={trustActiveWorkspace} title="信任当前 GitHub Revision 后允许执行代码"><ShieldWarning size={14} />Trust to run</button>
          )
        )}
        <Button variant="ghost" size="icon" className="command-trigger" onClick={() => setCommandPaletteOpen(true)} aria-label="打开命令面板" title="命令面板 (⌘P)"><Command size={18} /></Button>
        <Button variant="ghost" size="icon" className="scratch-trigger" onClick={() => { setActiveLabId(null); setScratchOpen(true) }} aria-label="打开 Scratch Lab" title="Scratch Lab"><Flask size={18} /></Button>
        <Button className="settings-trigger" variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} aria-label="打开设置" title="设置"><Gear size={18} /><span className={`settings-trigger__status kernel-dot kernel-dot--${kernelStatus}`} /></Button>
      </div>
    </header>
  )
}
