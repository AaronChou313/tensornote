import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Cpu, Plus, Pulse, Trash, X } from '@phosphor-icons/react'
import { GettingStarted } from '../GettingStarted'
import { Button } from '../ui/Button'
import { computeRuntime } from '../../compute/ComputeRuntime'
import { formatComputeDiagnosticReport } from '../../compute/compatibility'
import { computeConnectorKind } from '../../compute/connectors'
import { profileRuntimeLocation, resolveComputeCapabilities, runtimeLocationsForCapabilities, type RuntimeLocation } from '../../compute/runtimeSettings'
import { computeProfileTemplates, type ComputeConnectorConfig, type ComputeContext, type ComputeKernelSpec, type ComputeSessionScope, type DiagnosticCheck } from '../../compute/types'
import { deploymentAdapter } from '../../deployment/config'
import { getHostAdapter } from '../../host/runtime'
import type { RuntimeDiscovery } from '../../host/types'
import { useAppStore } from '../../store/useAppStore'
import { useComputeStore } from '../../store/useComputeStore'
import { useWorkspaceStore } from '../../store/useWorkspaceStore'
import { resolveWorkspaceExecutionPolicy } from '../../workspace/executionPolicy'
import { ComputeRuntimeLocationTabs } from './ComputeRuntimeLocationTabs'
import { ComputeOverview } from './ComputeOverview'
import { LocalWebRuntimeGuide } from './LocalWebRuntimeGuide'
import { RemoteConnectionList } from './RemoteConnectionList'
import { ModalSurface } from '../ui/ModalSurface'

function SettingRow({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <div className="settings-row"><span><strong>{title}</strong><small>{description}</small></span><div>{children}</div></div>
}

const LocalRuntimeAssistant = import.meta.env.VITE_TENSORNOTE_HOST === 'desktop'
  ? lazy(() => import('./LocalRuntimeAssistant'))
  : null

const scopeLabels: Array<{ value: ComputeSessionScope; label: string; detail: string }> = [
  { value: 'note', label: '每篇笔记', detail: '切换笔记时关闭 Kernel' },
  { value: 'workspace', label: '整个 Workspace', detail: '同一 Workspace 复用 Kernel' },
  { value: 'manual', label: '手动管理', detail: '断开或离开 Workspace 时关闭' },
]

const connectorLabels = {
  direct: 'Generic Jupyter',
  jupyterhub: 'JupyterHub',
  binderhub: 'BinderHub',
} as const

function computeContextFromSession(session: ReturnType<typeof useWorkspaceStore.getState>['session']): ComputeContext {
  if (!session) return { workspaceId: 'workspace' }
  const owner = session.descriptor.config?.owner
  const repo = session.descriptor.config?.repo
  return {
    workspaceId: session.descriptor.id,
    ...(session.descriptor.type === 'github' && owner && repo && session.descriptor.revision
      ? { workspaceSource: { provider: 'github' as const, repository: `${owner}/${repo}`, revision: session.descriptor.revision } }
      : {}),
  }
}

function connectorDefaults(kind: keyof typeof connectorLabels): ComputeConnectorConfig {
  if (kind === 'jupyterhub') return { kind, serverName: 'tensornote', stopOnDisconnect: true }
  if (kind === 'binderhub') return { kind, shutdownOnDisconnect: true }
  return { kind: 'direct' }
}

export function ComputeSettings() {
  const session = useWorkspaceStore((state) => state.session)
  const executionOverrides = useWorkspaceStore((state) => state.executionOverrides)
  const setActiveWorkspaceExecution = useWorkspaceStore((state) => state.setActiveWorkspaceExecution)
  const profiles = useComputeStore((state) => state.profiles)
  const activeProfileId = useComputeStore((state) => state.activeProfileId)
  const tokens = useComputeStore((state) => state.tokens)
  const connectionEvent = useComputeStore((state) => state.connectionEvent)
  const setActiveProfile = useComputeStore((state) => state.setActiveProfile)
  const updateProfile = useComputeStore((state) => state.updateProfile)
  const addProfile = useComputeStore((state) => state.addProfile)
  const removeProfile = useComputeStore((state) => state.removeProfile)
  const setToken = useComputeStore((state) => state.setToken)
  const kernelStatus = useAppStore((state) => state.kernelStatus)
  const host = getHostAdapter()
  const computeCapabilities = resolveComputeCapabilities(deploymentAdapter.mode, host.capabilities)
  const runtimeLocations = runtimeLocationsForCapabilities(computeCapabilities)
  const [runtimeLocation, setRuntimeLocation] = useState<RuntimeLocation>(runtimeLocations[0])
  const [localManualVisible, setLocalManualVisible] = useState(false)
  const [remoteDetailsOpen, setRemoteDetailsOpen] = useState(false)
  const visibleProfiles = useMemo(() => profiles.filter((item) => !item.runtimeServerId && profileRuntimeLocation(item) === runtimeLocation), [profiles, runtimeLocation])
  const fallbackTemplate = useMemo(() => runtimeLocation === 'local' ? computeProfileTemplates[0] : computeProfileTemplates.find((item) => item.name === 'Remote Server')!, [runtimeLocation])
  const profile = visibleProfiles.find((item) => item.id === activeProfileId) ?? visibleProfiles[0] ?? { id: `new-${runtimeLocation}-profile`, ...fallbackTemplate }
  const [diagnostics, setDiagnostics] = useState<DiagnosticCheck[]>([])
  const [kernelDiscovery, setKernelDiscovery] = useState<{ profileId: string; kernels: ComputeKernelSpec[] }>({ profileId: '', kernels: [] })
  const [diagnosing, setDiagnosing] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [reportCopied, setReportCopied] = useState(false)
  const [runtimeDiscovery, setRuntimeDiscovery] = useState<RuntimeDiscovery>()
  const [discoveringRuntime, setDiscoveringRuntime] = useState(false)
  const token = tokens[profile.id] ?? ''
  const connectorKind = computeConnectorKind(profile.connector) as keyof typeof connectorLabels
  const discoverRuntime = useCallback(async () => {
    if (!computeCapabilities.environmentDiscovery || !host.discoverLocalRuntime) return
    setDiscoveringRuntime(true)
    try { setRuntimeDiscovery(await host.discoverLocalRuntime(session?.descriptor.id)) }
    finally { setDiscoveringRuntime(false) }
  }, [computeCapabilities.environmentDiscovery, host, session?.descriptor.id])
  useEffect(() => {
    const timeout = window.setTimeout(() => void discoverRuntime(), 0)
    return () => window.clearTimeout(timeout)
  }, [discoverRuntime])
  useEffect(() => {
    if (visibleProfiles.length === 0) {
      addProfile(fallbackTemplate)
    } else if (!visibleProfiles.some((item) => item.id === activeProfileId)) {
      setActiveProfile(visibleProfiles[0].id)
    }
  }, [activeProfileId, addProfile, fallbackTemplate, setActiveProfile, visibleProfiles])
  const computeContext = useMemo(() => computeContextFromSession(session), [session])
  const executionPolicy = session ? resolveWorkspaceExecutionPolicy(session, executionOverrides) : null
  const executionDescription = !session
    ? '打开 Workspace 后可配置执行权限。'
    : !executionPolicy?.canChange
      ? '该 Workspace 使用了尚不支持的配置版本，代码执行保持关闭。'
      : executionPolicy.enabled
        ? `已允许 ${session.manifest.workspace.name} 在所选 Compute Profile 中运行代码。`
        : '默认关闭。开启后，笔记实验和 Scratch Lab 可以向当前 Kernel 发送代码。'
  const discoverKernels = async () => {
    const kernels = await computeRuntime.listKernels(profile, token, computeContext)
    setKernelDiscovery({ profileId: profile.id, kernels })
    const preferred = kernels.find((item) => item.name === profile.kernelName) ?? kernels.find((item) => item.name === 'python3') ?? kernels[0]
    if (preferred && preferred.name !== profile.kernelName) updateProfile(profile.id, { kernelName: preferred.name })
    return kernels
  }
  const diagnose = async () => {
    setDiagnosing(true)
    try {
      const checks = await computeRuntime.diagnose(profile, token, computeContext)
      setDiagnostics(checks)
      if (!checks.some((check) => check.status === 'fail')) await discoverKernels()
    }
    catch (reason) { setDiagnostics([{ id: 'server', label: 'Diagnostics', status: 'fail', detail: reason instanceof Error ? reason.message : '诊断失败' }]) }
    finally { setDiagnosing(false) }
  }
  const prepare = async () => {
    setPreparing(true)
    setDiagnostics([])
    try {
      const checks = await computeRuntime.prepare(profile, token, computeContext)
      setDiagnostics(checks)
      if (!checks.some((check) => check.status === 'fail')) await discoverKernels()
    }
    catch (reason) {
      if (reason instanceof DOMException && reason.name === 'AbortError') setDiagnostics([])
      else setDiagnostics([{ id: 'server', label: 'Connection', status: 'fail', detail: reason instanceof Error ? reason.message : '连接失败' }])
    }
    finally { setPreparing(false) }
  }
  const copyDiagnostics = async () => {
    await navigator.clipboard.writeText(formatComputeDiagnosticReport(profile, diagnostics))
    setReportCopied(true)
    window.setTimeout(() => setReportCopied(false), 1800)
  }
  const profileForm = (
    <div className="settings-compute-form">
          <div className="settings-runtime-status">
            <span className={`kernel-dot kernel-dot--${kernelStatus}`} />
            <span><strong>{connectionEvent && connectionEvent.phase !== 'idle' ? connectionEvent.phase : kernelStatus}</strong><small>{connectionEvent && connectionEvent.phase !== 'idle' ? connectionEvent.message : profile.name}</small></span>
            {connectionEvent?.progress !== undefined && <progress max="100" value={connectionEvent.progress} />}
          </div>
          <div className="settings-connector-intro" data-connector={connectorKind}>
            <strong>{connectorLabels[connectorKind]}</strong>
            <p>{connectorKind === 'direct' ? `${runtimeLocation === 'local' ? '连接这台电脑上' : '连接远程'}已经运行的标准 Jupyter Server；Server 与文件生命周期由你管理。` : connectorKind === 'jupyterhub' ? '验证当前用户身份，按需启动个人 Server；Token 模式还需要用户 Server 接受 WebSocket URL Token。' : '从公开 GitHub 的固定 commit 构建临时隔离环境；首次启动可能需要数分钟。'}</p>
          </div>
          <div className="settings-form-grid">
            <label><span>Profile 名称</span><input value={profile.name} onChange={(event) => updateProfile(profile.id, { name: event.target.value })} /></label>
            <label><span>连接方式</span><select value={connectorKind} onChange={(event) => updateProfile(profile.id, { connector: connectorDefaults(event.target.value as keyof typeof connectorLabels), runtimeLocation })}><option value="direct">Generic Jupyter</option>{runtimeLocation === 'remote' && <><option value="jupyterhub">JupyterHub</option><option value="binderhub">BinderHub</option></>}</select></label>
            <label className="is-wide"><span>{connectorKind === 'direct' ? 'Server URL' : connectorKind === 'jupyterhub' ? 'Hub URL' : 'BinderHub URL'}</span><input value={profile.serverUrl} onChange={(event) => updateProfile(profile.id, { serverUrl: event.target.value, runtimeLocation })} placeholder={connectorKind === 'direct' ? (runtimeLocation === 'local' ? 'http://127.0.0.1:8888' : 'https://jupyter.example.com/') : connectorKind === 'jupyterhub' ? 'https://jupyter.example.com' : 'https://mybinder.org'} /></label>
            <label><span>Kernel</span>{kernelDiscovery.profileId === profile.id && kernelDiscovery.kernels.length ? <select value={profile.kernelName} onChange={(event) => updateProfile(profile.id, { kernelName: event.target.value })}>{kernelDiscovery.kernels.map((kernel) => <option key={kernel.name} value={kernel.name}>{kernel.displayName} · {kernel.name}</option>)}</select> : <input value={profile.kernelName} onChange={(event) => updateProfile(profile.id, { kernelName: event.target.value })} placeholder="连接验证后自动发现" />}</label>
            {connectorKind !== 'binderhub' && <label><span>{connectorKind === 'jupyterhub' ? 'Hub API Token' : 'Token'}</span><input type="password" value={token} onChange={(event) => setToken(profile.id, event.target.value)} placeholder={connectorKind === 'jupyterhub' ? '有限权限 Token' : 'Jupyter Token'} /></label>}
          </div>
          <details className="settings-compute-advanced">
            <summary>高级设置与会话生命周期</summary>
            <div className="settings-form-grid">
            <label className="is-wide"><span>手动覆盖 Kernel 名称</span><input value={profile.kernelName} onChange={(event) => updateProfile(profile.id, { kernelName: event.target.value })} placeholder="python3" /><small>通常无需填写；连接诊断会自动读取可用 Kernel。</small></label>
            <label className="is-wide"><span>Jupyter Workspace 路径</span><input value={profile.workspacePath ?? '.'} onChange={(event) => updateProfile(profile.id, { workspacePath: event.target.value })} placeholder="/srv/notebooks/my-workspace" /><small>Jupyter 进程中指向当前知识库根目录的路径；运行项目实验前会验证。</small></label>
            {profile.connector?.kind === 'jupyterhub' && <><label><span>用户名（可选校验）</span><input value={profile.connector.username ?? ''} onChange={(event) => updateProfile(profile.id, { connector: { ...profile.connector!, username: event.target.value } as ComputeConnectorConfig })} placeholder="由 Token 自动识别" /></label><label><span>命名 Server</span><input value={profile.connector.serverName ?? ''} onChange={(event) => updateProfile(profile.id, { connector: { ...profile.connector!, serverName: event.target.value } as ComputeConnectorConfig })} placeholder="tensornote" /></label></>}
            {profile.connector?.kind === 'binderhub' && <><label><span>Repository（可选）</span><input value={profile.connector.repository ?? ''} onChange={(event) => updateProfile(profile.id, { connector: { ...profile.connector!, repository: event.target.value } as ComputeConnectorConfig })} placeholder="默认使用当前 GitHub Workspace" /></label><label><span>完整 commit SHA（可选）</span><input value={profile.connector.revision ?? ''} onChange={(event) => updateProfile(profile.id, { connector: { ...profile.connector!, revision: event.target.value } as ComputeConnectorConfig })} placeholder="默认使用当前固定 Revision" /></label></>}
            </div>
          {profile.connector?.kind === 'jupyterhub' && <SettingRow title="断开时停止 Server" description="只停止本次由 TensorNote 启动的实例；已有 Server 不受影响。"><label className="settings-switch"><input type="checkbox" checked={profile.connector.stopOnDisconnect !== false} onChange={(event) => updateProfile(profile.id, { connector: { ...profile.connector!, stopOnDisconnect: event.target.checked } as ComputeConnectorConfig })} /><i /></label></SettingRow>}
          {profile.connector?.kind === 'jupyterhub' && <p className="settings-execution-note">JupyterHub 5 的浏览器 Token 连接通常需要在单用户 Server 环境中设置 <code>JUPYTERHUB_ALLOW_TOKEN_IN_URL=1</code>；否则 REST 可通过但 Kernel WebSocket 会被拒绝。请仅在 HTTPS 下使用有限权限 Token。</p>}
          {profile.connector?.kind === 'binderhub' && <SettingRow title="断开时释放临时 Server" description="不会删除 GitHub Repository；Binder 文件与输出本就不持久。"><label className="settings-switch"><input type="checkbox" checked={profile.connector.shutdownOnDisconnect !== false} onChange={(event) => updateProfile(profile.id, { connector: { ...profile.connector!, shutdownOnDisconnect: event.target.checked } as ComputeConnectorConfig })} /><i /></label></SettingRow>}
          <div className="settings-scope-grid">{scopeLabels.map((scope) => <button key={scope.value} className={profile.scope === scope.value ? 'is-active' : ''} onClick={() => updateProfile(profile.id, { scope: scope.value })}><strong>{scope.label}</strong><small>{scope.detail}</small></button>)}</div>
          </details>
          <div className="settings-compute-actions">
            <Button variant="secondary" size="sm" onClick={() => void diagnose()} disabled={diagnosing || preparing}><Pulse size={15} />{diagnosing ? '检查中' : '运行连接诊断'}</Button>
            {connectorKind !== 'direct' && <Button size="sm" onClick={() => void prepare()} disabled={preparing || diagnosing}>{preparing ? '正在准备环境…' : '启动并验证环境'}</Button>}
            {diagnostics.length > 0 && <Button variant="ghost" size="sm" onClick={() => void copyDiagnostics()}>{reportCopied ? '已复制无敏感信息报告' : '复制诊断报告'}</Button>}
            <Button variant="ghost" size="sm" onClick={() => void computeRuntime.shutdown()} disabled={kernelStatus === 'offline' && (!connectionEvent || ['idle', 'error'].includes(connectionEvent.phase))}>断开计算会话</Button>
            {profiles.length > 1 && <Button variant="ghost" size="sm" onClick={() => removeProfile(profile.id)}><Trash size={14} />删除 Profile</Button>}
          </div>
          {diagnostics.length > 0 && <div className="settings-diagnostics">{diagnostics.map((item, index) => <div key={`${item.id}-${index}`} data-status={item.status}><span>{item.status}</span><strong>{item.label}</strong><small>{item.detail}</small></div>)}</div>}
        </div>
  )
  return (
    <section className="settings-panel">
      <header><span>Runtime</span><h2>计算与 Jupyter</h2><p>Workspace 与计算环境彼此独立；所有 Token 只保存在当前应用会话。</p></header>
      <ComputeOverview capabilities={computeCapabilities} platformLabel={deploymentAdapter.label} discovery={runtimeDiscovery} discovering={discoveringRuntime} activeComputeName={profile.name} kernelStatus={kernelStatus} onRediscover={computeCapabilities.environmentDiscovery ? () => void discoverRuntime() : undefined} />
      <GettingStarted context="compute" />
      <div className="settings-group settings-execution-group">
        <SettingRow title="允许当前 Workspace 执行代码" description={executionDescription}>
          <label className="settings-switch"><input type="checkbox" checked={executionPolicy?.enabled ?? false} disabled={!executionPolicy?.canChange} onChange={(event) => setActiveWorkspaceExecution(event.target.checked)} aria-label="允许当前 Workspace 执行代码" /><i /></label>
        </SettingRow>
        {session && <p className="settings-execution-note">{executionPolicy?.source === 'preference' ? '此授权保存在当前设备，可随时关闭。' : executionPolicy?.source === 'manifest' ? '当前默认值来自 tensornote.yaml；切换后将保存为本机偏好。' : '当前 Workspace 没有声明执行能力；开启后仅在本机生效。'}{session.descriptor.type === 'github' && !session.trusted ? ' GitHub Workspace 还需要信任当前 Revision。' : ''}</p>}
      </div>
      <ComputeRuntimeLocationTabs capabilities={computeCapabilities} value={runtimeLocation} onChange={(location) => { setRuntimeLocation(location); setDiagnostics([]) }} />
      <div className="settings-runtime-heading"><span>{runtimeLocation === 'local' ? 'Local runtime' : 'Remote runtime'}</span><h3>{runtimeLocation === 'local' ? '在这台电脑上运行' : '连接远程计算环境'}</h3><p>{runtimeLocation === 'local' ? (computeCapabilities.environmentManagement ? '便捷连接由 TensorNote 管理环境和 Server；手动连接适合你已经启动的 Jupyter。' : '浏览器不能启动本机进程。请先自行启动 Jupyter Server，再填写连接信息。') : '计算资源位于其他设备或云平台。在线版要求 HTTPS，并需要服务端允许当前网页来源和 WebSocket。'}</p></div>
      {runtimeLocation === 'local' && !LocalRuntimeAssistant && <LocalWebRuntimeGuide />}
      {runtimeLocation === 'local' && LocalRuntimeAssistant && <Suspense fallback={<p className="settings-message">正在加载本地环境…</p>}><LocalRuntimeAssistant onRequestExistingJupyter={() => setLocalManualVisible(true)} /></Suspense>}
      {(runtimeLocation === 'remote' || !computeCapabilities.environmentManagement || localManualVisible) && <>
      {runtimeLocation === 'local' && <div className="settings-connection-label"><div><strong>已有 Jupyter Server</strong><small>自行启动 Server，再填写地址、Kernel 与 Token</small></div></div>}
      {runtimeLocation === 'remote' ? <>
        <RemoteConnectionList profiles={visibleProfiles} activeProfileId={profile.id} kernelStatus={kernelStatus} onSelect={(id) => { setActiveProfile(id); setDiagnostics([]) }} onAdd={() => { const id = addProfile(computeProfileTemplates.find((item) => item.name === 'Remote Server')!); setActiveProfile(id); setDiagnostics([]); setRemoteDetailsOpen(true) }} onEdit={(id) => { setActiveProfile(id); setDiagnostics([]); setRemoteDetailsOpen(true) }} />
        <ModalSurface open={remoteDetailsOpen} onOpenChange={setRemoteDetailsOpen} title="远程连接详情" layerClassName="extension-dialog-overlay" className="remote-connection-dialog"><header><div><small>Remote compute</small><strong>{profile.name}</strong><p>配置连接、验证环境和会话范围。</p></div><button className="icon-button" onClick={() => setRemoteDetailsOpen(false)} aria-label="关闭"><X size={17} /></button></header>{profileForm}</ModalSurface>
      </> : <div className="settings-compute-layout">
        <aside className="settings-profile-list">
          <span>{runtimeLocation === 'local' ? '手动连接' : '远程 Profiles'}</span>
          {visibleProfiles.map((item) => <button key={item.id} className={item.id === profile.id ? 'is-active' : ''} onClick={() => { setActiveProfile(item.id); setDiagnostics([]) }}><Cpu size={16} /><span><strong>{item.name}</strong><small>{connectorLabels[computeConnectorKind(item.connector) as keyof typeof connectorLabels] ?? item.kind} · {item.scope}</small></span></button>)}
          <details><summary><Plus size={14} />添加连接</summary><div>{computeProfileTemplates.filter((template) => profileRuntimeLocation(template) === runtimeLocation).map((template) => <button key={template.name} onClick={() => addProfile(template)}><strong>{template.name}</strong><small>{template.description}</small></button>)}</div></details>
        </aside>
        {profileForm}
      </div>}
      </>}
    </section>
  )
}
