import { useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { CheckCircle, FolderOpen, LockKey, PuzzlePiece, ShieldWarning, Trash, X } from '@phosphor-icons/react'
import { useExtensionRecords, useExtensionRuntime, useExtensionSnapshot } from '../../extensions/ExtensionContext'
import { highRiskPermissions } from '../../extensions/manifest'
import { importLocalExtension, stageLocalExtension, type LocalExtensionBundle } from '../../extensions/localLoader'
import type { ExtensionPermission, ExtensionSetting } from '../../extensions/types'
import { useExtensionStore } from '../../store/useExtensionStore'
import { Button } from '../ui/Button'

const permissionLabels: Record<ExtensionPermission, string> = {
  'workspace:read': 'Read workspace files',
  'workspace:write': 'Write workspace files',
  network: 'Access the network',
  compute: 'Register compute providers',
  secret: 'Store session secrets',
}

function SettingControl({ setting }: { setting: ExtensionSetting & { extensionId: string } }) {
  const saved = useExtensionStore((state) => state.settings[setting.extensionId]?.[setting.key])
  const setSetting = useExtensionStore((state) => state.setSetting)
  const value = saved ?? setting.default
  return <label className="extension-setting">
    <span><strong>{setting.label}</strong>{setting.description && <small>{setting.description}</small>}</span>
    {setting.type === 'boolean'
      ? <input type="checkbox" checked={Boolean(value)} onChange={(event) => setSetting(setting.extensionId, setting.key, event.target.checked)} />
      : setting.type === 'select'
        ? <select value={String(value)} onChange={(event) => setSetting(setting.extensionId, setting.key, event.target.value)}>{setting.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
        : <input value={String(value)} onChange={(event) => setSetting(setting.extensionId, setting.key, event.target.value)} />}
  </label>
}

export function ExtensionManagerDialog() {
  const runtime = useExtensionRuntime()
  const records = useExtensionRecords()
  const contributions = useExtensionSnapshot()
  const open = useExtensionStore((state) => state.managerOpen)
  const setOpen = useExtensionStore((state) => state.setManagerOpen)
  const grants = useExtensionStore((state) => state.grants)
  const setGrants = useExtensionStore((state) => state.setGrants)
  const setEnabled = useExtensionStore((state) => state.setEnabled)
  const removeExtension = useExtensionStore((state) => state.removeExtension)
  const fileRef = useRef<HTMLInputElement>(null)
  const [staged, setStaged] = useState<LocalExtensionBundle | null>(null)
  const [selectedPermissions, setSelectedPermissions] = useState<ExtensionPermission[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const pickFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setMessage(null)
    try {
      const bundle = await stageLocalExtension(files)
      setStaged(bundle)
      setSelectedPermissions((bundle.manifest.permissions ?? []).filter((permission) => !highRiskPermissions.has(permission)))
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : '无法读取本地插件') }
  }

  const install = async () => {
    if (!staged || busy) return
    setBusy(true); setMessage(null)
    try {
      const module = await importLocalExtension(staged.script)
      setGrants(staged.manifest.id, selectedPermissions)
      await runtime.install(staged.manifest, module, 'local')
      await runtime.activate(staged.manifest.id)
      setEnabled(staged.manifest.id, true)
      setStaged(null)
      setMessage(`${staged.manifest.name} 已从本地文件加载`)
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : '本地插件安装失败') } finally { setBusy(false) }
  }

  const toggle = async (id: string, active: boolean) => {
    setMessage(null)
    try {
      if (active) await runtime.deactivate(id); else await runtime.activate(id)
      setEnabled(id, !active)
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : '扩展状态更新失败') }
  }

  const uninstall = async (id: string) => {
    await runtime.uninstall(id)
    removeExtension(id)
  }

  return <Dialog.Root open={open} onOpenChange={setOpen}>
    <Dialog.Portal>
      <Dialog.Overlay className="extension-dialog-overlay" />
      <Dialog.Content className="extension-manager-dialog">
        <header className="extension-manager__header">
          <span><PuzzlePiece size={21} weight="duotone" /></span>
          <div><Dialog.Title>Extensions</Dialog.Title><Dialog.Description>Official and local extensions for TensorNote</Dialog.Description></div>
          <Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="关闭扩展管理器"><X size={18} /></Button></Dialog.Close>
        </header>

        <div className="extension-manager__body">
          <section className="extension-intro">
            <div><strong>Extension API v1</strong><p>命令、视图、侧栏、Markdown、编辑器、设置、状态栏及 Provider 贡献点。</p></div>
            <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}><FolderOpen size={15} />Load local</Button>
            <input ref={fileRef} className="sr-only" type="file" multiple accept=".json,.js,.mjs" onChange={(event) => { void pickFiles(event.target.files); event.target.value = '' }} />
          </section>

          <aside className="extension-security-note"><ShieldWarning size={17} /><p><strong>Local extensions are trusted code.</strong> 权限会限制 TensorNote API 能力，但本地 JavaScript 仍在应用同源环境中运行，不是安全沙箱。仅加载你信任的文件。</p></aside>

          {staged && <section className="extension-permission-card">
            <header><div><span>Pending local extension</span><h3>{staged.manifest.name} <small>v{staged.manifest.version}</small></h3><p>{staged.manifest.description || staged.manifest.id}</p></div><button onClick={() => setStaged(null)} aria-label="取消加载"><X size={16} /></button></header>
            <div className="extension-permissions">
              {(staged.manifest.permissions ?? []).length ? staged.manifest.permissions?.map((permission) => <label key={permission} className={highRiskPermissions.has(permission) ? 'is-high-risk' : ''}><input type="checkbox" checked={selectedPermissions.includes(permission)} onChange={(event) => setSelectedPermissions((current) => event.target.checked ? [...current, permission] : current.filter((item) => item !== permission))} /><span><strong>{permissionLabels[permission]}</strong><small>{permission}{highRiskPermissions.has(permission) ? ' · high risk' : ''}</small></span></label>) : <p className="extension-no-permissions"><CheckCircle size={15} />This extension requests no privileged capabilities.</p>}
            </div>
            <footer><span><LockKey size={14} />脚本尚未执行</span><Button variant="primary" size="sm" onClick={() => void install()} disabled={busy}>{busy ? 'Loading…' : 'Trust & load'}</Button></footer>
          </section>}

          {message && <p className="extension-manager__message">{message}</p>}

          <section className="extension-list-section">
            <div className="extension-section-heading"><span>Installed</span><small>{records.length} extensions · no online marketplace</small></div>
            <div className="extension-list">{records.map((record) => {
              const active = record.status === 'active'
              const extensionSettings = contributions.settings.filter((setting) => setting.extensionId === record.manifest.id)
              return <article className={`extension-card extension-card--${record.status}`} key={record.manifest.id}>
                <div className="extension-card__icon"><PuzzlePiece size={19} /></div>
                <div className="extension-card__main">
                  <header><div><strong>{record.manifest.name}</strong><span>{record.source}</span><small>v{record.manifest.version}</small></div><button className={`extension-toggle ${active ? 'is-active' : ''}`} onClick={() => void toggle(record.manifest.id, active)} aria-label={`${active ? '停用' : '启用'} ${record.manifest.name}`} aria-pressed={active}><i /></button></header>
                  <p>{record.manifest.description || record.manifest.id}</p>
                  <div className="extension-card__meta"><span>{record.status}</span><span>{record.manifest.id}</span>{(record.manifest.permissions ?? []).map((permission) => <span key={permission} className={grants[record.manifest.id]?.includes(permission) ? 'is-granted' : ''}>{permission}</span>)}</div>
                  {record.error && <p className="extension-card__error">{record.error}</p>}
                  {extensionSettings.length > 0 && <div className="extension-settings">{extensionSettings.map((setting) => <SettingControl key={setting.key} setting={setting} />)}</div>}
                </div>
                {record.source === 'local' && <button className="extension-remove" onClick={() => void uninstall(record.manifest.id)} title="Unload local extension"><Trash size={15} /></button>}
              </article>
            })}</div>
          </section>

          <section className="extension-contribution-summary">
            <span>Active contributions</span>
            <div>{[
              ['Extensions', records.filter((record) => record.status === 'active').length],
              ['Views', contributions.views.length], ['Sidebar', contributions.sidebarItems.length],
              ['Markdown', contributions.markdownProcessors.length], ['Editor', contributions.editorExtensions.length],
              ['Providers', contributions.workspaceProviders.length + contributions.computeProviders.length],
            ].map(([label, count]) => <div key={label}><strong>{count}</strong><small>{label}</small></div>)}</div>
          </section>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
