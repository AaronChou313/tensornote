import { beforeEach, describe, expect, it } from 'vitest'
import { useWorkbenchStore } from './useWorkbenchStore'

describe('single-note workbench', () => {
  beforeEach(() => useWorkbenchStore.getState().resetWorkspace())

  it('keeps tabs while focusing one note', () => {
    const store = useWorkbenchStore.getState()
    store.openNote('a', 'A'); store.openNote('b', 'B')
    expect(useWorkbenchStore.getState()).toMatchObject({ activeNoteId: 'b', tabs: [{ noteId: 'a' }, { noteId: 'b' }] })
    expect(useWorkbenchStore.getState().goBack()).toBe('a')
  })

  it('selects a fallback when closing the active tab', () => {
    const store = useWorkbenchStore.getState()
    store.openNote('a', 'A'); store.openNote('b', 'B')
    expect(useWorkbenchStore.getState().closeTab('b')).toBe('a')
    expect(useWorkbenchStore.getState().closeTab('a')).toBeNull()
  })

  it('opens a workspace view without destroying note history', () => {
    const store = useWorkbenchStore.getState()
    store.openNote('a', 'A'); store.openView('workspace'); store.openNote('b', 'B')
    expect(useWorkbenchStore.getState()).toMatchObject({ activeView: null, history: ['a', 'b'] })
  })

  it('keeps independent note scroll positions for the current workspace session', () => {
    const store = useWorkbenchStore.getState()
    store.saveNoteScroll('a', 1000)
    store.saveNoteScroll('b', 400)
    expect(useWorkbenchStore.getState().getNoteScroll('a')).toBe(1000)
    expect(useWorkbenchStore.getState().getNoteScroll('b')).toBe(400)
    expect(useWorkbenchStore.getState().getNoteScroll('new')).toBe(0)
    store.resetWorkspace()
    expect(useWorkbenchStore.getState().getNoteScroll('a')).toBe(0)
  })
})
