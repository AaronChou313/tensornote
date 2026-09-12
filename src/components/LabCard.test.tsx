// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Lab } from '../types'
import { useComputeStore } from '../store/useComputeStore'
import { useSidecarStore } from '../sidecar/useSidecarStore'
import { LabCard } from './LabCard'

const lab: Lab = {
  id: 'demo',
  title: 'Demo',
  difficulty: 'basic',
  cells: [{ id: 'demo-1', lab: 'demo', order: 1, title: 'Cell', difficulty: 'basic', code: 'print(1)' }],
}

describe('LabCard', () => {
  beforeEach(() => {
    useSidecarStore.setState({ activeSidecarId: null, activeNoteId: null, isOpen: false })
    useComputeStore.setState({ scratchOpen: true })
  })

  it('opens the lab in the note that rendered the card', () => {
    render(<LabCard lab={lab} noteId="note-a" />)
    fireEvent.click(screen.getByRole('button', { name: /Demo/ }))

    expect(useSidecarStore.getState()).toMatchObject({ activeSidecarId: 'demo', activeNoteId: 'note-a', isOpen: true })
    expect(useComputeStore.getState().scratchOpen).toBe(false)
  })
})
