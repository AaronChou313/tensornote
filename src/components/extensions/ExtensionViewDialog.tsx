import * as Dialog from '@radix-ui/react-dialog'
import { PuzzlePiece, X } from '@phosphor-icons/react'
import { useActiveExtensionView, useExtensionRuntime } from '../../extensions/ExtensionContext'
import { Button } from '../ui/Button'

export function ExtensionViewDialog() {
  const runtime = useExtensionRuntime()
  const view = useActiveExtensionView()
  return <Dialog.Root open={Boolean(view)} onOpenChange={(open) => { if (!open) runtime.closeActiveView() }}>
    <Dialog.Portal>
      <Dialog.Overlay className="extension-dialog-overlay" />
      <Dialog.Content className="extension-view-dialog">
        <header><span><PuzzlePiece size={19} /></span><div><Dialog.Title>{view?.title}</Dialog.Title><Dialog.Description>{view?.description || 'Extension view'}</Dialog.Description></div><Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="关闭扩展视图"><X size={18} /></Button></Dialog.Close></header>
        <div className="extension-view-dialog__body">{view?.body}</div>
        <footer><span>{view?.extensionId}</span><Dialog.Close asChild><Button variant="primary" size="sm">Done</Button></Dialog.Close></footer>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
