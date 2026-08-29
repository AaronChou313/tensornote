import { Check } from '@phosphor-icons/react'
import { useAppStore } from '../store/useAppStore'
import type { NoteProgress as NoteProgressType } from '../types'

const options: { key: keyof NoteProgressType; label: string }[] = [
  { key: 'read', label: '已阅读' },
  { key: 'labRun', label: '已运行实验' },
  { key: 'reviewed', label: '已复习' },
]

export function NoteProgress({ noteId, hasLab }: { noteId: string; hasLab: boolean }) {
  const progress = useAppStore((state) => state.progress[noteId] ?? { read: false, labRun: false, reviewed: false })
  const updateProgress = useAppStore((state) => state.updateProgress)

  return (
    <section className="note-progress" aria-label="学习进度">
      <p>这篇笔记的学习状态</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const disabled = option.key === 'labRun' && !hasLab
          const checked = progress[option.key]
          return (
            <button
              key={option.key}
              disabled={disabled}
              aria-pressed={checked}
              onClick={() => updateProgress(noteId, { [option.key]: !checked })}
              className="progress-check"
            >
              <span className="grid size-4 place-items-center rounded-[4px] border border-[var(--line)] bg-[var(--surface-raised)]">
                {checked && <Check size={11} weight="bold" className="text-[var(--accent)]" />}
              </span>
              {option.label}
            </button>
          )
        })}
      </div>
    </section>
  )
}
