import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowClockwise, Broom, FloppyDisk, Gear, Play, Plus, ShieldWarning, Stop, X } from '@phosphor-icons/react'
import { useLocation, useNavigate } from 'react-router-dom'
import { computeRuntime } from '../compute/ComputeRuntime'
import type { CellOutput } from '../compute/types'
import { insertScratchLab, updateLabCells } from '../content/labParser'
import { useAppStore } from '../store/useAppStore'
import { activeComputeProfile, useComputeStore } from '../store/useComputeStore'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import type { LabCell } from '../types'
import { Button } from './ui/Button'
import { CodeCell, type CodeCellState } from './CodeCell'

function initialCellState(cell: LabCell): CodeCellState {
  return { code: cell.code, outputs: [], executionCount: null, running: false }
}

interface ActiveLab {
  id: string
  title: string
  difficulty: 'basic' | 'medium' | 'heavy'
  cells: LabCell[]
  noteId?: string
  scratch?: boolean
}

function scratchCell(order: number): LabCell {
  return {
    id: `scratch-${order}-${Date.now().toString(36)}`,
    lab: 'scratch',
    order,
    title: `Scratch Cell ${order}`,
    difficulty: 'basic',
    code: '',
  }
}

export function LabDrawer() {
  const activeLabId = useAppStore((state) => state.activeLabId)
  const activeLabNoteId = useAppStore((state) => state.activeLabNoteId)
  const scratchOpen = useComputeStore((state) => state.scratchOpen)
  const session = useWorkspaceStore((state) => state.session)
  const allLabs = useMemo(
    () => session?.documents.flatMap((note) => note.labs.map((lab) => ({ ...lab, noteId: note.id }))) ?? [],
    [session],
  )
  const lab = useMemo(
    () => allLabs.find((item) => item.id === activeLabId && (!activeLabNoteId || item.noteId === activeLabNoteId)),
    [activeLabId, activeLabNoteId, allLabs],
  )

  if (!session) return null
  if (scratchOpen) {
    return <ComputeLabDrawer key={`${session.descriptor.id}:scratch`} lab={{ id: 'scratch', title: 'Scratch Lab', difficulty: 'basic', cells: [scratchCell(1)], scratch: true }} />
  }
  if (!lab) return null
  return <ComputeLabDrawer key={`${session.descriptor.id}:${lab.noteId ?? 'unknown'}:${lab.id}`} lab={lab} />
}

function ComputeLabDrawer({ lab }: { lab: ActiveLab }) {
  const location = useLocation()
  const navigate = useNavigate()
  const setActiveLabId = useAppStore((state) => state.setActiveLabId)
  const openLab = useAppStore((state) => state.openLab)
  const pendingLabAction = useAppStore((state) => state.pendingLabAction)
  const setPendingLabAction = useAppStore((state) => state.setPendingLabAction)
  const setLabDirty = useAppStore((state) => state.setLabDirty)
  const editorDirtyPaths = useAppStore((state) => state.editorDirtyPaths)
  const updateProgress = useAppStore((state) => state.updateProgress)
  const kernelStatus = useAppStore((state) => state.kernelStatus)
  const theme = useAppStore((state) => state.theme)
  const session = useWorkspaceStore((state) => state.session)
  const trustActiveWorkspace = useWorkspaceStore((state) => state.trustActiveWorkspace)
  const provider = useWorkspaceStore((state) => state.provider)
  const saveDocument = useWorkspaceStore((state) => state.saveDocument)
  const profiles = useComputeStore((state) => state.profiles)
  const activeProfileId = useComputeStore((state) => state.activeProfileId)
  const tokens = useComputeStore((state) => state.tokens)
  const setScratchOpen = useComputeStore((state) => state.setScratchOpen)
  const profile = activeComputeProfile({ profiles, activeProfileId })
  const token = tokens[profile.id] ?? ''
  const canExecute = Boolean(session?.trusted && session.manifest.features.executable)
  const currentNoteId = location.pathname.match(/^\/notes\/([^/]+)/)?.[1]
  const sourceNoteId = lab.noteId ?? currentNoteId
  const sourceNote = sourceNoteId ? session?.documentById.get(decodeURIComponent(sourceNoteId)) : undefined
  const context = useMemo(() => ({ workspaceId: session?.descriptor.id ?? 'workspace', noteId: sourceNote?.id }), [session?.descriptor.id, sourceNote?.id])
  const [width, setWidth] = useState(660)
  const [labCells, setLabCells] = useState(lab.cells)
  const [cells, setCells] = useState<Record<string, CodeCellState>>(() =>
    Object.fromEntries(lab.cells.map((cell) => [cell.id, initialCellState(cell)])),
  )
  const [error, setError] = useState<string | null>(null)
  const cellsRef = useRef(cells)
  const labCellsRef = useRef(labCells)
  const consumedPendingActionRef = useRef<typeof pendingLabAction>(null)
  const running = Object.values(cells).some((cell) => cell.running)
  const labDirty = lab.scratch
    ? labCells.some((cell) => Boolean(cells[cell.id]?.code.trim()))
    : lab.cells.some((cell) => cells[cell.id]?.code !== cell.code)

  useEffect(() => { cellsRef.current = cells }, [cells])
  useEffect(() => { labCellsRef.current = labCells }, [labCells])

  useEffect(() => {
    setLabDirty(labDirty)
    if (!labDirty) return
    const beforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()
    const guardNavigation = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement).closest('a[href]')
      const message = lab.scratch ? 'Scratch Lab 仍有临时代码，确定离开吗？' : '实验代码还有未保存到 Markdown 的修改，确定离开吗？'
      if (anchor && !window.confirm(message)) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    window.addEventListener('beforeunload', beforeUnload)
    document.addEventListener('click', guardNavigation, true)
    return () => {
      setLabDirty(false)
      window.removeEventListener('beforeunload', beforeUnload)
      document.removeEventListener('click', guardNavigation, true)
    }
  }, [lab.scratch, labDirty, setLabDirty])

  const updateCell = useCallback((id: string, update: Partial<CodeCellState> | ((state: CodeCellState) => Partial<CodeCellState>)) => {
    setCells((current) => {
      const previous = current[id]
      if (!previous) return current
      const patchValue = typeof update === 'function' ? update(previous) : update
      return { ...current, [id]: { ...previous, ...patchValue } }
    })
  }, [])

  const runCell = useCallback(async (cell: LabCell) => {
    if (!canExecute) {
      setError('当前 Workspace 未声明可执行能力，或远程 Revision 尚未受信任。')
      return
    }
    const state = cellsRef.current[cell.id]
    if (!state || state.running || !state.code.trim()) return
    setError(null)
    updateCell(cell.id, { running: true, outputs: [] })
    try {
      await computeRuntime.execute(profile, token, context, state.code, {
        onExecutionCount: (executionCount) => updateCell(cell.id, { executionCount }),
        onOutput: (output: CellOutput) => updateCell(cell.id, (current) => ({ outputs: [...current.outputs, output] })),
      })
      if (sourceNote && session) updateProgress(`${session.descriptor.id}:${sourceNote.id}`, { labRun: true })
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Compute Session 执行失败'
      setError(`${message}。运行 Connection diagnostics 可检查 Server、Token、CORS、Kernel 与 WebSocket。`)
    } finally {
      updateCell(cell.id, { running: false })
    }
  }, [canExecute, context, profile, session, sourceNote, token, updateCell, updateProgress])

  const runRange = useCallback(async (selected: LabCell[]) => {
    for (const cell of selected) await runCell(cell)
  }, [runCell])

  const runAll = useCallback(() => runRange(labCellsRef.current), [runRange])

  useEffect(() => {
    if (!pendingLabAction) {
      consumedPendingActionRef.current = null
      return
    }
    if (consumedPendingActionRef.current === pendingLabAction) return
    if (pendingLabAction.labId !== lab.id || pendingLabAction.action !== 'runAll') return
    consumedPendingActionRef.current = pendingLabAction
    setPendingLabAction(null)
    void runAll()
  }, [lab.id, pendingLabAction, runAll, setPendingLabAction])

  const restart = async () => {
    setError(null)
    try { await computeRuntime.restart() } catch (reason) { setError(reason instanceof Error ? reason.message : 'Kernel 重启失败') }
  }

  const restartAndRunAll = async () => {
    if (kernelStatus !== 'offline') await restart()
    await runAll()
  }

  const clearOutputs = () => {
    setCells((current) => Object.fromEntries(labCellsRef.current.map((cell) => [cell.id, { ...current[cell.id], outputs: [], executionCount: null, running: false }])))
  }

  const saveToNote = async () => {
    if (!sourceNote || !provider?.capabilities.write) return
    setError(null)
    try {
      const codeByCell = Object.fromEntries(Object.entries(cells).map(([id, state]) => [id, state.code]))
      const updated = updateLabCells(sourceNote.raw, lab.id, codeByCell)
      await saveDocument(sourceNote.path, updated, {
        expectedModifiedAt: sourceNote.sourceModifiedAt,
        expectedSize: sourceNote.sourceSize,
      })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '无法把实验代码写回 Markdown')
    }
  }

  const insertIntoNote = async () => {
    if (!sourceNote || !provider?.capabilities.write) {
      setError('请先打开本地可写笔记，再插入 Scratch Lab。')
      return
    }
    if (editorDirtyPaths[sourceNote.path]) {
      setError('当前 Markdown Editor 有未保存修改。请先保存笔记，再插入 Scratch Lab。')
      return
    }
    setError(null)
    try {
      const scratchId = `scratch-${Date.now().toString(36)}`
      const updated = insertScratchLab(sourceNote.raw, scratchId, labCells.map((cell) => ({ title: cell.title, code: cells[cell.id]?.code ?? '' })))
      const saved = await saveDocument(sourceNote.path, updated, {
        expectedModifiedAt: sourceNote.sourceModifiedAt,
        expectedSize: sourceNote.sourceSize,
      })
      setScratchOpen(false)
      if (saved.labs.some((savedLab) => savedLab.id === scratchId)) openLab(saved.id, scratchId)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '无法把 Scratch Lab 插入笔记')
    }
  }

  const addScratchCell = () => {
    const cell = scratchCell(labCells.length + 1)
    setLabCells((current) => [...current, cell])
    setCells((current) => ({ ...current, [cell.id]: initialCellState(cell) }))
  }

  const removeScratchCell = (id: string) => {
    if (labCells.length <= 1) return
    setLabCells((current) => current.filter((cell) => cell.id !== id).map((cell, index) => ({ ...cell, order: index + 1, title: `Scratch Cell ${index + 1}` })))
    setCells((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
  }

  const closeLab = () => {
    const message = lab.scratch ? 'Scratch Lab 仍有临时代码，确定关闭吗？' : '实验代码还有未保存到 Markdown 的修改，确定关闭吗？'
    if (labDirty && !window.confirm(message)) return
    if (lab.scratch) setScratchOpen(false)
    else setActiveLabId(null)
  }

  const openComputeSettings = () => {
    if (labDirty && !window.confirm(lab.scratch ? 'Scratch Lab 仍有临时代码，确定前往设置吗？' : '实验代码还有未保存到 Markdown 的修改，确定前往设置吗？')) return
    setScratchOpen(false)
    setActiveLabId(null)
    navigate('/settings?section=compute')
  }

  const startResize = (event: React.PointerEvent) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    const onMove = (moveEvent: PointerEvent) => setWidth(Math.min(820, Math.max(500, window.innerWidth - moveEvent.clientX)))
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <aside className="lab-drawer compute-lab-drawer" style={{ width: `min(${width}px, 100vw)` }} aria-label={`${lab.title} Compute Lab`}>
      <div className="lab-drawer__resize" onPointerDown={startResize} aria-hidden="true" />
      <header className="lab-drawer__header">
        <div className="min-w-0 flex-1">
          <p>{lab.scratch ? 'SCRATCH LAB' : 'EXECUTABLE LAB'}</p>
          <h2>{lab.title}</h2>
          <span>{profile.name} · {profile.kernelName} · {profile.scope}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={openComputeSettings} aria-label="Compute 设置"><Gear size={18} /></Button>
        <Button variant="ghost" size="icon" onClick={closeLab} aria-label="关闭实验"><X size={18} /></Button>
      </header>
      <div className="lab-toolbar">
        <Button variant="primary" size="sm" onClick={() => void runAll()} disabled={!canExecute || running}><Play size={14} weight="fill" />Run All</Button>
        <Button variant="secondary" size="sm" onClick={() => void restartAndRunAll()} disabled={!canExecute || running}><ArrowClockwise size={14} />Restart & Run All</Button>
        <Button variant="secondary" size="sm" onClick={() => void restart()} disabled={kernelStatus === 'offline' || running}><ArrowClockwise size={14} />Restart</Button>
        <Button variant="secondary" size="sm" onClick={() => void computeRuntime.interrupt()} disabled={kernelStatus !== 'busy'}><Stop size={14} />Interrupt</Button>
        <Button variant="ghost" size="sm" onClick={clearOutputs}><Broom size={14} />Clear outputs</Button>
        {lab.scratch && <Button variant="ghost" size="sm" onClick={addScratchCell}><Plus size={14} />Add cell</Button>}
        {lab.scratch && <Button className="lab-save-note" variant="secondary" size="sm" onClick={() => void insertIntoNote()} disabled={!labDirty || !sourceNote || !provider?.capabilities.write}><FloppyDisk size={14} />Insert into note</Button>}
        {!lab.scratch && provider?.capabilities.write && <Button className="lab-save-note" variant="secondary" size="sm" onClick={() => void saveToNote()} disabled={!labDirty}><FloppyDisk size={14} />Save to note</Button>}
      </div>

      {!session?.manifest.features.executable && <div className="lab-trust-banner"><ShieldWarning size={17} /><p>此 Workspace 未在 tensornote.yaml 中声明可执行能力，代码仅供阅读。</p></div>}
      {session?.manifest.features.executable && !session.trusted && session.descriptor.type === 'github' && <div className="lab-trust-banner"><ShieldWarning size={17} /><p>远程 Workspace 默认禁止执行。信任当前 Revision 后才能连接 Compute Provider。</p><Button variant="secondary" size="sm" onClick={trustActiveWorkspace}>Trust revision</Button></div>}
      {lab.scratch && !sourceNote && <div className="scratch-note-banner"><p>Scratch 代码只在内存中。打开一篇本地笔记后，才能使用 Insert into note。</p></div>}
      {error && <div className="lab-error"><p>{error}</p><Button variant="secondary" size="sm" onClick={openComputeSettings}>打开 Compute 设置</Button></div>}

      <div className="lab-drawer__body">
        {labCells.map((cell, index) => {
          const state = cells[cell.id] ?? initialCellState(cell)
          return <CodeCell
            key={cell.id}
            cell={cell}
            state={state}
            theme={theme}
            executionDisabled={!canExecute}
            onCodeChange={(code) => updateCell(cell.id, { code })}
            onRun={() => void runCell(cell)}
            onRunAbove={index > 0 ? () => void runRange(labCells.slice(0, index)) : undefined}
            onRunBelow={() => void runRange(labCells.slice(index))}
            onDelete={lab.scratch && labCells.length > 1 ? () => removeScratchCell(cell.id) : undefined}
          />
        })}
      </div>
    </aside>
  )
}
