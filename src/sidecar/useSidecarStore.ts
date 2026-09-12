import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SidecarState {
  activeNoteId: string | null
  activeSidecarId: string | null
  isOpen: boolean
  width: number
  open: (noteId: string, sidecarId: string) => void
  close: () => void
  setWidth: (width: number) => void
  syncNote: (noteId: string | null) => void
}

export const useSidecarStore = create<SidecarState>()(persist(
  (set) => ({
    activeNoteId: null,
    activeSidecarId: null,
    isOpen: false,
    width: 580,
    open: (activeNoteId, activeSidecarId) => set({ activeNoteId, activeSidecarId, isOpen: true }),
    close: () => set({ activeNoteId: null, activeSidecarId: null, isOpen: false }),
    setWidth: (width) => set({ width: Math.min(850, Math.max(400, width)) }),
    syncNote: (noteId) => set((state) => state.activeNoteId && state.activeNoteId !== noteId
      ? { activeNoteId: null, activeSidecarId: null, isOpen: false }
      : state),
  }),
  { name: 'tensornote-sidecar', partialize: (state) => ({ width: state.width }) },
))

