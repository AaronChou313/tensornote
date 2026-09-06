import { useRef } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ArrowsOutLineHorizontal, Copy, DotsThree, PencilSimple, Trash } from '@phosphor-icons/react'
import type { FileDialogRequest } from './WorkspaceFileDialog'

type Props = {
  label: string
  path: string
  kind: 'file' | 'directory'
  noteId?: string
  onAction: (request: FileDialogRequest) => void
}

export function WorkspaceFileMenu({ label, path, kind, noteId, onAction }: Props) {
  const trigger = useRef<HTMLButtonElement>(null)
  const pending = useRef<FileDialogRequest | null>(null)
  const select = (action: FileDialogRequest['action']) => {
    pending.current = { action, path, kind, noteId }
  }
  return <DropdownMenu.Root modal={false}>
    <DropdownMenu.Trigger asChild>
      <button ref={trigger} aria-label={`${label} 文件操作`}><DotsThree size={15} weight="bold" /></button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content className="tree-action-menu" align="end" sideOffset={4} collisionPadding={8} loop
        onCloseAutoFocus={(event) => {
          const request = pending.current
          pending.current = null
          if (!request) return
          // Restore the menu trigger before the file dialog captures its return target.
          event.preventDefault()
          trigger.current?.focus({ preventScroll: true })
          onAction(request)
        }}>
        <DropdownMenu.Item onSelect={() => select('rename')}><PencilSimple size={14} />重命名</DropdownMenu.Item>
        <DropdownMenu.Item onSelect={() => select('move')}><ArrowsOutLineHorizontal size={14} />移动</DropdownMenu.Item>
        {kind === 'file' && <DropdownMenu.Item onSelect={() => select('duplicate')}><Copy size={14} />创建副本</DropdownMenu.Item>}
        <DropdownMenu.Item className="is-danger" onSelect={() => select('delete')}><Trash size={14} />删除</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>
}
