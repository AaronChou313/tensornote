import CodeMirror from '@uiw/react-codemirror'
import { python } from '@codemirror/lang-python'
import { ArrowLineDown, ArrowLineUp, Play, Trash } from '@phosphor-icons/react'
import type { CellOutput as CellOutputType } from '../compute/types'
import type { LabCell } from '../types'
import { Button } from './ui/Button'
import { CellOutput } from './CellOutput'

export interface CodeCellState {
  code: string
  outputs: CellOutputType[]
  executionCount: number | null
  running: boolean
}

interface CodeCellProps {
  cell: LabCell
  state: CodeCellState
  onCodeChange: (code: string) => void
  onRun: () => void
  onRunAbove?: () => void
  onRunBelow?: () => void
  onDelete?: () => void
  theme: 'light' | 'dark'
  executionDisabled?: boolean
}

export function CodeCell({ cell, state, onCodeChange, onRun, onRunAbove, onRunBelow, onDelete, theme, executionDisabled = false }: CodeCellProps) {
  return (
    <section className="code-cell">
      <header className="code-cell__header">
        <div className="min-w-0">
          <span className="font-mono text-[10px] text-[var(--faint)]">[{state.executionCount ?? ' '}] CELL {cell.order}</span>
          <h3>{cell.title}</h3>
        </div>
        <div className="code-cell__actions">
          {onRunAbove && <Button variant="ghost" size="icon" onClick={onRunAbove} disabled={state.running || executionDisabled} aria-label={`运行 ${cell.title} 上方的 Cell`} title="Run above"><ArrowLineUp size={15} /></Button>}
          {onRunBelow && <Button variant="ghost" size="icon" onClick={onRunBelow} disabled={state.running || executionDisabled} aria-label={`运行 ${cell.title} 及下方的 Cell`} title="Run below"><ArrowLineDown size={15} /></Button>}
          {onDelete && <Button variant="ghost" size="icon" onClick={onDelete} disabled={state.running} aria-label={`删除 ${cell.title}`} title="Delete cell"><Trash size={15} /></Button>}
          <Button variant="ghost" size="icon" onClick={onRun} disabled={state.running || executionDisabled} aria-label={`运行 ${cell.title}`}>
            <Play size={17} weight="fill" className={state.running ? 'animate-pulse' : ''} />
          </Button>
        </div>
      </header>
      <div className="code-cell__editor">
        <CodeMirror
          value={state.code}
          minHeight="92px"
          maxHeight="360px"
          extensions={[python()]}
          theme={theme}
          basicSetup={{
            lineNumbers: true,
            foldGutter: false,
            highlightActiveLine: true,
            highlightActiveLineGutter: false,
            autocompletion: true,
          }}
          onChange={onCodeChange}
          onKeyDown={(event) => {
            if (event.shiftKey && event.key === 'Enter') {
              event.preventDefault()
              onRun()
            }
          }}
        />
      </div>
      <CellOutput outputs={state.outputs} />
    </section>
  )
}
