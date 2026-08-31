// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Lab } from '../types'
import { useAppStore } from '../store/useAppStore'
import { useComputeStore } from '../store/useComputeStore'
import { useWorkbenchStore } from '../workbench/useWorkbenchStore'
import { LabCard } from './LabCard'

const lab: Lab = {
  id: 'demo',
  title: 'Demo',
  difficulty: 'basic',
  cells: [{ id: 'demo-1', lab: 'demo', order: 1, title: 'Cell', difficulty: 'basic', code: 'print(1)' }],
}

describe('LabCard', () => {
  beforeEach(() => {
    useAppStore.setState({ activeLabId: null, activeLabNoteId: null })
    useComputeStore.setState({ scratchOpen: true })
    useWorkbenchStore.getState().resetWorkspace()
    useWorkbenchStore.getState().setSidebar('right', true)
  })

  it('opens the lab in the note that rendered the card', () => {
    render(<LabCard lab={lab} noteId="note-a" />)
    fireEvent.click(screen.getByRole('button', { name: /Demo/ }))

    expect(useAppStore.getState()).toMatchObject({ activeLabId: 'demo', activeLabNoteId: 'note-a' })
    expect(useComputeStore.getState().scratchOpen).toBe(false)
    expect(useWorkbenchStore.getState().rightSidebar).toBe(false)
  })
})
