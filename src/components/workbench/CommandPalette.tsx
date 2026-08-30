import { useEffect, useState } from 'react'
import { Command, MagnifyingGlass, X } from '@phosphor-icons/react'
import { useAppStore } from '../../store/useAppStore'
import { useCommandRegistry } from '../../commands/CommandContext'

export function CommandPalette() {
  const registry = useCommandRegistry()
  const open = useAppStore((state) => state.commandPaletteOpen)
  const setOpen = useAppStore((state) => state.setCommandPaletteOpen)
  const [query, setQuery] = useState('')
  const [, refresh] = useState(0)
  const commands = registry.list(query)

  useEffect(() => registry.subscribe(() => refresh((value) => value + 1)), [registry])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'p') { event.preventDefault(); setOpen(!open) }
      if (event.key === 'Escape' && open) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])
  if (!open) return null
  return <div className="command-palette-layer" role="presentation" onMouseDown={() => setOpen(false)}>
    <section className="command-palette" role="dialog" aria-modal="true" aria-label="Command Palette" onMouseDown={(event) => event.stopPropagation()}>
      <header><Command size={18} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Type a command…" aria-label="搜索命令" /><button onClick={() => setOpen(false)} aria-label="关闭命令面板"><X size={16} /></button></header>
      <div className="command-palette__list">
        {commands.length ? commands.map((command) => <button key={command.id} onClick={() => { registry.execute(command.id); setOpen(false) }}>
          <span><strong>{command.label}</strong><small>{command.category}{command.description ? ` · ${command.description}` : ''}</small></span>{command.shortcut && <kbd>{command.shortcut}</kbd>}
        </button>) : <p><MagnifyingGlass size={16} />没有匹配的命令</p>}
      </div>
    </section>
  </div>
}
