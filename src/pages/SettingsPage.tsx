import { GettingStarted } from '../components/GettingStarted'
import { lazy, Suspense, useMemo, useState, type ReactNode } from 'react'
import { ArrowClockwise, CheckCircle, Cpu, DownloadSimple, Gear, Info, Moon, NotePencil, PaintBrush, Plus, Pulse, PuzzlePiece, Sun, Trash } from '@phosphor-icons/react'
import { useSearchParams } from 'react-router-dom'
import { computeRuntime } from '../compute/ComputeRuntime'
import { formatComputeDiagnosticReport } from '../compute/compatibility'
import { computeConnectorKind } from '../compute/connectors'
import { computeProfileTemplates, type ComputeConnectorConfig, type ComputeContext, type ComputeSessionScope, type DiagnosticCheck } from '../compute/types'
import { getHostAdapter } from '../host/runtime'
import type { HostUpdateInfo, HostUpdateProgress } from '../host/types'
import { useExtensionRecords, useExtensionRuntime } from '../extensions/ExtensionContext'
import {
  COMPUTE_PROVIDER_API_VERSION,
  COMPUTE_CONNECTOR_API_VERSION,
  CURRENT_WORKSPACE_SCHEMA_VERSION,
  EXECUTABLE_MARKDOWN_SYNTAX_VERSION,
  EXTENSION_API_VERSION,
  SETTINGS_MODEL_VERSION,
  TENSORNOTE_VERSION,
  WORKSPACE_PROVIDER_API_VERSION,
} from '../platform'
import { useAppStore, type EditorMode, type SettingsSection } from '../store/useAppStore'
import { activeComputeProfile, useComputeStore } from '../store/useComputeStore'
import { useExtensionStore } from '../store/useExtensionStore'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import { resolveWorkspaceExecutionPolicy } from '../workspace/executionPolicy'
import { Button } from '../components/ui/Button'

const LocalRuntimeAssistant = import.meta.env.VITE_TENSORNOTE_HOST === 'desktop'
  ? lazy(() => import('../components/settings/LocalRuntimeAssistant'))
  : null

const settingsNavigation: Array<{ id: SettingsSection; label: string; icon: typeof PaintBrush }> = [
  { id: 'appearance', label: '外观', icon: PaintBrush },
  { id: 'editor', label: '编辑器', icon: NotePencil },
  { id: 'compute', label: '计算与 Jupyter', icon: Cpu },
  { id: 'extensions', label: '扩展', icon: PuzzlePiece },
  { id: 'about', label: '关于', icon: Info },
]

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

function SettingRow({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <div className="settings-row"><span><strong>{title}</strong><small>{description}</small></span><div>{children}</div></div>
}

function AppearanceSettings() {
  const theme = useAppStore((state) => state.theme)
  const setTheme = useAppStore((state) => state.setTheme)
  return <section className="settings-panel"><header><span>Interface</span><h2>外观</h2><p>保持工作区安静，让内容成为视觉中心。</p></header><div className="settings-group"><SettingRow title="主题" description="主题会保存在当前设备的应用设置中。"><div className="settings-choice-grid"><button className={theme === 'light' ? 'is-active' : ''} onClick={() => setTheme('light')}><Sun size={18} /><span><strong>浅色</strong><small>柔和的淡绿纸面</small></span>{theme === 'light' && <CheckCircle size={16} weight="fill" />}</button><button className={theme === 'dark' ? 'is-active' : ''} onClick={() => setTheme('dark')}><Moon size={18} /><span><strong>深色</strong><small>低眩光深绿灰</small></span>{theme === 'dark' && <CheckCircle size={16} weight="fill" />}</button></div></SettingRow></div></section>
}

function EditorSettings() {
  const mode = useAppStore((state) => state.editorDefaultMode)
  const lineNumbers = useAppStore((state) => state.editorLineNumbers)
  const wordWrap = useAppStore((state) => state.editorWordWrap)
  const setMode = useAppStore((state) => state.setEditorDefaultMode)
  const setLineNumbers = useAppStore((state) => state.setEditorLineNumbers)
  const setWordWrap = useAppStore((state) => state.setEditorWordWrap)
  return <section className="settings-panel"><header><span>Authoring</span><h2>编辑器</h2><p>这些选项会应用到之后打开的编辑窗格。</p></header><div className="settings-group"><SettingRow title="默认打开模式" description="阅读、源码编辑或编辑与预览并排。"><select value={mode} onChange={(event) => setMode(event.target.value as EditorMode)}><option value="read">阅读</option><option value="edit">编辑</option><option value="split">双栏预览</option></select></SettingRow><SettingRow title="显示行号" description="同时控制折叠标记栏。"><label className="settings-switch"><input type="checkbox" checked={lineNumbers} onChange={(event) => setLineNumbers(event.target.checked)} /><i /></label></SettingRow><SettingRow title="长行自动换行" description="关闭后可横向滚动查看源码。"><label className="settings-switch"><input type="checkbox" checked={wordWrap} onChange={(event) => setWordWrap(event.target.checked)} /><i /></label></SettingRow></div></section>
}

function ComputeSettings() {
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
  const profile = activeComputeProfile({ profiles, activeProfileId })
  const [diagnostics, setDiagnostics] = useState<DiagnosticCheck[]>([])
  const [diagnosing, setDiagnosing] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [reportCopied, setReportCopied] = useState(false)
  const token = tokens[profile.id] ?? ''
  const connectorKind = computeConnectorKind(profile.connector) as keyof typeof connectorLabels
  const computeContext = useMemo(() => computeContextFromSession(session), [session])
  const executionPolicy = session ? resolveWorkspaceExecutionPolicy(session, executionOverrides) : null
  const executionDescription = !session
    ? '打开 Workspace 后可配置执行权限。'
    : !executionPolicy?.canChange
      ? '该 Workspace 使用了尚不支持的配置版本，代码执行保持关闭。'
      : executionPolicy.enabled
        ? `已允许 ${session.manifest.workspace.name} 在所选 Compute Profile 中运行代码。`
        : '默认关闭。开启后，笔记实验和 Scratch Lab 可以向当前 Kernel 发送代码。'
  const diagnose = async () => {
    setDiagnosing(true)
    try { setDiagnostics(await computeRuntime.diagnose(profile, token, computeContext)) }
    catch (reason) { setDiagnostics([{ id: 'server', label: 'Diagnostics', status: 'fail', detail: reason instanceof Error ? reason.message : '诊断失败' }]) }
    finally { setDiagnosing(false) }
  }
  const prepare = async () => {
    setPreparing(true)
    setDiagnostics([])
    try { setDiagnostics(await computeRuntime.prepare(profile, token, computeContext)) }
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
  return (
    <section className="settings-panel">
      <header><span>Runtime</span><h2>计算与 Jupyter</h2><p>Workspace 与计算环境彼此独立；所有 Token 只保存在当前应用会话。</p></header>
      <GettingStarted context="compute" />
      <div className="settings-group settings-execution-group">
        <SettingRow title="允许当前 Workspace 执行代码" description={executionDescription}>
          <label className="settings-switch"><input type="checkbox" checked={executionPolicy?.enabled ?? false} disabled={!executionPolicy?.canChange} onChange={(event) => setActiveWorkspaceExecution(event.target.checked)} aria-label="允许当前 Workspace 执行代码" /><i /></label>
        </SettingRow>
        {session && <p className="settings-execution-note">{executionPolicy?.source === 'preference' ? '此授权保存在当前设备，可随时关闭。' : executionPolicy?.source === 'manifest' ? '当前默认值来自 tensornote.yaml；切换后将保存为本机偏好。' : '当前 Workspace 没有声明执行能力；开启后仅在本机生效。'}{session.descriptor.type === 'github' && !session.trusted ? ' GitHub Workspace 还需要信任当前 Revision。' : ''}</p>}
      </div>
      {LocalRuntimeAssistant && <Suspense fallback={<p className="settings-message">正在加载本地运行时助手…</p>}><LocalRuntimeAssistant /></Suspense>}
      <div className="settings-compute-layout">
        <aside className="settings-profile-list">
          <span>Profiles</span>
          {profiles.map((item) => <button key={item.id} className={item.id === profile.id ? 'is-active' : ''} onClick={() => { setActiveProfile(item.id); setDiagnostics([]) }}><Cpu size={16} /><span><strong>{item.name}</strong><small>{connectorLabels[computeConnectorKind(item.connector) as keyof typeof connectorLabels] ?? item.kind} · {item.scope}</small></span></button>)}
          <details><summary><Plus size={14} />添加 Profile</summary><div>{computeProfileTemplates.map((template) => <button key={template.name} onClick={() => addProfile(template)}><strong>{template.name}</strong><small>{template.description}</small></button>)}</div></details>
        </aside>
        <div className="settings-compute-form">
          <div className="settings-runtime-status">
            <span className={`kernel-dot kernel-dot--${kernelStatus}`} />
            <span><strong>{connectionEvent && connectionEvent.phase !== 'idle' ? connectionEvent.phase : kernelStatus}</strong><small>{connectionEvent && connectionEvent.phase !== 'idle' ? connectionEvent.message : profile.name}</small></span>
            {connectionEvent?.progress !== undefined && <progress max="100" value={connectionEvent.progress} />}
          </div>
          <div className="settings-connector-intro" data-connector={connectorKind}>
            <strong>{connectorLabels[connectorKind]}</strong>
            <p>{connectorKind === 'direct' ? '连接已经运行的标准 Jupyter Server；Server 与文件生命周期由你管理。' : connectorKind === 'jupyterhub' ? '验证当前用户身份，按需启动个人 Server；Token 模式还需要用户 Server 接受 WebSocket URL Token。' : '从公开 GitHub 的固定 commit 构建临时隔离环境；首次启动可能需要数分钟。'}</p>
          </div>
          <div className="settings-form-grid">
            <label><span>Profile 名称</span><input value={profile.name} onChange={(event) => updateProfile(profile.id, { name: event.target.value })} /></label>
            <label><span>连接方式</span><select value={connectorKind} onChange={(event) => updateProfile(profile.id, { connector: connectorDefaults(event.target.value as keyof typeof connectorLabels) })}><option value="direct">Generic Jupyter</option><option value="jupyterhub">JupyterHub</option><option value="binderhub">BinderHub</option></select></label>
            <label className="is-wide"><span>{connectorKind === 'direct' ? 'Server URL' : connectorKind === 'jupyterhub' ? 'Hub URL' : 'BinderHub URL'}</span><input value={profile.serverUrl} onChange={(event) => updateProfile(profile.id, { serverUrl: event.target.value })} placeholder={connectorKind === 'direct' ? (profile.id === 'remote-jupyter' ? 'https://jupyter.example.com/' : 'http://127.0.0.1:8888') : connectorKind === 'jupyterhub' ? 'https://jupyter.example.com' : 'https://mybinder.org'} /></label>
            <label><span>Kernel</span><input value={profile.kernelName} onChange={(event) => updateProfile(profile.id, { kernelName: event.target.value })} /></label>
            {connectorKind !== 'binderhub' && <label><span>{connectorKind === 'jupyterhub' ? 'Hub API Token' : 'Token'}</span><input type="password" value={token} onChange={(event) => setToken(profile.id, event.target.value)} placeholder={connectorKind === 'jupyterhub' ? '有限权限 Token' : 'Jupyter Token'} /></label>}
            {profile.connector?.kind === 'jupyterhub' && <><label><span>用户名（可选校验）</span><input value={profile.connector.username ?? ''} onChange={(event) => updateProfile(profile.id, { connector: { ...profile.connector!, username: event.target.value } as ComputeConnectorConfig })} placeholder="由 Token 自动识别" /></label><label><span>命名 Server</span><input value={profile.connector.serverName ?? ''} onChange={(event) => updateProfile(profile.id, { connector: { ...profile.connector!, serverName: event.target.value } as ComputeConnectorConfig })} placeholder="tensornote" /></label></>}
            {profile.connector?.kind === 'binderhub' && <><label><span>Repository（可选）</span><input value={profile.connector.repository ?? ''} onChange={(event) => updateProfile(profile.id, { connector: { ...profile.connector!, repository: event.target.value } as ComputeConnectorConfig })} placeholder="默认使用当前 GitHub Workspace" /></label><label><span>完整 commit SHA（可选）</span><input value={profile.connector.revision ?? ''} onChange={(event) => updateProfile(profile.id, { connector: { ...profile.connector!, revision: event.target.value } as ComputeConnectorConfig })} placeholder="默认使用当前固定 Revision" /></label></>}
          </div>
          {profile.connector?.kind === 'jupyterhub' && <SettingRow title="断开时停止 Server" description="只停止本次由 TensorNote 启动的实例；已有 Server 不受影响。"><label className="settings-switch"><input type="checkbox" checked={profile.connector.stopOnDisconnect !== false} onChange={(event) => updateProfile(profile.id, { connector: { ...profile.connector!, stopOnDisconnect: event.target.checked } as ComputeConnectorConfig })} /><i /></label></SettingRow>}
          {profile.connector?.kind === 'jupyterhub' && <p className="settings-execution-note">JupyterHub 5 的浏览器 Token 连接通常需要在单用户 Server 环境中设置 <code>JUPYTERHUB_ALLOW_TOKEN_IN_URL=1</code>；否则 REST 可通过但 Kernel WebSocket 会被拒绝。请仅在 HTTPS 下使用有限权限 Token。</p>}
          {profile.connector?.kind === 'binderhub' && <SettingRow title="断开时释放临时 Server" description="不会删除 GitHub Repository；Binder 文件与输出本就不持久。"><label className="settings-switch"><input type="checkbox" checked={profile.connector.shutdownOnDisconnect !== false} onChange={(event) => updateProfile(profile.id, { connector: { ...profile.connector!, shutdownOnDisconnect: event.target.checked } as ComputeConnectorConfig })} /><i /></label></SettingRow>}
          <div className="settings-scope-grid">{scopeLabels.map((scope) => <button key={scope.value} className={profile.scope === scope.value ? 'is-active' : ''} onClick={() => updateProfile(profile.id, { scope: scope.value })}><strong>{scope.label}</strong><small>{scope.detail}</small></button>)}</div>
          <div className="settings-compute-actions">
            <Button variant="secondary" size="sm" onClick={() => void diagnose()} disabled={diagnosing || preparing}><Pulse size={15} />{diagnosing ? '检查中' : '运行连接诊断'}</Button>
            {connectorKind !== 'direct' && <Button size="sm" onClick={() => void prepare()} disabled={preparing || diagnosing}>{preparing ? '正在准备环境…' : '启动并验证环境'}</Button>}
            {diagnostics.length > 0 && <Button variant="ghost" size="sm" onClick={() => void copyDiagnostics()}>{reportCopied ? '已复制无敏感信息报告' : '复制诊断报告'}</Button>}
            <Button variant="ghost" size="sm" onClick={() => void computeRuntime.shutdown()} disabled={kernelStatus === 'offline' && (!connectionEvent || ['idle', 'error'].includes(connectionEvent.phase))}>断开计算会话</Button>
            {profiles.length > 1 && <Button variant="ghost" size="sm" onClick={() => removeProfile(profile.id)}><Trash size={14} />删除 Profile</Button>}
          </div>
          {diagnostics.length > 0 && <div className="settings-diagnostics">{diagnostics.map((item, index) => <div key={`${item.id}-${index}`} data-status={item.status}><span>{item.status}</span><strong>{item.label}</strong><small>{item.detail}</small></div>)}</div>}
        </div>
      </div>
    </section>
  )
}

function ExtensionSettings() {
  const records = useExtensionRecords()
  const runtime = useExtensionRuntime()
  const setManagerOpen = useExtensionStore((state) => state.setManagerOpen)
  const setEnabled = useExtensionStore((state) => state.setEnabled)
  const [message, setMessage] = useState<string | null>(null)
  const toggle = async (id: string, active: boolean) => {
    try { if (active) await runtime.deactivate(id); else await runtime.activate(id); setEnabled(id, !active); setMessage(null) }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : '无法更新扩展状态') }
  }
  return <section className="settings-panel"><header><span>Platform</span><h2>扩展</h2><p>扩展入口集中在这里，不占用日常工作区工具栏。</p></header><div className="settings-group"><SettingRow title="本地扩展与权限" description="加载文件、查看权限和扩展贡献。"><Button variant="secondary" size="sm" onClick={() => setManagerOpen(true)}><PuzzlePiece size={15} />管理扩展</Button></SettingRow></div>{message && <p className="settings-message" role="alert">{message}</p>}<div className="settings-extension-list">{records.map((record) => { const active = record.status === 'active'; return <article key={record.manifest.id}><span><PuzzlePiece size={17} /></span><div><strong>{record.manifest.name}</strong><small>{record.manifest.description || record.manifest.id} · v{record.manifest.version}</small></div><label className="settings-switch"><input type="checkbox" checked={active} onChange={() => void toggle(record.manifest.id, active)} /><i /></label></article> })}</div></section>
}

function DesktopUpdateSettings() {
  const host = getHostAdapter()
  const [checking, setChecking] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [update, setUpdate] = useState<HostUpdateInfo | null>(null)
  const [progress, setProgress] = useState<HostUpdateProgress | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!host.capabilities.autoUpdate || !host.checkForUpdate || !host.downloadAndInstallUpdate) {
    return <div className="settings-update-card is-passive"><ArrowClockwise size={20} /><div><strong>更新由当前分发渠道管理</strong><p>Web 会随部署自动更新；正式 Desktop 安装包会在这里验证签名更新。</p></div></div>
  }

  const checkUpdate = async () => {
    setChecking(true)
    setError(null)
    setMessage(null)
    setProgress(null)
    try {
      const next = await host.checkForUpdate!()
      setUpdate(next)
      setMessage(next ? `发现 TensorNote v${next.version}` : '当前已是最新版本。')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '无法检查更新')
    } finally {
      setChecking(false)
    }
  }

  const installUpdate = async () => {
    setInstalling(true)
    setError(null)
    try {
      await host.downloadAndInstallUpdate!((next) => setProgress(next))
      setMessage('更新已验证并安装，重新启动后生效。')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '无法安装更新')
    } finally {
      setInstalling(false)
    }
  }

  const ratio = progress?.totalBytes ? Math.min(100, Math.round(progress.downloadedBytes / progress.totalBytes * 100)) : undefined
  return <div className="settings-update-card"><DownloadSimple size={20} /><div className="settings-update-card__body"><strong>安全更新</strong><p>只接受由 TensorNote Updater 公钥验证的 HTTPS Release 资产。</p>{update?.body && <small>{update.body}</small>}{progress && <progress max="100" value={ratio} />}{message && <span role="status">{message}</span>}{error && <span className="is-error" role="alert">{error}</span>}<div><Button variant="secondary" size="sm" onClick={() => void checkUpdate()} disabled={checking || installing}><ArrowClockwise size={14} />{checking ? '正在检查…' : '检查更新'}</Button>{update && progress?.phase !== 'ready' && <Button size="sm" onClick={() => void installUpdate()} disabled={installing}>{installing ? '正在安装…' : `安装 v${update.version}`}</Button>}{progress?.phase === 'ready' && host.relaunchAfterUpdate && <Button size="sm" onClick={() => void host.relaunchAfterUpdate!()}>重新启动</Button>}</div></div></div>
}

function AboutSettings() {
  const session = useWorkspaceStore((state) => state.session)
  const facts = useMemo(() => [
    ['TensorNote', `v${TENSORNOTE_VERSION}`],
    ['Runtime', getHostAdapter().label],
    ['Workspace', session?.manifest.workspace.name ?? 'None'],
    ['Provider', session?.descriptor.sourceLabel ?? 'None'],
  ], [session])
  const contracts = [
    `Workspace Schema v${CURRENT_WORKSPACE_SCHEMA_VERSION}`,
    `WorkspaceProvider v${WORKSPACE_PROVIDER_API_VERSION}`,
    `ComputeProvider v${COMPUTE_PROVIDER_API_VERSION}`,
    `ComputeConnector v${COMPUTE_CONNECTOR_API_VERSION}`,
    `Extension API v${EXTENSION_API_VERSION}`,
    `Executable Markdown v${EXECUTABLE_MARKDOWN_SYNTAX_VERSION}`,
    `Settings Model v${SETTINGS_MODEL_VERSION}`,
  ]
  return <section className="settings-panel"><header><span>System</span><h2>关于 TensorNote</h2><p>Markdown-first executable knowledge workspace。</p></header><div className="settings-about-grid">{facts.map(([label, value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div><DesktopUpdateSettings /><div className="settings-contracts"><span>Stable platform contracts</span><div>{contracts.map((contract) => <small key={contract}>{contract}</small>)}</div></div><div className="settings-principle"><Gear size={20} /><div><strong>内容始终属于你</strong><p>TensorNote 不会把知识锁进私有数据库。Markdown、图片、代码与 Git Repository 可以脱离应用继续使用。</p></div></div></section>
}

export function SettingsContent({ section, onSectionChange }: { section: SettingsSection; onSectionChange: (section: SettingsSection) => void }) {
  const content = section === 'appearance' ? <AppearanceSettings /> : section === 'editor' ? <EditorSettings /> : section === 'compute' ? <ComputeSettings /> : section === 'extensions' ? <ExtensionSettings /> : <AboutSettings />
  return <><aside className="settings-navigation"><header><span><Gear size={18} /></span><div><strong>设置</strong><small>TensorNote preferences</small></div></header><nav aria-label="设置分类">{settingsNavigation.map((item) => { const Icon = item.icon; return <button key={item.id} className={section === item.id ? 'is-active' : ''} onClick={() => onSectionChange(item.id)}><Icon size={16} />{item.label}</button> })}</nav></aside><div className="settings-content">{content}</div></>
}

export function SettingsPage() {
  const [params, setParams] = useSearchParams()
  const requested = params.get('section') as SettingsSection | null
  const section = settingsNavigation.some((item) => item.id === requested) ? requested! : 'appearance'
  return <main className="settings-page"><SettingsContent section={section} onSectionChange={(next) => setParams({ section: next })} /></main>
}
