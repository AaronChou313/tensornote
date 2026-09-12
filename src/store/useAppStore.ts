import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { KernelStatus, NoteProgress } from '../types'
import { migrateAppPreferences } from './migrations'

type Theme = 'light' | 'dark'
export type EditorMode = 'read' | 'edit'
export type SettingsSection = 'appearance' | 'editor' | 'compute' | 'about'

interface AppState {
  theme: Theme
  editorDefaultMode: EditorMode
  editorLineNumbers: boolean
  editorWordWrap: boolean
  sidebarOpen: boolean
  searchOpen: boolean
  publishOpen: boolean
  settingsOpen: boolean
  settingsSection: SettingsSection
  newNoteRequestNonce: number
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
  setPublishOpen: (open: boolean) => void
  setSettingsOpen: (open: boolean, section?: SettingsSection) => void
  requestNewNote: () => void
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
      publishOpen: false,
      settingsOpen: false,
      settingsSection: 'appearance',
      newNoteRequestNonce: 0,
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
      setPublishOpen: (publishOpen) => set({ publishOpen }),
      setSettingsOpen: (settingsOpen, section) => set((state) => ({ settingsOpen, ...(section ? { settingsSection: section } : {}), ...(settingsOpen ? {} : { settingsSection: state.settingsSection }) })),
      requestNewNote: () => set((state) => ({ newNoteRequestNonce: state.newNoteRequestNonce + 1 })),
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
        publishOpen: false,
        settingsOpen: false,
        settingsSection: 'appearance',
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
