import { beforeEach, describe, expect, it } from 'vitest'
import { useWorkbenchStore } from './useWorkbenchStore'

describe('workbench store', () => {
  beforeEach(() => useWorkbenchStore.getState().resetWorkspace())
  it('keeps tabs, recents, and independent panes', () => {
    const store = useWorkbenchStore.getState()
    store.openNote('a', 'A'); store.split('right'); useWorkbenchStore.getState().openNote('b', 'B')
    const state = useWorkbenchStore.getState()
    expect(state.panes).toEqual({ main: 'a', secondary: 'b' })
    expect(state.recent).toEqual(['b', 'a'])
    expect(state.tabs).toMatchObject({ main: [{ noteId: 'a' }], secondary: [{ noteId: 'b' }] })
  })
  it('navigates history in the active pane', () => {
    const store = useWorkbenchStore.getState(); store.openNote('a', 'A'); store.openNote('b', 'B')
    expect(useWorkbenchStore.getState().goBack()).toBe('a')
  })
  it('keeps pinned tabs open and returns a fallback when closing the active tab', () => {
    const store = useWorkbenchStore.getState(); store.openNote('a', 'A'); store.openNote('b', 'B'); store.togglePin('a')
    expect(useWorkbenchStore.getState().closeTab('a')).toBe('b')
    expect(useWorkbenchStore.getState().tabs.main.map((tab) => tab.noteId)).toEqual(['a', 'b'])
    expect(useWorkbenchStore.getState().closeTab('b')).toBe('a')
    expect(useWorkbenchStore.getState().panes.main).toBe('a')
  })
  it('records split direction without replacing the main pane', () => {
    const store = useWorkbenchStore.getState(); store.openNote('a', 'A'); store.split('left'); useWorkbenchStore.getState().openNote('b', 'B')
    expect(useWorkbenchStore.getState()).toMatchObject({ panes: { main: 'a', secondary: 'b' }, secondaryPosition: 'left' })
  })
  it('opens a genuinely empty secondary pane instead of cloning the current note', () => {
    const store = useWorkbenchStore.getState()
    store.openNote('a', 'A')
    store.split('right')

    expect(useWorkbenchStore.getState()).toMatchObject({
      panes: { main: 'a', secondary: null },
      activePane: 'secondary',
      secondaryOpen: true,
    })
  })
  it('keeps pane tabs independent when the same note is open on both sides', () => {
    const store = useWorkbenchStore.getState()
    store.openNote('a', 'A', 'main')
    store.split('right')
    useWorkbenchStore.getState().openNote('a', 'A', 'secondary')
    useWorkbenchStore.getState().closeTab('a', 'secondary')

    expect(useWorkbenchStore.getState()).toMatchObject({
      panes: { main: 'a', secondary: null },
      tabs: { main: [{ noteId: 'a', title: 'A', pinned: false }], secondary: [] },
    })
  })
  it('promotes the remaining pane when the main pane is closed', () => {
    const store = useWorkbenchStore.getState()
    store.openNote('a', 'A', 'main')
    store.split('right')
    useWorkbenchStore.getState().openNote('b', 'B', 'secondary')

    expect(useWorkbenchStore.getState().closePane('main')).toBe('b')
    expect(useWorkbenchStore.getState()).toMatchObject({
      panes: { main: 'b', secondary: null },
      tabs: { main: [{ noteId: 'b', title: 'B', pinned: false }], secondary: [] },
      activePane: 'main',
      secondaryOpen: false,
    })
  })
  it('allows the final pane to close into an empty workbench', () => {
    const store = useWorkbenchStore.getState()
    store.openNote('a', 'A')

    expect(store.closePane('main')).toBeNull()
    expect(useWorkbenchStore.getState()).toMatchObject({
      panes: { main: null, secondary: null },
      tabs: { main: [], secondary: [] },
      activePane: 'main',
      secondaryOpen: false,
      history: { main: [], secondary: [] },
    })
  })
  it('keeps workspace views out of note tabs and note history', () => {
    const store = useWorkbenchStore.getState()
    store.openNote('a', 'A')
    store.openView('knowledge')

    expect(useWorkbenchStore.getState()).toMatchObject({ activeView: 'knowledge', panes: { main: 'a' }, history: { main: ['a'] } })
    useWorkbenchStore.getState().openNote('b', 'B')
    expect(useWorkbenchStore.getState()).toMatchObject({ activeView: null, panes: { main: 'b' }, history: { main: ['a', 'b'] } })
  })
  it('clears workspace-scoped navigation while restoring the default layout', () => {
    const store = useWorkbenchStore.getState()
    store.openNote('a', 'A')
    store.split('left')
    useWorkbenchStore.getState().openNote('b', 'B')
    useWorkbenchStore.getState().setSidebar('left', false)

    useWorkbenchStore.getState().resetWorkspace()

    expect(useWorkbenchStore.getState()).toMatchObject({
      tabs: { main: [], secondary: [] },
      panes: { main: null, secondary: null },
      activePane: 'main',
      activeView: null,
      secondaryOpen: false,
      secondaryPosition: 'right',
      leftSidebar: true,
      rightSidebar: false,
      recent: [],
      history: { main: [], secondary: [] },
      historyIndex: { main: -1, secondary: -1 },
    })
  })
})
