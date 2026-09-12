import { Flask, Gear, List, ShareNetwork, ShieldCheck, ShieldWarning, SidebarSimple } from '@phosphor-icons/react'
import { useWorkbenchStore } from '../workbench/useWorkbenchStore'
import { useAppStore } from '../store/useAppStore'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import { Button } from './ui/Button'
import { useComputeStore } from '../store/useComputeStore'
import { WorkbenchTopTools } from './workbench/WorkbenchTabs'
import { useSidecarStore } from '../sidecar/useSidecarStore'

export function TopBar() {
  const kernelStatus = useAppStore((state) => state.kernelStatus)
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen)
  const setSettingsOpen = useAppStore((state) => state.setSettingsOpen)
  const setPublishOpen = useAppStore((state) => state.setPublishOpen)
  const setScratchOpen = useComputeStore((state) => state.setScratchOpen)
  const setLeftSidebar = useWorkbenchStore((state) => state.setSidebar)
  const leftSidebar = useWorkbenchStore((state) => state.leftSidebar)
  const activeNoteId = useWorkbenchStore((state) => state.activeNoteId)
  const revealHeading = useWorkbenchStore((state) => state.revealHeading)
  const session = useWorkspaceStore((state) => state.session)
  const trustActiveWorkspace = useWorkspaceStore((state) => state.trustActiveWorkspace)
  const headings = activeNoteId ? session?.documentById.get(activeNoteId)?.headings ?? [] : []
  if (!session) return null

  return (
    <header className="workbench-topbar">
      <Button className="mr-1 lg:hidden" variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} aria-label="打开目录"><List size={20} /></Button>
      {!leftSidebar && <Button className="sidebar-reopen-trigger" variant="ghost" size="icon" onClick={() => setLeftSidebar('left', true)} aria-label="展开文件侧栏" title="展开文件侧栏"><SidebarSimple size={18} /></Button>}
      <div className="workbench-topbar__spacer" />
      <WorkbenchTopTools />
      <div className="topbar-actions">
        {headings.length > 0 && <details className="outline-popover"><summary aria-label="打开大纲"><List size={18} /></summary><div className="outline-popover__panel"><header><strong>Outline</strong><span>{headings.length} sections</span></header>{headings.map((heading) => <button key={heading.id} style={{ paddingLeft: `${12 + (heading.depth - 1) * 12}px` }} onClick={(event) => { revealHeading(heading.id); event.currentTarget.closest('details')?.removeAttribute('open') }}>{heading.text}</button>)}</div></details>}
        {session.descriptor.trustKey && (
          session.trusted ? (
            <span className="trust-status trust-status--trusted" title="当前远程版本已受信任"><ShieldCheck size={14} />Trusted</span>
          ) : (
            <button className="trust-status trust-status--pending" onClick={trustActiveWorkspace} title="信任当前远程版本后允许执行代码"><ShieldWarning size={14} />Trust to run</button>
          )
        )}
        <Button variant="ghost" size="icon" className="publish-trigger" onClick={() => setPublishOpen(true)} aria-label="分享知识库" title="分享知识库"><ShareNetwork size={18} /></Button>
        <Button variant="ghost" size="icon" className="scratch-trigger" onClick={() => { useSidecarStore.getState().close(); setScratchOpen(true) }} aria-label="打开 Scratch Lab" title="Scratch Lab"><Flask size={18} /></Button>
        <Button className="settings-trigger" variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} aria-label="打开设置" title="设置"><Gear size={18} /><span className={`settings-trigger__status kernel-dot kernel-dot--${kernelStatus}`} /></Button>
      </div>
    </header>
  )
}
