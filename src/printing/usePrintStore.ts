import { create } from 'zustand'

interface PrintRequest {
  id: number
  noteId: string
}

interface PrintState {
  nextRequestId: number
  request: PrintRequest | null
  requestNotePrint: (noteId: string) => void
  completeNotePrint: (requestId: number) => void
}

export const usePrintStore = create<PrintState>((set) => ({
  nextRequestId: 1,
  request: null,
  requestNotePrint: (noteId) => set((state) => ({
    request: { id: state.nextRequestId, noteId },
    nextRequestId: state.nextRequestId + 1,
  })),
  completeNotePrint: (requestId) => set((state) => state.request?.id === requestId ? { request: null } : state),
}))
