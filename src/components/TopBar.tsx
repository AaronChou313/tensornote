import { List, MagnifyingGlass, Moon, Sun } from '@phosphor-icons/react'
import { useLocation, useParams } from 'react-router-dom'
import { findTrail } from '../content/noteTree'
import { useAppStore } from '../store/useAppStore'
import { Button } from './ui/Button'

const statusLabels = {
  offline: 'Offline',
  starting: 'Starting',
  idle: 'Idle',
  busy: 'Busy',
  error: 'Error',
}

export function TopBar() {
  const { noteId } = useParams()
  const location = useLocation()
  const theme = useAppStore((state) => state.theme)
  const toggleTheme = useAppStore((state) => state.toggleTheme)
  const kernelStatus = useAppStore((state) => state.kernelStatus)
  const setSearchOpen = useAppStore((state) => state.setSearchOpen)
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen)
  const trail = noteId ? findTrail(noteId) : location.pathname === '/' ? ['学习路线'] : []

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] px-4 backdrop-blur-lg md:px-6">
      <Button className="mr-2 lg:hidden" variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} aria-label="打开目录">
        <List size={20} />
      </Button>
      <div className="min-w-0 flex-1 truncate text-xs text-[var(--faint)]">
        {trail.map((label, index) => (
          <span key={`${label}-${index}`}>
            {index > 0 && <span className="mx-2 text-[var(--line)]">/</span>}
            <span className={index === trail.length - 1 ? 'font-medium text-[var(--ink)]' : ''}>{label}</span>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <Button variant="ghost" className="hidden min-w-40 justify-between border border-[var(--line)] sm:flex" onClick={() => setSearchOpen(true)}>
          <span className="flex items-center gap-2"><MagnifyingGlass size={15} />搜索</span>
          <kbd className="font-mono text-[10px] text-[var(--faint)]">⌘K</kbd>
        </Button>
        <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setSearchOpen(true)} aria-label="搜索">
          <MagnifyingGlass size={18} />
        </Button>
        <span className="hidden h-5 w-px bg-[var(--line)] sm:block" />
        <div className="hidden items-center gap-2 px-2 text-xs text-[var(--muted)] md:flex" title="Jupyter Kernel 状态">
          <span className={`kernel-dot kernel-dot--${kernelStatus}`} aria-hidden="true" />
          {statusLabels[kernelStatus]}
        </div>
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={theme === 'light' ? '切换深色模式' : '切换浅色模式'}>
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </Button>
      </div>
    </header>
  )
}
