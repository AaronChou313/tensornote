import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { KernelStatus, NoteProgress } from '../types'

type Theme = 'light' | 'dark'

interface AppState {
  theme: Theme
  sidebarOpen: boolean
  searchOpen: boolean
  activeLabId: string | null
  kernelStatus: KernelStatus
  progress: Record<string, NoteProgress>
  toggleTheme: () => void
  setSidebarOpen: (open: boolean) => void
  setSearchOpen: (open: boolean) => void
  setActiveLabId: (id: string | null) => void
  setKernelStatus: (status: KernelStatus) => void
  updateProgress: (noteId: string, patch: Partial<NoteProgress>) => void
}

const emptyProgress: NoteProgress = { read: false, labRun: false, reviewed: false }

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'light',
      sidebarOpen: false,
      searchOpen: false,
      activeLabId: null,
      kernelStatus: 'offline',
      progress: {},
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setSearchOpen: (searchOpen) => set({ searchOpen }),
      setActiveLabId: (activeLabId) => set({ activeLabId }),
      setKernelStatus: (kernelStatus) => set({ kernelStatus }),
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
