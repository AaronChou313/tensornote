import { useMemo, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import {
  CheckCircle,
  Cpu,
  Flask,
  Plus,
  Pulse,
  Trash,
  WarningCircle,
  X,
  XCircle,
} from '@phosphor-icons/react'
import { computeRuntime } from '../compute/ComputeRuntime'
import { computeProfileTemplates, type ComputeSessionScope, type DiagnosticCheck } from '../compute/types'
import { useAppStore } from '../store/useAppStore'
import { activeComputeProfile, useComputeStore } from '../store/useComputeStore'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import { Button } from './ui/Button'

const scopeOptions: Array<{ value: ComputeSessionScope; label: string; detail: string }> = [
  { value: 'note', label: 'Per note', detail: '切换笔记时关闭 Kernel' },
  { value: 'workspace', label: 'Per workspace', detail: '整个 Workspace 复用 Kernel' },
  { value: 'manual', label: 'Manual', detail: '仅手动断开或关闭 Workspace' },
]

const diagnosticIcons = {
  pass: <CheckCircle size={16} weight="fill" />,
  fail: <XCircle size={16} weight="fill" />,
  warning: <WarningCircle size={16} weight="fill" />,
  skipped: <span className="diagnostic-dot" />,
  running: <span className="workspace-spinner" />,
}

export function ComputeSettingsDialog() {
  const open = useComputeStore((state) => state.settingsOpen)
  const setOpen = useComputeStore((state) => state.setSettingsOpen)
  const profiles = useComputeStore((state) => state.profiles)
  const activeProfileId = useComputeStore((state) => state.activeProfileId)
  const setActiveProfile = useComputeStore((state) => state.setActiveProfile)
  const addProfile = useComputeStore((state) => state.addProfile)
  const updateProfile = useComputeStore((state) => state.updateProfile)
  const removeProfile = useComputeStore((state) => state.removeProfile)
  const tokens = useComputeStore((state) => state.tokens)
  const setToken = useComputeStore((state) => state.setToken)
  const profile = activeComputeProfile({ profiles, activeProfileId })
  const kernelStatus = useAppStore((state) => state.kernelStatus)
  const session = useWorkspaceStore((state) => state.session)
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [removeConfirm, setRemoveConfirm] = useState(false)
  const [diagnostics, setDiagnostics] = useState<DiagnosticCheck[]>([])
  const [diagnosing, setDiagnosing] = useState(false)
  const token = tokens[profile.id] ?? ''
  const environmentFiles = session?.environmentFiles ?? []
  const scope = scopeOptions.find((option) => option.value === profile.scope)

  const statusText = useMemo(() => ({
    offline: 'No active session',
    starting: 'Starting session',
    idle: 'Kernel ready',
    busy: 'Kernel busy',
    error: 'Session error',
  })[kernelStatus], [kernelStatus])

  const diagnose = async () => {
    setDiagnosing(true)
    setDiagnostics([])
    try {
      setDiagnostics(await computeRuntime.diagnose(profile, token))
    } catch (reason) {
      setDiagnostics([{ id: 'server', label: 'Diagnostics', status: 'fail', detail: reason instanceof Error ? reason.message : '诊断失败' }])
    } finally {
      setDiagnosing(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) setTemplatesOpen(false) }}>
      <Dialog.Portal>
        <Dialog.Overlay className="compute-dialog-overlay" />
        <Dialog.Content className="compute-dialog">
          <Dialog.Title className="sr-only">Compute profiles</Dialog.Title>
          <Dialog.Description className="sr-only">配置 Jupyter Compute Provider、Kernel 生命周期和连接诊断。</Dialog.Description>

          <aside className="compute-profile-rail">
            <header><span>Compute</span><strong>Profiles</strong></header>
            <nav aria-label="Compute Profiles">
              {profiles.map((item) => (
                <button key={item.id} className={item.id === profile.id ? 'is-active' : ''} onClick={() => { setActiveProfile(item.id); setDiagnostics([]); setRemoveConfirm(false) }}>
                  <span><Cpu size={16} /></span>
                  <span><strong>{item.name}</strong><small>{item.kernelName} · {item.scope}</small></span>
                </button>
              ))}
            </nav>
            <button className="compute-add-profile" onClick={() => setTemplatesOpen((value) => !value)}><Plus size={15} />Add profile</button>
            {templatesOpen && <div className="compute-template-list">{computeProfileTemplates.map((template) => <button key={template.name} onClick={() => { addProfile(template); setTemplatesOpen(false); setDiagnostics([]) }}><strong>{template.name}</strong><small>{template.description}</small></button>)}</div>}
            <footer><span className={`kernel-dot kernel-dot--${kernelStatus}`} /><span><strong>{statusText}</strong><small>{profile.name}</small></span></footer>
          </aside>

          <div className="compute-dialog__main">
            <header className="compute-dialog__header">
              <div><span>Jupyter Compute Provider</span><h2>{profile.name}</h2><p>{scope?.detail}</p></div>
              <Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="关闭 Compute 设置"><X size={18} /></Button></Dialog.Close>
            </header>

            <div className="compute-dialog__content">
              <section className="compute-config-section">
                <div className="compute-section-heading"><div><span>01</span><h3>Connection</h3></div><small>Token 只保存在当前浏览器会话</small></div>
                <div className="compute-form-grid">
                  <label className="form-field"><span>Profile name</span><input value={profile.name} onChange={(event) => updateProfile(profile.id, { name: event.target.value })} /></label>
                  <label className="form-field compute-field-wide"><span>Server URL</span><input value={profile.serverUrl} onChange={(event) => updateProfile(profile.id, { serverUrl: event.target.value })} placeholder="http://127.0.0.1:8888" /></label>
                  <label className="form-field"><span>Kernel Name</span><input value={profile.kernelName} onChange={(event) => updateProfile(profile.id, { kernelName: event.target.value })} placeholder="tensornote" /></label>
                  <label className="form-field"><span>Token</span><input type="password" value={token} onChange={(event) => setToken(profile.id, event.target.value)} placeholder="Jupyter Token" /></label>
                </div>
              </section>

              <section className="compute-config-section">
                <div className="compute-section-heading"><div><span>02</span><h3>Session scope</h3></div><small>决定何时关闭 Kernel</small></div>
                <div className="scope-selector">{scopeOptions.map((option) => <button key={option.value} className={profile.scope === option.value ? 'is-active' : ''} onClick={() => updateProfile(profile.id, { scope: option.value })}><strong>{option.label}</strong><small>{option.detail}</small></button>)}</div>
              </section>

              <section className="compute-config-section compute-diagnostics-section">
                <div className="compute-section-heading"><div><span>03</span><h3>Connection diagnostics</h3></div><Button variant="secondary" size="sm" onClick={() => void diagnose()} disabled={diagnosing}><Pulse size={15} />{diagnosing ? 'Checking' : 'Run diagnostics'}</Button></div>
                {diagnosing && !diagnostics.length ? <div className="diagnostics-loading"><span className="workspace-spinner" /><span>依次检查 Browser、Server、Authentication、CORS、Kernel 与 WebSocket…</span></div> : diagnostics.length ? <div className="diagnostics-list">{diagnostics.map((check) => <div key={check.id} className={`diagnostic-item diagnostic-item--${check.status}`}><span>{diagnosticIcons[check.status]}</span><span><strong>{check.label}</strong><small>{check.detail}</small></span></div>)}</div> : <div className="compute-empty-state"><Pulse size={19} /><span>运行诊断不会安装依赖。WebSocket 检查会创建并立即关闭一个临时 Kernel。</span></div>}
              </section>

              <section className="compute-config-section">
                <div className="compute-section-heading"><div><span>04</span><h3>Workspace environment</h3></div><small>Detect only · never auto-install</small></div>
                {environmentFiles.length ? <div className="environment-files">{environmentFiles.map((file) => <div key={file.path} className={file.exists ? '' : 'is-missing'}><span><Flask size={15} /></span><span><strong>{file.path}</strong><small>{file.kind} · {file.declared ? 'declared' : 'detected'}</small></span><em>{file.exists ? 'Found' : 'Missing'}</em></div>)}</div> : <div className="compute-empty-state"><Flask size={19} /><span>未发现 requirements.txt、pyproject.toml 或 environment.yml。TensorNote 不会自动创建或安装环境。</span></div>}
              </section>
            </div>

            <footer className="compute-dialog__footer">
              <div>{removeConfirm ? <><span>删除 {profile.name}？</span><Button variant="ghost" size="sm" onClick={() => setRemoveConfirm(false)}>Cancel</Button><Button variant="danger" size="sm" onClick={() => { removeProfile(profile.id); setRemoveConfirm(false); setDiagnostics([]) }}>Delete</Button></> : profiles.length > 1 && <Button variant="ghost" size="sm" onClick={() => setRemoveConfirm(true)}><Trash size={14} />Remove profile</Button>}</div>
              <div><Button variant="secondary" size="sm" onClick={() => void computeRuntime.shutdown()} disabled={kernelStatus === 'offline'}>Disconnect</Button><Dialog.Close asChild><Button variant="primary" size="sm">Done</Button></Dialog.Close></div>
            </footer>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
