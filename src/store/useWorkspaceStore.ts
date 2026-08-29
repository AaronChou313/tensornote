import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { loadWorkspace } from '../workspace/loadWorkspace'
import type { RecentWorkspace, WorkspaceProvider, WorkspaceSession } from '../workspace/types'

type WorkspaceStatus = 'idle' | 'loading' | 'ready' | 'error'

interface WorkspaceState {
  status: WorkspaceStatus
  loadingMessage: string
  error: string | null
  provider: WorkspaceProvider | null
  session: WorkspaceSession | null
  recentWorkspaces: RecentWorkspace[]
  trustedRevisions: string[]
  openProvider: (provider: WorkspaceProvider) => Promise<WorkspaceSession>
  closeWorkspace: () => Promise<void>
  trustActiveWorkspace: () => void
  clearError: () => void
}

function recentFromSession(session: WorkspaceSession): RecentWorkspace {
  return {
    id: session.descriptor.id,
    type: session.descriptor.type,
    name: session.descriptor.name,
    sourceLabel: session.descriptor.sourceLabel,
    detail: session.descriptor.detail,
    config: session.descriptor.config,
    openedAt: session.openedAt,
  }
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      status: 'idle',
      loadingMessage: '',
      error: null,
      provider: null,
      session: null,
      recentWorkspaces: [],
      trustedRevisions: [],
      openProvider: async (provider) => {
        set({ status: 'loading', loadingMessage: '正在读取 Workspace…', error: null })
        try {
          const current = get().provider
          if (current && current !== provider) await current.close()
          const session = await loadWorkspace(provider, get().trustedRevisions)
          const recent = recentFromSession(session)
          set((state) => ({
            status: 'ready',
            loadingMessage: '',
            error: null,
            provider,
            session,
            recentWorkspaces: [recent, ...state.recentWorkspaces.filter((item) => item.id !== recent.id)].slice(0, 8),
          }))
          return session
        } catch (reason) {
          await provider.close().catch(() => undefined)
          const message = reason instanceof Error ? reason.message : '无法打开 Workspace'
          set({ status: 'error', loadingMessage: '', error: message, provider: null, session: null })
          throw reason
        }
      },
      closeWorkspace: async () => {
        await get().provider?.close()
        set({ status: 'idle', loadingMessage: '', error: null, provider: null, session: null })
      },
      trustActiveWorkspace: () => {
        const session = get().session
        const trustKey = session?.descriptor.trustKey
        if (!session || !trustKey) return
        set((state) => ({
          trustedRevisions: state.trustedRevisions.includes(trustKey)
            ? state.trustedRevisions
            : [...state.trustedRevisions, trustKey],
          session: { ...session, trusted: true },
        }))
      },
      clearError: () => set({ error: null, status: get().session ? 'ready' : 'idle' }),
    }),
    {
      name: 'tensornote-workspaces',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ recentWorkspaces, trustedRevisions }) => ({ recentWorkspaces, trustedRevisions }),
    },
  ),
)
