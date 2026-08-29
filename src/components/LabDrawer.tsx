import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowClockwise, Broom, Gear, Play, ShieldWarning, Stop, X } from '@phosphor-icons/react'
import { jupyterClient } from '../jupyter/JupyterClient'
import type { CellOutput } from '../jupyter/types'
import { useAppStore } from '../store/useAppStore'
import { useJupyterStore } from '../store/useJupyterStore'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import type { LabCell } from '../types'
import { Button } from './ui/Button'
import { CodeCell, type CodeCellState } from './CodeCell'

function initialCellState(cell: LabCell): CodeCellState {
  return { code: cell.code, outputs: [], executionCount: null, running: false }
}

export function LabDrawer() {
  const activeLabId = useAppStore((state) => state.activeLabId)
  const session = useWorkspaceStore((state) => state.session)
  const allLabs = useMemo(
    () => session?.documents.flatMap((note) => note.labs.map((lab) => ({ ...lab, noteId: note.id }))) ?? [],
    [session],
  )
  const lab = useMemo(() => allLabs.find((item) => item.id === activeLabId), [activeLabId, allLabs])

  if (!lab || !session) return null
  return <LabDrawerSession key={`${session.descriptor.id}:${lab.id}`} lab={lab} />
}

interface ActiveLab {
  id: string
  title: string
  difficulty: 'basic' | 'medium' | 'heavy'
  cells: LabCell[]
  noteId: string
}

function LabDrawerSession({ lab }: { lab: ActiveLab }) {
  const setActiveLabId = useAppStore((state) => state.setActiveLabId)
  const setKernelStatus = useAppStore((state) => state.setKernelStatus)
  const updateProgress = useAppStore((state) => state.updateProgress)
  const theme = useAppStore((state) => state.theme)
  const session = useWorkspaceStore((state) => state.session)
  const trustActiveWorkspace = useWorkspaceStore((state) => state.trustActiveWorkspace)
  const canExecute = Boolean(session?.trusted && session.manifest.features.executable)
  const serverUrl = useJupyterStore((state) => state.serverUrl)
  const token = useJupyterStore((state) => state.token)
  const kernelName = useJupyterStore((state) => state.kernelName)
  const config = useMemo(() => ({ serverUrl, token, kernelName }), [serverUrl, token, kernelName])
  const setSettingsOpen = useJupyterStore((state) => state.setSettingsOpen)
  const [width, setWidth] = useState(620)
  const [cells, setCells] = useState<Record<string, CodeCellState>>(() =>
    Object.fromEntries(lab.cells.map((cell) => [cell.id, initialCellState(cell)])),
  )
  const [error, setError] = useState<string | null>(null)
  const cellsRef = useRef(cells)

  useEffect(() => {
    jupyterClient.onStatus(setKernelStatus)
  }, [setKernelStatus])

  useEffect(() => {
    cellsRef.current = cells
  }, [cells])

  const updateCell = useCallback((id: string, update: Partial<CodeCellState> | ((state: CodeCellState) => Partial<CodeCellState>)) => {
    setCells((current) => {
      const previous = current[id]
      if (!previous) return current
      const patch = typeof update === 'function' ? update(previous) : update
      return { ...current, [id]: { ...previous, ...patch } }
    })
  }, [])

  const runCell = useCallback(async (cell: LabCell) => {
    if (!canExecute) {
      setError('当前 Workspace 尚未受信任。信任当前 GitHub Revision 后才能执行代码。')
      return
    }
    const state = cellsRef.current[cell.id]
    if (!state || state.running) return
    setError(null)
    updateCell(cell.id, { running: true, outputs: [] })
    try {
      await jupyterClient.execute(state.code, config, {
        onExecutionCount: (executionCount) => updateCell(cell.id, { executionCount }),
        onOutput: (output: CellOutput) => updateCell(cell.id, (current) => ({ outputs: [...current.outputs, output] })),
      })
      if (lab && session) updateProgress(`${session.descriptor.id}:${lab.noteId}`, { labRun: true })
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : '无法连接 Jupyter Server'
      setError(`${message}。请检查 Server URL、Token、CORS 和 Kernel Name。`)
    } finally {
      updateCell(cell.id, { running: false })
    }
  }, [canExecute, config, lab, session, updateCell, updateProgress])

  const runAll = async () => {
    if (!lab) return
    for (const cell of lab.cells) await runCell(cell)
  }

  const clearOutputs = () => {
    if (!lab) return
    setCells((current) => Object.fromEntries(lab.cells.map((cell) => [cell.id, { ...current[cell.id], outputs: [], executionCount: null }])))
  }

  const startResize = (event: React.PointerEvent) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    const onMove = (moveEvent: PointerEvent) => {
      const nextWidth = Math.min(760, Math.max(480, window.innerWidth - moveEvent.clientX))
      setWidth(nextWidth)
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <aside className="lab-drawer" style={{ width: `min(${width}px, 100vw)` }} aria-label={`${lab.title} Python Lab`}>
      <div className="lab-drawer__resize" onPointerDown={startResize} aria-hidden="true" />
      <header className="lab-drawer__header">
        <div className="min-w-0 flex-1">
          <p>PYTHON LAB</p>
          <h2>{lab.title}</h2>
          <span>Python 3 / {lab.cells.length} Cells</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} aria-label="Jupyter 设置"><Gear size={18} /></Button>
        <Button variant="ghost" size="icon" onClick={() => setActiveLabId(null)} aria-label="关闭实验"><X size={18} /></Button>
      </header>
      <div className="lab-toolbar">
        <Button variant="primary" size="sm" onClick={runAll} disabled={!canExecute}><Play size={14} weight="fill" />Run All</Button>
        <Button variant="secondary" size="sm" onClick={() => jupyterClient.restart()} disabled={!canExecute}><ArrowClockwise size={14} />Restart</Button>
        <Button variant="secondary" size="sm" onClick={() => jupyterClient.interrupt()} disabled={!canExecute}><Stop size={14} />Interrupt</Button>
        <Button variant="ghost" size="sm" onClick={clearOutputs}><Broom size={14} />Clear</Button>
      </div>
      {!session?.manifest.features.executable && (
        <div className="lab-trust-banner">
          <ShieldWarning size={17} />
          <p>此 Workspace 未在 tensornote.yaml 中声明可执行能力，代码仅供阅读。</p>
        </div>
      )}
      {session?.manifest.features.executable && !session.trusted && session.descriptor.type === 'github' && (
        <div className="lab-trust-banner">
          <ShieldWarning size={17} />
          <p>远程 Workspace 默认只读且禁止执行。信任当前 Revision 后才能连接 Jupyter。</p>
          <Button variant="secondary" size="sm" onClick={trustActiveWorkspace}>Trust revision</Button>
        </div>
      )}
      {error && (
        <div className="lab-error">
          <p>{error}</p>
          <Button variant="secondary" size="sm" onClick={() => setSettingsOpen(true)}>打开连接设置</Button>
        </div>
      )}
      <div className="lab-drawer__body">
        {lab.cells.map((cell) => {
          const state = cells[cell.id] ?? initialCellState(cell)
          return (
            <CodeCell
              key={cell.id}
              cell={cell}
              state={state}
              theme={theme}
              executionDisabled={!canExecute}
              onCodeChange={(code) => updateCell(cell.id, { code })}
              onRun={() => runCell(cell)}
            />
          )
        })}
      </div>
    </aside>
  )
}
