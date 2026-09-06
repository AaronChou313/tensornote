import { useEffect, useId, useRef, useState } from 'react'
import { Command, MagnifyingGlass, X } from '@phosphor-icons/react'
import { useAppStore } from '../../store/useAppStore'
import { useCommandRegistry } from '../../commands/CommandContext'
import { ModalSurface } from '../ui/ModalSurface'

export function CommandPalette() {
  const registry = useCommandRegistry()
  const open = useAppStore((state) => state.commandPaletteOpen)
  const setOpen = useAppStore((state) => state.setCommandPaletteOpen)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const [, refresh] = useState(0)
  const listId = useId()
  const list = useRef<HTMLDivElement>(null)
  const pendingCommand = useRef<string | null>(null)
  const commands = registry.list(query)
  const activeIndex = Math.min(selected, Math.max(0, commands.length - 1))

  const changeOpen = (next: boolean) => {
    setQuery('')
    setSelected(0)
    setOpen(next)
  }
  const execute = (id: string) => {
    pendingCommand.current = id
    changeOpen(false)
  }

  useEffect(() => registry.subscribe(() => refresh((value) => value + 1)), [registry])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.isComposing) return
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'p') {
        event.preventDefault()
        // A different modal owns keyboard input until it is dismissed.
        if (!open && document.querySelector('[role="dialog"]')) return
        setQuery('')
        setSelected(0)
        setOpen(!open)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])
  useEffect(() => {
    if (open) list.current?.children[activeIndex]?.scrollIntoView?.({ block: 'nearest' })
  }, [activeIndex, open, query])

  return <ModalSurface open={open} onOpenChange={changeOpen} title="命令面板" layerClassName="command-palette-layer" className="command-palette" afterClose={() => {
    const id = pendingCommand.current
    pendingCommand.current = null
    if (id) registry.execute(id)
  }}>
    <header><Command size={18} /><input value={query} onChange={(event) => { setQuery(event.target.value); setSelected(0) }} placeholder="搜索命令或笔记…" aria-label="搜索命令"
      role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list"
      aria-activedescendant={commands.length ? `${listId}-${activeIndex}` : undefined}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing || event.keyCode === 229) return
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault()
          if (commands.length) setSelected((activeIndex + (event.key === 'ArrowDown' ? 1 : -1) + commands.length) % commands.length)
        } else if (event.key === 'Enter' && commands[activeIndex]) {
          event.preventDefault()
          execute(commands[activeIndex].id)
        }
      }} /><button onClick={() => changeOpen(false)} aria-label="关闭命令面板"><X size={16} /></button></header>
    <div className="command-palette__list" id={listId} ref={list} role="listbox" aria-label="可用命令">
      {commands.map((command, index) => <div key={command.id} id={`${listId}-${index}`} role="option" aria-selected={activeIndex === index}
        onMouseDown={(event) => event.preventDefault()} onClick={() => execute(command.id)}>
        <span><strong>{command.label}</strong><small>{command.category}{command.description ? ` · ${command.description}` : ''}</small></span>{command.shortcut && <kbd>{command.shortcut}</kbd>}
      </div>)}
    </div>
    {!commands.length && <p className="command-palette__empty" role="status"><MagnifyingGlass size={16} />没有匹配的命令</p>}
    <footer className="command-palette__hint">↑ ↓ 选择 · Enter 执行 · Esc 关闭</footer>
  </ModalSurface>
}
