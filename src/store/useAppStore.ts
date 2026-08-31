import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { KernelStatus, NoteProgress } from '../types'
import { migrateAppPreferences } from './migrations'

type Theme = 'light' | 'dark'
export type EditorMode = 'read' | 'edit' | 'split'
export type PendingLabAction = { labId: string; action: 'runAll' } | null
export type SettingsSection = 'appearance' | 'editor' | 'compute' | 'extensions' | 'about'

interface AppState {
  theme: Theme
  editorDefaultMode: EditorMode
  editorLineNumbers: boolean
  editorWordWrap: boolean
  sidebarOpen: boolean
  searchOpen: boolean
  commandPaletteOpen: boolean
  settingsOpen: boolean
  settingsSection: SettingsSection
  newNoteRequestNonce: number
  activeLabId: string | null
  activeLabNoteId: string | null
  labOpenNonce: number
  pendingLabAction: PendingLabAction
  kernelStatus: KernelStatus
  editorDirtyPath: string | null
  editorDirtyPaths: Record<string, true>
  labDirty: boolean
  progress: Record<string, NoteProgress>
  setTheme: (theme: Theme) => void
  setEditorDefaultMode: (mode: EditorMode) => void
  setEditorLineNumbers: (enabled: boolean) => void
  setEditorWordWrap: (enabled: boolean) => void
  setSidebarOpen: (open: boolean) => void
  setSearchOpen: (open: boolean) => void
  setCommandPaletteOpen: (open: boolean) => void
  setSettingsOpen: (open: boolean, section?: SettingsSection) => void
  requestNewNote: () => void
  setActiveLabId: (id: string | null) => void
  openLab: (noteId: string | null, labId: string) => void
  setPendingLabAction: (action: PendingLabAction) => void
  setKernelStatus: (status: KernelStatus) => void
  setEditorDirtyPath: (path: string | null) => void
  setEditorDirty: (path: string, dirty: boolean) => void
  setLabDirty: (dirty: boolean) => void
  resetWorkspaceUi: () => void
  updateProgress: (noteId: string, patch: Partial<NoteProgress>) => void
}

const emptyProgress: NoteProgress = { read: false, labRun: false, reviewed: false }

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'light',
      editorDefaultMode: 'read',
      editorLineNumbers: true,
      editorWordWrap: true,
      sidebarOpen: false,
      searchOpen: false,
      commandPaletteOpen: false,
      settingsOpen: false,
      settingsSection: 'appearance',
      newNoteRequestNonce: 0,
      activeLabId: null,
      activeLabNoteId: null,
      labOpenNonce: 0,
      pendingLabAction: null,
      kernelStatus: 'offline',
      editorDirtyPath: null,
      editorDirtyPaths: {},
      labDirty: false,
      progress: {},
      setTheme: (theme) => set({ theme }),
      setEditorDefaultMode: (editorDefaultMode) => set({ editorDefaultMode }),
      setEditorLineNumbers: (editorLineNumbers) => set({ editorLineNumbers }),
      setEditorWordWrap: (editorWordWrap) => set({ editorWordWrap }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setSearchOpen: (searchOpen) => set({ searchOpen }),
      setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
      setSettingsOpen: (settingsOpen, section) => set((state) => ({ settingsOpen, ...(section ? { settingsSection: section } : {}), ...(settingsOpen ? {} : { settingsSection: state.settingsSection }) })),
      requestNewNote: () => set((state) => ({ newNoteRequestNonce: state.newNoteRequestNonce + 1 })),
      setActiveLabId: (activeLabId) => set({ activeLabId, ...(activeLabId ? {} : { activeLabNoteId: null }) }),
      openLab: (activeLabNoteId, activeLabId) => set((state) => ({ activeLabId, activeLabNoteId, labOpenNonce: state.labOpenNonce + 1 })),
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
      resetWorkspaceUi: () => set({
        sidebarOpen: false,
        searchOpen: false,
        commandPaletteOpen: false,
        settingsOpen: false,
        settingsSection: 'appearance',
        activeLabId: null,
        activeLabNoteId: null,
        labOpenNonce: 0,
        pendingLabAction: null,
        kernelStatus: 'offline',
        editorDirtyPath: null,
        editorDirtyPaths: {},
        labDirty: false,
      }),
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
      version: 2,
      migrate: (persisted) => migrateAppPreferences(persisted),
      partialize: (state) => ({
        theme: state.theme,
        editorDefaultMode: state.editorDefaultMode,
        editorLineNumbers: state.editorLineNumbers,
        editorWordWrap: state.editorWordWrap,
        progress: state.progress,
      }),
    },
  ),
)
