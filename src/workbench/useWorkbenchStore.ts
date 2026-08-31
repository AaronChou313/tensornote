import { create } from 'zustand'

export type PaneId = 'main' | 'secondary'
export type WorkbenchView = 'workspace' | 'knowledge' | 'database' | 'git' | 'settings'
export interface WorkbenchTab { noteId: string; title: string; pinned: boolean }

type PaneRecord<T> = Record<PaneId, T>

interface WorkbenchState {
  tabs: PaneRecord<WorkbenchTab[]>
  panes: PaneRecord<string | null>
  activePane: PaneId
  activeView: WorkbenchView | null
  secondaryOpen: boolean
  secondaryPosition: 'left' | 'right'
  leftSidebar: boolean
  rightSidebar: boolean
  rightView: 'properties' | 'outline' | 'backlinks' | 'graph' | 'lab'
  recent: string[]
  history: PaneRecord<string[]>
  historyIndex: PaneRecord<number>
  openNote: (noteId: string, title: string, pane?: PaneId) => void
  openView: (view: WorkbenchView) => void
  resetWorkspace: () => void
  closeTab: (noteId: string, pane?: PaneId) => string | null
  closePane: (pane: PaneId) => string | null
  togglePin: (noteId: string, pane?: PaneId) => void
  split: (side: 'left' | 'right') => void
  closeSecondary: () => void
  setActivePane: (pane: PaneId) => void
  setSidebar: (side: 'left' | 'right', open: boolean) => void
  setRightView: (view: WorkbenchState['rightView']) => void
  goBack: (pane?: PaneId) => string | null
  goForward: (pane?: PaneId) => string | null
}

const emptyTabs = (): PaneRecord<WorkbenchTab[]> => ({ main: [], secondary: [] })
const emptyPanes = (): PaneRecord<string | null> => ({ main: null, secondary: null })
const emptyHistory = (): PaneRecord<string[]> => ({ main: [], secondary: [] })
const emptyHistoryIndex = (): PaneRecord<number> => ({ main: -1, secondary: -1 })

export const useWorkbenchStore = create<WorkbenchState>((set, get) => ({
  tabs: emptyTabs(),
  panes: emptyPanes(),
  activePane: 'main',
  activeView: null,
  secondaryOpen: false,
  secondaryPosition: 'right',
  leftSidebar: true,
  rightSidebar: false,
  rightView: 'outline',
  recent: [],
  history: emptyHistory(),
  historyIndex: emptyHistoryIndex(),
  openNote: (noteId, title, pane = get().activePane) => set((state) => {
    const paneTabs = state.tabs[pane]
    const existing = paneTabs.some((tab) => tab.noteId === noteId)
    const paneHistory = state.history[pane].slice(0, state.historyIndex[pane] + 1)
    const repeated = paneHistory[paneHistory.length - 1] === noteId
    const nextHistory = repeated ? paneHistory : [...paneHistory, noteId]
    return {
      tabs: { ...state.tabs, [pane]: existing ? paneTabs : [...paneTabs, { noteId, title, pinned: false }] },
      panes: { ...state.panes, [pane]: noteId },
      activePane: pane,
      activeView: null,
      recent: [noteId, ...state.recent.filter((id) => id !== noteId)].slice(0, 12),
      history: { ...state.history, [pane]: nextHistory },
      historyIndex: { ...state.historyIndex, [pane]: repeated ? state.historyIndex[pane] : nextHistory.length - 1 },
    }
  }),
  openView: (activeView) => set({ activeView }),
  resetWorkspace: () => set({
    tabs: emptyTabs(),
    panes: emptyPanes(),
    activePane: 'main',
    activeView: null,
    secondaryOpen: false,
    secondaryPosition: 'right',
    leftSidebar: true,
    rightSidebar: false,
    rightView: 'outline',
    recent: [],
    history: emptyHistory(),
    historyIndex: emptyHistoryIndex(),
  }),
  closeTab: (noteId, pane = get().activePane) => {
    const state = get()
    if (state.tabs[pane].find((tab) => tab.noteId === noteId)?.pinned) return state.panes[pane]
    const paneTabs = state.tabs[pane].filter((tab) => tab.noteId !== noteId)
    const fallback = paneTabs.at(-1)?.noteId ?? null
    const panes = { ...state.panes, [pane]: state.panes[pane] === noteId ? fallback : state.panes[pane] }
    set({ tabs: { ...state.tabs, [pane]: paneTabs }, panes })
    return panes[pane]
  },
  closePane: (pane) => {
    const state = get()
    if (pane === 'main' && state.secondaryOpen) {
      const promoted = state.panes.secondary
      set({
        tabs: { main: state.tabs.secondary, secondary: [] },
        panes: { main: promoted, secondary: null },
        history: { main: state.history.secondary, secondary: [] },
        historyIndex: { main: state.historyIndex.secondary, secondary: -1 },
        activePane: 'main',
        activeView: null,
        secondaryOpen: false,
      })
      return promoted
    }
    if (pane === 'secondary') {
      const remaining = state.panes.main
      set({
        tabs: { ...state.tabs, secondary: [] },
        panes: { ...state.panes, secondary: null },
        history: { ...state.history, secondary: [] },
        historyIndex: { ...state.historyIndex, secondary: -1 },
        activePane: 'main',
        activeView: null,
        secondaryOpen: false,
      })
      return remaining
    }
    set({
      tabs: emptyTabs(),
      panes: emptyPanes(),
      history: emptyHistory(),
      historyIndex: emptyHistoryIndex(),
      activePane: 'main',
      activeView: null,
      secondaryOpen: false,
    })
    return null
  },
  togglePin: (noteId, pane = get().activePane) => set((state) => ({
    tabs: {
      ...state.tabs,
      [pane]: state.tabs[pane].map((tab) => tab.noteId === noteId ? { ...tab, pinned: !tab.pinned } : tab),
    },
  })),
  split: (side) => set((state) => state.secondaryOpen ? {
    secondaryPosition: side,
    activePane: 'secondary',
  } : {
    secondaryOpen: true,
    secondaryPosition: side,
    activePane: 'secondary',
    tabs: { ...state.tabs, secondary: [] },
    panes: { ...state.panes, secondary: null },
    history: { ...state.history, secondary: [] },
    historyIndex: { ...state.historyIndex, secondary: -1 },
  }),
  closeSecondary: () => { get().closePane('secondary') },
  setActivePane: (activePane) => set({ activePane }),
  setSidebar: (side, open) => set(side === 'left' ? { leftSidebar: open } : { rightSidebar: open }),
  setRightView: (rightView) => set({ rightView }),
  goBack: (pane = get().activePane) => {
    const state = get()
    const next = Math.max(0, state.historyIndex[pane] - 1)
    if (next === state.historyIndex[pane]) return null
    const noteId = state.history[pane][next]
    set({
      activePane: pane,
      historyIndex: { ...state.historyIndex, [pane]: next },
      panes: { ...state.panes, [pane]: noteId },
    })
    return noteId
  },
  goForward: (pane = get().activePane) => {
    const state = get()
    const next = Math.min(state.history[pane].length - 1, state.historyIndex[pane] + 1)
    if (next === state.historyIndex[pane]) return null
    const noteId = state.history[pane][next]
    set({
      activePane: pane,
      historyIndex: { ...state.historyIndex, [pane]: next },
      panes: { ...state.panes, [pane]: noteId },
    })
    return noteId
  },
}))
