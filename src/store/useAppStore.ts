import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { KernelStatus, NoteProgress } from '../types'

type Theme = 'light' | 'dark'
export type PendingLabAction = { labId: string; action: 'runAll' } | null

interface AppState {
  theme: Theme
  sidebarOpen: boolean
  searchOpen: boolean
  commandPaletteOpen: boolean
  newNoteRequestNonce: number
  activeLabId: string | null
  pendingLabAction: PendingLabAction
  kernelStatus: KernelStatus
  editorDirtyPath: string | null
  editorDirtyPaths: Record<string, true>
  labDirty: boolean
  progress: Record<string, NoteProgress>
  toggleTheme: () => void
  setSidebarOpen: (open: boolean) => void
  setSearchOpen: (open: boolean) => void
  setCommandPaletteOpen: (open: boolean) => void
  requestNewNote: () => void
  setActiveLabId: (id: string | null) => void
  setPendingLabAction: (action: PendingLabAction) => void
  setKernelStatus: (status: KernelStatus) => void
  setEditorDirtyPath: (path: string | null) => void
  setEditorDirty: (path: string, dirty: boolean) => void
  setLabDirty: (dirty: boolean) => void
  updateProgress: (noteId: string, patch: Partial<NoteProgress>) => void
}

const emptyProgress: NoteProgress = { read: false, labRun: false, reviewed: false }

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'light',
      sidebarOpen: false,
      searchOpen: false,
      commandPaletteOpen: false,
      newNoteRequestNonce: 0,
      activeLabId: null,
      pendingLabAction: null,
      kernelStatus: 'offline',
      editorDirtyPath: null,
      editorDirtyPaths: {},
      labDirty: false,
      progress: {},
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setSearchOpen: (searchOpen) => set({ searchOpen }),
      setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
      requestNewNote: () => set((state) => ({ newNoteRequestNonce: state.newNoteRequestNonce + 1 })),
      setActiveLabId: (activeLabId) => set({ activeLabId }),
      setPendingLabAction: (pendingLabAction) => set({ pendingLabAction }),
      setKernelStatus: (kernelStatus) => set({ kernelStatus }),
      setEditorDirtyPath: (editorDirtyPath) => set({ editorDirtyPath, editorDirtyPaths: editorDirtyPath ? { [editorDirtyPath]: true } : {} }),
      setEditorDirty: (path, dirty) => set((state) => {
        const editorDirtyPaths = { ...state.editorDirtyPaths }
        if (dirty) editorDirtyPaths[path] = true
        else delete editorDirtyPaths[path]
        return { editorDirtyPaths, editorDirtyPath: Object.keys(editorDirtyPaths)[0] ?? null }
      }),
      setLabDirty: (labDirty) => set({ labDirty }),
      updateProgress: (noteId, patch) =>
        set((state) => ({
          progress: {
            ...state.progress,
            [noteId]: { ...(state.progress[noteId] ?? emptyProgress), ...patch },
          },
        })),
    }),
    {
      name: 'tensornote-preferences',
      partialize: (state) => ({ theme: state.theme, progress: state.progress }),
    },
  ),
)
