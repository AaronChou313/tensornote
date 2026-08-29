import { useState } from 'react'
import { CaretDown, House, X } from '@phosphor-icons/react'
import { NavLink } from 'react-router-dom'
import { noteById } from '../content/notes'
import { noteTree, type NoteTreeItem } from '../content/noteTree'
import { cn } from '../lib/cn'
import { useAppStore } from '../store/useAppStore'
import { Button } from './ui/Button'
import logoWide from '../../assets/images/TensorNote_logo_wide.png'

function TreeItem({ item, depth = 0 }: { item: NoteTreeItem; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 1)
  const closeSidebar = useAppStore((state) => state.setSidebarOpen)
  const hasChildren = Boolean(item.children?.length)
  const available = item.noteId ? noteById.has(item.noteId) : false

  return (
    <div>
      <div className="group flex items-center gap-1" style={{ paddingLeft: `${depth * 12}px` }}>
        {hasChildren ? (
          <button
            className="grid size-7 shrink-0 place-items-center rounded-md text-[var(--faint)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]"
            onClick={() => setExpanded((value) => !value)}
            aria-label={`${expanded ? '折叠' : '展开'}${item.label}`}
            aria-expanded={expanded}
          >
            <CaretDown size={13} weight="bold" className={cn('transition-transform', !expanded && '-rotate-90')} />
          </button>
        ) : (
          <span className="w-7" />
        )}
        {item.future ? (
          <span className="flex min-h-8 flex-1 items-center justify-between rounded-md px-2 text-sm text-[var(--faint)]">
            {item.label}
            <span className="font-mono text-[9px] uppercase tracking-wider">Future</span>
          </span>
        ) : item.noteId && available ? (
          <NavLink
            to={`/notes/${item.noteId}`}
            onClick={() => closeSidebar(false)}
            className={({ isActive }) =>
              cn(
                'flex min-h-8 flex-1 items-center rounded-md px-2 text-[13px] transition-colors',
                isActive
                  ? 'bg-[var(--accent-soft)] font-medium text-[var(--accent)]'
                  : 'text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]',
              )
            }
          >
            {item.label}
          </NavLink>
        ) : (
          <button
            className="min-h-8 flex-1 rounded-md px-2 text-left text-[13px] font-medium text-[var(--ink)] hover:bg-[var(--surface-muted)]"
            onClick={() => hasChildren && setExpanded((value) => !value)}
          >
            {item.label}
          </button>
        )}
      </div>
      {hasChildren && expanded && (
        <div className="mt-0.5 space-y-0.5">
          {item.children?.map((child) => <TreeItem key={`${item.label}-${child.label}`} item={child} depth={depth + 1} />)}
        </div>
      )}
    </div>
  )
}

export function Sidebar() {
  const sidebarOpen = useAppStore((state) => state.sidebarOpen)
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen)

  return (
    <>
      {sidebarOpen && (
        <button
          className="fixed inset-0 z-30 bg-[#07110c]/35 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="关闭目录"
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col border-r border-[var(--line)] bg-[var(--surface-raised)] transition-transform duration-200 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center border-b border-[var(--line)] px-4">
          <NavLink to="/" className="flex min-w-0 flex-1 items-center" onClick={() => setSidebarOpen(false)} aria-label="TensorNote 首页">
            <img src={logoWide} alt="TensorNote — Executable Notes for Learning AI" className="h-12 w-[174px] object-contain object-left" />
          </NavLink>
          <Button className="lg:hidden" variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} aria-label="关闭目录">
            <X size={18} />
          </Button>
        </div>
        <div className="px-3 pt-3">
          <NavLink
            to="/"
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex min-h-9 items-center gap-2 rounded-md px-3 text-[13px]',
                isActive ? 'bg-[var(--surface-muted)] font-medium text-[var(--ink)]' : 'text-[var(--muted)] hover:bg-[var(--surface-muted)]',
              )
            }
          >
            <House size={16} />
            学习路线
          </NavLink>
        </div>
        <nav className="mt-3 flex-1 space-y-1 overflow-y-auto px-3 pb-6" aria-label="知识目录">
          {noteTree.map((item) => <TreeItem key={item.label} item={item} />)}
        </nav>
        <div className="border-t border-[var(--line)] px-5 py-4 text-[11px] leading-5 text-[var(--faint)]">
          内容来自 <code className="font-mono">notes/*.md</code>
          <br />Git 就是知识库
        </div>
      </aside>
    </>
  )
}
