import { beforeEach, describe, expect, it } from 'vitest'
import { useSidecarStore } from './useSidecarStore'

describe('useSidecarStore', () => {
  beforeEach(() => useSidecarStore.setState({ activeNoteId: null, activeSidecarId: null, isOpen: false, width: 580 }))

  it('replaces the active sidecar and closes on note changes', () => {
    useSidecarStore.getState().open('note-a', 'one')
    useSidecarStore.getState().open('note-a', 'two')
    expect(useSidecarStore.getState()).toMatchObject({ activeNoteId: 'note-a', activeSidecarId: 'two', isOpen: true })
    useSidecarStore.getState().syncNote('note-b')
    expect(useSidecarStore.getState().isOpen).toBe(false)
  })

  it('clamps the persisted width', () => {
    useSidecarStore.getState().setWidth(100)
    expect(useSidecarStore.getState().width).toBe(400)
    useSidecarStore.getState().setWidth(1200)
    expect(useSidecarStore.getState().width).toBe(850)
  })
})
