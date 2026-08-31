import { Gear, X } from '@phosphor-icons/react'
import { SettingsContent } from '../../pages/SettingsPage'
import { useAppStore } from '../../store/useAppStore'
import { Button } from '../ui/Button'

export function SettingsDialog() {
  const open = useAppStore((state) => state.settingsOpen)
  const section = useAppStore((state) => state.settingsSection)
  const setSettingsOpen = useAppStore((state) => state.setSettingsOpen)
  if (!open) return null

  return <div className="settings-dialog-layer" role="presentation" onMouseDown={() => setSettingsOpen(false)}>
    <section className="settings-dialog" role="dialog" aria-modal="true" aria-label="TensorNote 设置" onMouseDown={(event) => event.stopPropagation()}>
      <header><span><Gear size={17} />设置</span><small>修改会自动保存</small><Button variant="ghost" size="icon" onClick={() => setSettingsOpen(false)} aria-label="关闭设置"><X size={18} /></Button></header>
      <div className="settings-dialog__body"><SettingsContent section={section} onSectionChange={(next) => setSettingsOpen(true, next)} /></div>
    </section>
  </div>
}
