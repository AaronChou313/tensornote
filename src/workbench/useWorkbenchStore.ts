import { create } from 'zustand'

export type WorkbenchView = 'workspace' | 'settings'
export interface WorkbenchTab { noteId: string; title: string }

interface WorkbenchState {
  tabs: WorkbenchTab[]
  activeNoteId: string | null
  activeView: WorkbenchView | null
  leftSidebar: boolean
  recent: string[]
  history: string[]
  historyIndex: number
  headingRequest: { id: string; sequence: number } | null
  noteScrollPositions: Record<string, number>
  openNote: (noteId: string, title: string) => void
  openView: (view: WorkbenchView) => void
  resetWorkspace: () => void
  closeTab: (noteId: string) => string | null
  closeAllTabs: () => void
  revealHeading: (id: string) => void
  saveNoteScroll: (noteId: string, scrollTop: number) => void
  getNoteScroll: (noteId: string) => number
  setSidebar: (side: 'left', open: boolean) => void
  goBack: () => string | null
  goForward: () => string | null
}

export const useWorkbenchStore = create<WorkbenchState>((set, get) => ({
  tabs: [],
  activeNoteId: null,
  activeView: null,
  leftSidebar: true,
  recent: [],
  history: [],
  historyIndex: -1,
  headingRequest: null,
  noteScrollPositions: {},
  openNote: (noteId, title) => set((state) => {
    if (state.activeNoteId === noteId && state.activeView === null) return state
    const history = state.history.slice(0, state.historyIndex + 1)
    const nextHistory = history.at(-1) === noteId ? history : [...history, noteId]
    return {
      tabs: state.tabs.some((tab) => tab.noteId === noteId) ? state.tabs : [...state.tabs, { noteId, title }],
      activeNoteId: noteId,
      activeView: null,
      recent: [noteId, ...state.recent.filter((id) => id !== noteId)].slice(0, 12),
      history: nextHistory,
      historyIndex: nextHistory.length - 1,
    }
  }),
  openView: (activeView) => set({ activeView }),
  resetWorkspace: () => set({ tabs: [], activeNoteId: null, activeView: null, leftSidebar: true, recent: [], history: [], historyIndex: -1, headingRequest: null, noteScrollPositions: {} }),
  closeTab: (noteId) => {
    const state = get()
    const tabs = state.tabs.filter((tab) => tab.noteId !== noteId)
    const activeNoteId = state.activeNoteId === noteId ? tabs.at(-1)?.noteId ?? null : state.activeNoteId
    set({ tabs, activeNoteId })
    return activeNoteId
  },
  closeAllTabs: () => set({ tabs: [], activeNoteId: null }),
  revealHeading: (id) => set((state) => ({ headingRequest: { id, sequence: (state.headingRequest?.sequence ?? 0) + 1 } })),
  saveNoteScroll: (noteId, scrollTop) => set((state) => ({ noteScrollPositions: { ...state.noteScrollPositions, [noteId]: scrollTop } })),
  getNoteScroll: (noteId) => get().noteScrollPositions[noteId] ?? 0,
  setSidebar: (_side, leftSidebar) => set({ leftSidebar }),
  goBack: () => {
    const state = get()
    const historyIndex = Math.max(0, state.historyIndex - 1)
    if (historyIndex === state.historyIndex) return null
    const activeNoteId = state.history[historyIndex]
    set({ historyIndex, activeNoteId })
    return activeNoteId
  },
  goForward: () => {
    const state = get()
    const historyIndex = Math.min(state.history.length - 1, state.historyIndex + 1)
    if (historyIndex === state.historyIndex) return null
    const activeNoteId = state.history[historyIndex]
    set({ historyIndex, activeNoteId })
    return activeNoteId
  },
}))
