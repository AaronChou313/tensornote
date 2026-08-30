import { PuzzlePiece } from '@phosphor-icons/react'
import { useCommandRegistry } from '../../commands/CommandContext'
import { useExtensionSnapshot } from '../../extensions/ExtensionContext'
import { useExtensionStore } from '../../store/useExtensionStore'

export function ExtensionStatusBar() {
  const registry = useCommandRegistry()
  const items = useExtensionSnapshot().statusBarItems
  const setManagerOpen = useExtensionStore((state) => state.setManagerOpen)
  const left = items.filter((item) => item.align !== 'right')
  const right = items.filter((item) => item.align === 'right')
  const renderItem = (item: typeof items[number]) => <button key={`${item.extensionId}:${item.id}`} title={item.tooltip || item.label} onClick={() => item.commandId && registry.execute(item.commandId)} disabled={!item.commandId}>{item.label}</button>
  return <footer className="extension-status-bar" aria-label="Extension status bar">
    <div>{left.map(renderItem)}</div>
    <div>{right.map(renderItem)}<button onClick={() => setManagerOpen(true)} title="Manage extensions"><PuzzlePiece size={12} />{items.length} active item{items.length === 1 ? '' : 's'}</button></div>
  </footer>
}
