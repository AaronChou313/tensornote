import { beforeEach, describe, expect, it } from 'vitest'
import { useWorkbenchStore } from './useWorkbenchStore'

describe('workbench store', () => {
  beforeEach(() => useWorkbenchStore.setState({ tabs: [], panes: { main: null, secondary: null }, activePane: 'main', secondaryOpen: false, secondaryPosition: 'right', recent: [], history: [], historyIndex: -1 }))
  it('keeps tabs, recents, and independent panes', () => {
    const store = useWorkbenchStore.getState()
    store.openNote('a', 'A'); store.split('right'); useWorkbenchStore.getState().openNote('b', 'B')
    const state = useWorkbenchStore.getState()
    expect(state.panes).toEqual({ main: 'a', secondary: 'b' })
    expect(state.recent).toEqual(['b', 'a'])
  })
  it('navigates history in the active pane', () => {
    const store = useWorkbenchStore.getState(); store.openNote('a', 'A'); store.openNote('b', 'B')
    expect(useWorkbenchStore.getState().goBack()).toBe('a')
  })
  it('keeps pinned tabs open and returns a fallback when closing the active tab', () => {
    const store = useWorkbenchStore.getState(); store.openNote('a', 'A'); store.openNote('b', 'B'); store.togglePin('a')
    expect(useWorkbenchStore.getState().closeTab('a')).toBe('b')
    expect(useWorkbenchStore.getState().tabs.map((tab) => tab.noteId)).toEqual(['a', 'b'])
    expect(useWorkbenchStore.getState().closeTab('b')).toBe('a')
    expect(useWorkbenchStore.getState().panes.main).toBe('a')
  })
  it('records split direction without replacing the main pane', () => {
    const store = useWorkbenchStore.getState(); store.openNote('a', 'A'); store.split('left'); useWorkbenchStore.getState().openNote('b', 'B')
    expect(useWorkbenchStore.getState()).toMatchObject({ panes: { main: 'a', secondary: 'b' }, secondaryPosition: 'left' })
  })
})
