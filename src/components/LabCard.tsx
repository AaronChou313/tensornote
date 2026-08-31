import { ArrowRight, Flask } from '@phosphor-icons/react'
import type { Lab } from '../types'
import { useAppStore } from '../store/useAppStore'
import { useComputeStore } from '../store/useComputeStore'

export function LabCard({ lab, noteId }: { lab: Lab; noteId?: string }) {
  const openLab = useAppStore((state) => state.openLab)
  const setScratchOpen = useComputeStore((state) => state.setScratchOpen)
  const difficulty = { basic: '基础', medium: '进阶', heavy: '重型' }[lab.difficulty]

  return (
    <button className="lab-card group" onClick={() => { setScratchOpen(false); openLab(noteId ?? null, lab.id) }}>
      <span className="lab-card__icon"><Flask size={22} weight="duotone" /></span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-[11px] font-medium text-[var(--accent)]">PYTHON LAB / {difficulty}</span>
        <span className="mt-1 block text-base font-semibold tracking-[-0.01em] text-[var(--ink)]">{lab.title}</span>
        <span className="mt-1 block text-xs text-[var(--faint)]">{lab.cells.length} 个可执行 Cell，共享当前 Kernel</span>
      </span>
      <span className="flex items-center gap-2 text-xs font-medium text-[var(--accent)]">打开实验 <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" /></span>
    </button>
  )
}
