import { lazy, Suspense, useMemo, useState, type ReactNode } from 'react'
import { CheckCircle, Cpu, Gear, Info, Moon, NotePencil, PaintBrush, Plus, Pulse, PuzzlePiece, Sun, Trash } from '@phosphor-icons/react'
import { useSearchParams } from 'react-router-dom'
import { computeRuntime } from '../compute/ComputeRuntime'
import { computeProfileTemplates, type ComputeSessionScope, type DiagnosticCheck } from '../compute/types'
import { getHostAdapter } from '../host/runtime'
import { useExtensionRecords, useExtensionRuntime } from '../extensions/ExtensionContext'
import {
  COMPUTE_PROVIDER_API_VERSION,
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
  { value: 'manual', label: '手动管理', detail: '只在手动断开时关闭' },
]

function SettingRow({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <div className="settings-row"><span><strong>{title}</strong><small>{description}</small></span><div>{children}</div></div>
}

function AppearanceSettings() {
  const theme = useAppStore((state) => state.theme)
  const setTheme = useAppStore((state) => state.setTheme)
  return <section className="settings-panel"><header><span>Interface</span><h2>外观</h2><p>保持工作区安静，让内容成为视觉中心。</p></header><div className="settings-group"><SettingRow title="主题" description="主题会保存在当前浏览器中。"><div className="settings-choice-grid"><button className={theme === 'light' ? 'is-active' : ''} onClick={() => setTheme('light')}><Sun size={18} /><span><strong>浅色</strong><small>柔和的淡绿纸面</small></span>{theme === 'light' && <CheckCircle size={16} weight="fill" />}</button><button className={theme === 'dark' ? 'is-active' : ''} onClick={() => setTheme('dark')}><Moon size={18} /><span><strong>深色</strong><small>低眩光深绿灰</small></span>{theme === 'dark' && <CheckCircle size={16} weight="fill" />}</button></div></SettingRow></div></section>
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
  const setActiveProfile = useComputeStore((state) => state.setActiveProfile)
  const updateProfile = useComputeStore((state) => state.updateProfile)
  const addProfile = useComputeStore((state) => state.addProfile)
  const removeProfile = useComputeStore((state) => state.removeProfile)
  const setToken = useComputeStore((state) => state.setToken)
  const kernelStatus = useAppStore((state) => state.kernelStatus)
  const profile = activeComputeProfile({ profiles, activeProfileId })
  const [diagnostics, setDiagnostics] = useState<DiagnosticCheck[]>([])
  const [diagnosing, setDiagnosing] = useState(false)
  const token = tokens[profile.id] ?? ''
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
    try { setDiagnostics(await computeRuntime.diagnose(profile, token)) }
    catch (reason) { setDiagnostics([{ id: 'server', label: 'Diagnostics', status: 'fail', detail: reason instanceof Error ? reason.message : '诊断失败' }]) }
    finally { setDiagnosing(false) }
  }
  return <section className="settings-panel"><header><span>Runtime</span><h2>计算与 Jupyter</h2><p>Token 仅保存在当前浏览器会话，不写入 Workspace。</p></header><div className="settings-group settings-execution-group"><SettingRow title="允许当前 Workspace 执行代码" description={executionDescription}><label className="settings-switch"><input type="checkbox" checked={executionPolicy?.enabled ?? false} disabled={!executionPolicy?.canChange} onChange={(event) => setActiveWorkspaceExecution(event.target.checked)} aria-label="允许当前 Workspace 执行代码" /><i /></label></SettingRow>{session && <p className="settings-execution-note">{executionPolicy?.source === 'preference' ? '此授权保存在当前浏览器中，可随时关闭。' : executionPolicy?.source === 'manifest' ? '当前默认值来自 tensornote.yaml；切换后将保存为本机偏好。' : '当前 Workspace 没有声明执行能力；开启后仅在本机生效。'}{session.descriptor.type === 'github' && !session.trusted ? ' GitHub Workspace 还需要信任当前 Revision。' : ''}</p>}</div>{LocalRuntimeAssistant && <Suspense fallback={<p className="settings-message">正在加载本地运行时助手…</p>}><LocalRuntimeAssistant /></Suspense>}<div className="settings-compute-layout"><aside className="settings-profile-list"><span>Profiles</span>{profiles.map((item) => <button key={item.id} className={item.id === profile.id ? 'is-active' : ''} onClick={() => { setActiveProfile(item.id); setDiagnostics([]) }}><Cpu size={16} /><span><strong>{item.name}</strong><small>{item.kernelName} · {item.scope}</small></span></button>)}<details><summary><Plus size={14} />添加 Profile</summary><div>{computeProfileTemplates.map((template) => <button key={template.name} onClick={() => addProfile(template)}><strong>{template.name}</strong><small>{template.description}</small></button>)}</div></details></aside><div className="settings-compute-form"><div className="settings-runtime-status"><span className={`kernel-dot kernel-dot--${kernelStatus}`} /><span><strong>{kernelStatus}</strong><small>{profile.name}</small></span></div><div className="settings-form-grid"><label><span>Profile 名称</span><input value={profile.name} onChange={(event) => updateProfile(profile.id, { name: event.target.value })} /></label><label className="is-wide"><span>Server URL</span><input value={profile.serverUrl} onChange={(event) => updateProfile(profile.id, { serverUrl: event.target.value })} placeholder="http://127.0.0.1:8888" /></label><label><span>Kernel</span><input value={profile.kernelName} onChange={(event) => updateProfile(profile.id, { kernelName: event.target.value })} /></label><label><span>Token</span><input type="password" value={token} onChange={(event) => setToken(profile.id, event.target.value)} placeholder="Jupyter Token" /></label></div><div className="settings-scope-grid">{scopeLabels.map((scope) => <button key={scope.value} className={profile.scope === scope.value ? 'is-active' : ''} onClick={() => updateProfile(profile.id, { scope: scope.value })}><strong>{scope.label}</strong><small>{scope.detail}</small></button>)}</div><div className="settings-compute-actions"><Button variant="secondary" size="sm" onClick={() => void diagnose()} disabled={diagnosing}><Pulse size={15} />{diagnosing ? '检查中' : '运行连接诊断'}</Button><Button variant="ghost" size="sm" onClick={() => void computeRuntime.shutdown()} disabled={kernelStatus === 'offline'}>断开 Kernel</Button>{profiles.length > 1 && <Button variant="ghost" size="sm" onClick={() => removeProfile(profile.id)}><Trash size={14} />删除 Profile</Button>}</div>{diagnostics.length > 0 && <div className="settings-diagnostics">{diagnostics.map((item) => <div key={item.id} data-status={item.status}><span>{item.status}</span><strong>{item.label}</strong><small>{item.detail}</small></div>)}</div>}</div></div></section>
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
    `Extension API v${EXTENSION_API_VERSION}`,
    `Executable Markdown v${EXECUTABLE_MARKDOWN_SYNTAX_VERSION}`,
    `Settings Model v${SETTINGS_MODEL_VERSION}`,
  ]
  return <section className="settings-panel"><header><span>System</span><h2>关于 TensorNote</h2><p>Markdown-first executable knowledge workspace。</p></header><div className="settings-about-grid">{facts.map(([label, value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div><div className="settings-contracts"><span>Stable platform contracts</span><div>{contracts.map((contract) => <small key={contract}>{contract}</small>)}</div></div><div className="settings-principle"><Gear size={20} /><div><strong>内容始终属于你</strong><p>TensorNote 不会把知识锁进私有数据库。Markdown、图片、代码与 Git Repository 可以脱离应用继续使用。</p></div></div></section>
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
