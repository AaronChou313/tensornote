import { create } from 'zustand'

export type PaneId = 'main' | 'secondary'
export interface WorkbenchTab { noteId: string; title: string; pinned: boolean }

interface WorkbenchState {
  tabs: WorkbenchTab[]
  panes: Record<PaneId, string | null>
  activePane: PaneId
  secondaryOpen: boolean
  secondaryPosition: 'left' | 'right'
  leftSidebar: boolean
  rightSidebar: boolean
  rightView: 'properties' | 'outline' | 'backlinks' | 'graph' | 'lab'
  recent: string[]
  history: string[]
  historyIndex: number
  openNote: (noteId: string, title: string, pane?: PaneId) => void
  closeTab: (noteId: string) => string | null
  togglePin: (noteId: string) => void
  split: (side: 'left' | 'right') => void
  closeSecondary: () => void
  setActivePane: (pane: PaneId) => void
  setSidebar: (side: 'left' | 'right', open: boolean) => void
  setRightView: (view: WorkbenchState['rightView']) => void
  goBack: () => string | null
  goForward: () => string | null
}

export const useWorkbenchStore = create<WorkbenchState>((set, get) => ({
  tabs: [], panes: { main: null, secondary: null }, activePane: 'main', secondaryOpen: false, secondaryPosition: 'right',
  leftSidebar: true, rightSidebar: false, rightView: 'outline', recent: [], history: [], historyIndex: -1,
  openNote: (noteId, title, pane = get().activePane) => set((state) => {
    const existing = state.tabs.some((tab) => tab.noteId === noteId)
    const history = state.history.slice(0, state.historyIndex + 1)
    return {
      tabs: existing ? state.tabs : [...state.tabs, { noteId, title, pinned: false }],
      panes: { ...state.panes, [pane]: noteId }, activePane: pane,
      recent: [noteId, ...state.recent.filter((id) => id !== noteId)].slice(0, 12),
      history: history[history.length - 1] === noteId ? history : [...history, noteId],
      historyIndex: history[history.length - 1] === noteId ? state.historyIndex : history.length,
    }
  }),
  closeTab: (noteId) => {
    const state = get()
    if (state.tabs.find((tab) => tab.noteId === noteId)?.pinned) return state.panes[state.activePane]
    const tabs = state.tabs.filter((tab) => tab.noteId !== noteId)
    const fallback = tabs.at(-1)?.noteId ?? null
    const panes = { main: state.panes.main === noteId ? fallback : state.panes.main, secondary: state.panes.secondary === noteId ? fallback : state.panes.secondary }
    const secondaryOpen = state.secondaryOpen && Boolean(panes.secondary)
    set({ tabs, panes, secondaryOpen, activePane: state.activePane === 'secondary' && !secondaryOpen ? 'main' : state.activePane })
    return panes[state.activePane] ?? panes.main
  },
  togglePin: (noteId) => set((state) => ({ tabs: state.tabs.map((tab) => tab.noteId === noteId ? { ...tab, pinned: !tab.pinned } : tab) })),
  split: (side) => set((state) => ({ secondaryOpen: true, secondaryPosition: side, activePane: 'secondary', panes: { ...state.panes, secondary: state.panes.secondary ?? state.panes.main } })),
  closeSecondary: () => set({ secondaryOpen: false, activePane: 'main' }),
  setActivePane: (activePane) => set({ activePane }), setSidebar: (side, open) => set(side === 'left' ? { leftSidebar: open } : { rightSidebar: open }), setRightView: (rightView) => set({ rightView }),
  goBack: () => { const state = get(); const next = Math.max(0, state.historyIndex - 1); if (next === state.historyIndex) return null; set({ historyIndex: next, panes: { ...state.panes, [state.activePane]: state.history[next] } }); return state.history[next] },
  goForward: () => { const state = get(); const next = Math.min(state.history.length - 1, state.historyIndex + 1); if (next === state.historyIndex) return null; set({ historyIndex: next, panes: { ...state.panes, [state.activePane]: state.history[next] } }); return state.history[next] },
}))
