import { useRef, type ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'

/** Shared focus and dismissal behavior for store-driven workbench dialogs. */
export function ModalSurface({ open, onOpenChange, title, layerClassName, className, children, afterClose }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  layerClassName: string
  className: string
  children: ReactNode
  afterClose?: () => void
}) {
  const returnFocus = useRef<HTMLElement | null>(null)
  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className={layerClassName}>
        <Dialog.Content className={className} aria-describedby={undefined}
          onOpenAutoFocus={() => { returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null }}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            if (returnFocus.current?.isConnected) returnFocus.current.focus({ preventScroll: true })
            afterClose?.()
          }}>
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          {children}
        </Dialog.Content>
      </Dialog.Overlay>
    </Dialog.Portal>
  </Dialog.Root>
}
