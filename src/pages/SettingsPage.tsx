import { ComputeSettings } from '../components/settings/ComputeSettings'
import { useMemo, useState, type ReactNode } from 'react'
import { ArrowClockwise, CheckCircle, Cpu, DownloadSimple, Gear, Info, Moon, NotePencil, PaintBrush, Sun } from '@phosphor-icons/react'
import { useSearchParams } from 'react-router-dom'
import { getHostAdapter } from '../host/runtime'
import type { HostUpdateInfo, HostUpdateProgress } from '../host/types'
import {
  COMPUTE_PROVIDER_API_VERSION,
  COMPUTE_CONNECTOR_API_VERSION,
  CURRENT_WORKSPACE_SCHEMA_VERSION,
  EXECUTABLE_MARKDOWN_SYNTAX_VERSION,
  SETTINGS_MODEL_VERSION,
  TENSORNOTE_VERSION,
  WORKSPACE_PROVIDER_API_VERSION,
} from '../platform'
import { useAppStore, type EditorMode, type SettingsSection } from '../store/useAppStore'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import { Button } from '../components/ui/Button'

const settingsNavigation: Array<{ id: SettingsSection; label: string; icon: typeof PaintBrush }> = [
  { id: 'appearance', label: '外观', icon: PaintBrush },
  { id: 'editor', label: '编辑器', icon: NotePencil },
  { id: 'compute', label: '计算与 Jupyter', icon: Cpu },
  { id: 'about', label: '关于', icon: Info },
]

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
    `Executable Markdown v${EXECUTABLE_MARKDOWN_SYNTAX_VERSION}`,
    `Settings Model v${SETTINGS_MODEL_VERSION}`,
  ]
  return <section className="settings-panel"><header><span>System</span><h2>关于 TensorNote</h2><p>Markdown-first executable knowledge workspace。</p></header><div className="settings-about-grid">{facts.map(([label, value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div><DesktopUpdateSettings /><div className="settings-contracts"><span>Stable platform contracts</span><div>{contracts.map((contract) => <small key={contract}>{contract}</small>)}</div></div><div className="settings-principle"><Gear size={20} /><div><strong>内容始终属于你</strong><p>TensorNote 不会把知识锁进私有数据库。Markdown、图片、代码与 Git Repository 可以脱离应用继续使用。</p></div></div></section>
}

export function SettingsContent({ section, onSectionChange }: { section: SettingsSection; onSectionChange: (section: SettingsSection) => void }) {
  const content = section === 'appearance' ? <AppearanceSettings /> : section === 'editor' ? <EditorSettings /> : section === 'compute' ? <ComputeSettings /> : <AboutSettings />
  return <><aside className="settings-navigation"><header><span><Gear size={18} /></span><div><strong>设置</strong><small>TensorNote preferences</small></div></header><nav aria-label="设置分类">{settingsNavigation.map((item) => { const Icon = item.icon; return <button key={item.id} className={section === item.id ? 'is-active' : ''} onClick={() => onSectionChange(item.id)}><Icon size={16} />{item.label}</button> })}</nav></aside><div className="settings-content">{content}</div></>
}

export function SettingsPage() {
  const [params, setParams] = useSearchParams()
  const requested = params.get('section') as SettingsSection | null
  const section = settingsNavigation.some((item) => item.id === requested) ? requested! : 'appearance'
  return <main className="settings-page"><SettingsContent section={section} onSectionChange={(next) => setParams({ section: next })} /></main>
}
