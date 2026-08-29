import * as Dialog from '@radix-ui/react-dialog'
import { X } from '@phosphor-icons/react'
import { useJupyterStore } from '../store/useJupyterStore'
import { Button } from './ui/Button'

export function JupyterSettingsDialog() {
  const open = useJupyterStore((state) => state.settingsOpen)
  const setOpen = useJupyterStore((state) => state.setSettingsOpen)
  const serverUrl = useJupyterStore((state) => state.serverUrl)
  const token = useJupyterStore((state) => state.token)
  const kernelName = useJupyterStore((state) => state.kernelName)
  const updateConfig = useJupyterStore((state) => state.updateConfig)

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-[#07110c]/40 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[71] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface-raised)] p-5 shadow-[0_24px_90px_rgba(17,32,24,0.24)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold tracking-[-0.02em]">连接 Jupyter Server</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm leading-6 text-[var(--muted)]">TensorNote 使用你本机的 Python 环境。Token 只保存在当前浏览器。</Dialog.Description>
            </div>
            <Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="关闭设置"><X size={18} /></Button></Dialog.Close>
          </div>
          <div className="mt-5 space-y-4">
            <label className="form-field">
              <span>Server URL</span>
              <input value={serverUrl} onChange={(event) => updateConfig({ serverUrl: event.target.value })} placeholder="http://127.0.0.1:8888" />
              <small>Jupyter Server 的地址，需要允许来自 localhost:5173 的跨域连接。</small>
            </label>
            <label className="form-field">
              <span>Token</span>
              <input type="password" value={token} onChange={(event) => updateConfig({ token: event.target.value })} placeholder="粘贴 Jupyter Token" />
              <small>保留 Token 身份验证，不建议关闭服务器安全验证。</small>
            </label>
            <label className="form-field">
              <span>Kernel Name</span>
              <input value={kernelName} onChange={(event) => updateConfig({ kernelName: event.target.value })} placeholder="python3" />
              <small>通常为 python3，可通过 jupyter kernelspec list 查看。</small>
            </label>
          </div>
          <div className="mt-6 flex justify-end">
            <Dialog.Close asChild><Button variant="primary">保存设置</Button></Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
