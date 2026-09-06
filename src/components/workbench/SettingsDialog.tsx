import { Gear, X } from '@phosphor-icons/react'
import { SettingsContent } from '../../pages/SettingsPage'
import { useAppStore } from '../../store/useAppStore'
import { Button } from '../ui/Button'
import { ModalSurface } from '../ui/ModalSurface'

export function SettingsDialog() {
  const open = useAppStore((state) => state.settingsOpen)
  const section = useAppStore((state) => state.settingsSection)
  const setSettingsOpen = useAppStore((state) => state.setSettingsOpen)

  return <ModalSurface open={open} onOpenChange={setSettingsOpen} title="TensorNote 设置" layerClassName="settings-dialog-layer" className="settings-dialog">
      <header><span><Gear size={17} />设置</span><small>修改会自动保存</small><Button variant="ghost" size="icon" onClick={() => setSettingsOpen(false)} aria-label="关闭设置"><X size={18} /></Button></header>
      <div className="settings-dialog__body"><SettingsContent section={section} onSectionChange={(next) => setSettingsOpen(true, next)} /></div>
  </ModalSurface>
}
