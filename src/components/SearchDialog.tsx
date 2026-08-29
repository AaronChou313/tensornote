import { useEffect, useMemo, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowRight, MagnifyingGlass, X } from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import { searchNotes } from '../content/notes'
import { useAppStore } from '../store/useAppStore'
import { Button } from './ui/Button'

export function SearchDialog() {
  const open = useAppStore((state) => state.searchOpen)
  const setOpen = useAppStore((state) => state.setSearchOpen)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const results = useMemo(() => searchNotes(query).slice(0, 12), [query])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const choose = (noteId: string) => {
    navigate(`/notes/${noteId}`)
    setOpen(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[#07110c]/40 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-[12vh] z-[51] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface-raised)] shadow-[0_24px_90px_rgba(17,32,24,0.2)]">
          <Dialog.Title className="sr-only">搜索笔记</Dialog.Title>
          <div className="flex items-center gap-3 border-b border-[var(--line)] px-4">
            <MagnifyingGlass size={20} className="text-[var(--faint)]" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && results[0]) choose(results[0].id)
              }}
              className="h-14 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[var(--faint)]"
              placeholder="搜索标题、公式、Shape 或标签"
              aria-label="搜索笔记"
            />
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="关闭搜索"><X size={18} /></Button>
            </Dialog.Close>
          </div>
          <div className="max-h-[58vh] overflow-y-auto p-2">
            {!query ? (
              <div className="px-4 py-10 text-center text-sm text-[var(--faint)]">试试搜索 QKV、梯度、Patch 或对比学习</div>
            ) : results.length ? (
              results.map((note) => (
                <button
                  key={note.id}
                  onClick={() => choose(note.id)}
                  className="group flex w-full items-center gap-4 rounded-[8px] px-3 py-3 text-left hover:bg-[var(--surface-muted)]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-[var(--ink)]">{note.frontmatter.title}</span>
                    <span className="mt-1 block truncate text-xs text-[var(--faint)]">{note.frontmatter.section} / {note.frontmatter.tags.join(', ')}</span>
                  </span>
                  <ArrowRight size={16} className="text-[var(--faint)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" />
                </button>
              ))
            ) : (
              <div className="px-4 py-10 text-center text-sm text-[var(--faint)]">没有找到匹配内容。换一个更短的关键词试试。</div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
