import { ArrowRight, Flask, Function as FunctionIcon } from '@phosphor-icons/react'
import type { Sidecar } from '../sidecar/types'
import { useSidecarStore } from '../sidecar/useSidecarStore'
import { useComputeStore } from '../store/useComputeStore'

export function SidecarCard({ sidecar, noteId }: { sidecar: Sidecar; noteId?: string }) {
  const open = useSidecarStore((state) => state.open)
  const setScratchOpen = useComputeStore((state) => state.setScratchOpen)
  const isJupyter = sidecar.type === 'jupyter'
  return (
    <button className="lab-card sidecar-card group" onClick={() => {
      if (!noteId) return
      setScratchOpen(false)
      open(noteId, sidecar.id)
    }}>
      <span className="lab-card__icon">{isJupyter ? <Flask size={22} weight="duotone" /> : <FunctionIcon size={22} weight="duotone" />}</span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-[11px] font-medium text-[var(--accent)]">{isJupyter ? 'PYTHON 实验' : '推导 / 补充内容'}</span>
        <span className="mt-1 block text-base font-semibold tracking-[-0.01em] text-[var(--ink)]">{sidecar.title}</span>
        <span className="mt-1 block text-xs text-[var(--faint)]">{isJupyter ? `${sidecar.cells.length} 个 Python Cell，共享当前 Kernel` : '在侧栏中展开补充说明'}</span>
      </span>
      <span className="flex items-center gap-2 text-xs font-medium text-[var(--accent)]">打开 <ArrowRight size={15} /></span>
    </button>
  )
}
