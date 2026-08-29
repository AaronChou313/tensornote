import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowClockwise, Broom, Gear, Play, Stop, X } from '@phosphor-icons/react'
import { notes } from '../content/notes'
import { jupyterClient } from '../jupyter/JupyterClient'
import type { CellOutput } from '../jupyter/types'
import { useAppStore } from '../store/useAppStore'
import { useJupyterStore } from '../store/useJupyterStore'
import type { LabCell } from '../types'
import { Button } from './ui/Button'
import { CodeCell, type CodeCellState } from './CodeCell'

const allLabs = notes.flatMap((note) => note.labs.map((lab) => ({ ...lab, noteId: note.id })))

function initialCellState(cell: LabCell): CodeCellState {
  return { code: cell.code, outputs: [], executionCount: null, running: false }
}

export function LabDrawer() {
  const activeLabId = useAppStore((state) => state.activeLabId)
  const setActiveLabId = useAppStore((state) => state.setActiveLabId)
  const setKernelStatus = useAppStore((state) => state.setKernelStatus)
  const updateProgress = useAppStore((state) => state.updateProgress)
  const theme = useAppStore((state) => state.theme)
  const config = useJupyterStore((state) => ({ serverUrl: state.serverUrl, token: state.token, kernelName: state.kernelName }))
  const setSettingsOpen = useJupyterStore((state) => state.setSettingsOpen)
  const lab = useMemo(() => allLabs.find((item) => item.id === activeLabId), [activeLabId])
  const [width, setWidth] = useState(620)
  const [cells, setCells] = useState<Record<string, CodeCellState>>({})
  const [error, setError] = useState<string | null>(null)
  const cellsRef = useRef(cells)
  cellsRef.current = cells

  useEffect(() => {
    jupyterClient.onStatus(setKernelStatus)
  }, [setKernelStatus])

  useEffect(() => {
    if (!lab) return
    setCells(Object.fromEntries(lab.cells.map((cell) => [cell.id, initialCellState(cell)])))
    setError(null)
  }, [lab])

  const updateCell = useCallback((id: string, update: Partial<CodeCellState> | ((state: CodeCellState) => Partial<CodeCellState>)) => {
    setCells((current) => {
      const previous = current[id]
      if (!previous) return current
      const patch = typeof update === 'function' ? update(previous) : update
      return { ...current, [id]: { ...previous, ...patch } }
    })
  }, [])

  const runCell = useCallback(async (cell: LabCell) => {
    const state = cellsRef.current[cell.id]
    if (!state || state.running) return
    setError(null)
    updateCell(cell.id, { running: true, outputs: [] })
    try {
      await jupyterClient.execute(state.code, config, {
        onExecutionCount: (executionCount) => updateCell(cell.id, { executionCount }),
        onOutput: (output: CellOutput) => updateCell(cell.id, (current) => ({ outputs: [...current.outputs, output] })),
      })
      if (lab) updateProgress(lab.noteId, { labRun: true })
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : '无法连接 Jupyter Server'
      setError(`${message}。请检查 Server URL、Token、CORS 和 Kernel Name。`)
    } finally {
      updateCell(cell.id, { running: false })
    }
  }, [config, lab, updateCell, updateProgress])

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

  if (!lab) return null

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
        <Button variant="primary" size="sm" onClick={runAll}><Play size={14} weight="fill" />Run All</Button>
        <Button variant="secondary" size="sm" onClick={() => jupyterClient.restart()}><ArrowClockwise size={14} />Restart</Button>
        <Button variant="secondary" size="sm" onClick={() => jupyterClient.interrupt()}><Stop size={14} />Interrupt</Button>
        <Button variant="ghost" size="sm" onClick={clearOutputs}><Broom size={14} />Clear</Button>
      </div>
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
              onCodeChange={(code) => updateCell(cell.id, { code })}
              onRun={() => runCell(cell)}
            />
          )
        })}
      </div>
    </aside>
  )
}
