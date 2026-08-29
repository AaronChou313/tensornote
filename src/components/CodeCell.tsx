import CodeMirror from '@uiw/react-codemirror'
import { python } from '@codemirror/lang-python'
import { Play } from '@phosphor-icons/react'
import type { CellOutput as CellOutputType } from '../jupyter/types'
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
  theme: 'light' | 'dark'
  executionDisabled?: boolean
}

export function CodeCell({ cell, state, onCodeChange, onRun, theme, executionDisabled = false }: CodeCellProps) {
  return (
    <section className="code-cell">
      <header className="code-cell__header">
        <div className="min-w-0">
          <span className="font-mono text-[10px] text-[var(--faint)]">[{state.executionCount ?? ' '}] CELL {cell.order}</span>
          <h3>{cell.title}</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onRun} disabled={state.running || executionDisabled} aria-label={`运行 ${cell.title}`}>
          <Play size={17} weight="fill" className={state.running ? 'animate-pulse' : ''} />
        </Button>
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
