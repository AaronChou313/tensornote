import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { loadWorkspace } from '../workspace/loadWorkspace'
import type { Note } from '../types'
import type {
  RecentWorkspace,
  WorkspaceFileStat,
  WorkspaceProvider,
  WorkspaceSession,
  WorkspaceWriteOptions,
} from '../workspace/types'

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
  refreshWorkspace: () => Promise<WorkspaceSession>
  saveDocument: (path: string, content: string, options?: WorkspaceWriteOptions) => Promise<Note>
  writeAsset: (path: string, content: ArrayBuffer) => Promise<WorkspaceFileStat>
  createNote: (path: string, content: string) => Promise<Note>
  createFolder: (path: string) => Promise<void>
  removeEntry: (path: string) => Promise<void>
  copyEntry: (source: string, destination: string) => Promise<void>
  moveEntry: (source: string, destination: string) => Promise<void>
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

function mutationError(reason: unknown) {
  return reason instanceof Error ? reason.message : 'Workspace 文件操作失败'
}

async function ensureMissing(provider: WorkspaceProvider, path: string) {
  try {
    await provider.stat(path)
    throw new Error(`目标路径已存在：${path}`)
  } catch (reason) {
    if (reason instanceof Error && reason.message.startsWith('目标路径已存在')) throw reason
    if (!(reason instanceof Error) || !reason.message.toLowerCase().includes('not found')) throw reason
  }
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => {
      const reload = async (provider: WorkspaceProvider) => {
        const session = await loadWorkspace(provider, get().trustedRevisions)
        set({ status: 'ready', loadingMessage: '', error: null, provider, session })
        return session
      }

      const writableProvider = () => {
        const provider = get().provider
        if (!provider?.capabilities.write) throw new Error('当前 Workspace 为只读来源')
        return provider
      }

      const mutate = async <T>(action: (provider: WorkspaceProvider) => Promise<T>, refresh = true) => {
        const provider = writableProvider()
        set({ error: null })
        try {
          const result = await action(provider)
          if (refresh) await reload(provider)
          return result
        } catch (reason) {
          set({ error: mutationError(reason) })
          throw reason
        }
      }

      return {
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
        refreshWorkspace: async () => {
          const provider = get().provider
          if (!provider) throw new Error('没有打开的 Workspace')
          return reload(provider)
        },
        saveDocument: async (path, content, options) => {
          await mutate(async (provider) => {
            if (!provider.writeText) throw new Error('当前 Provider 不支持保存文本')
            return provider.writeText(path, content, options)
          })
          const document = get().session?.documents.find((item) => item.path === path)
          if (!document) throw new Error(`保存后无法重新索引文档：${path}`)
          return document
        },
        writeAsset: (path, content) => mutate(async (provider) => {
          if (!provider.writeBinary) throw new Error('当前 Provider 不支持写入资源文件')
          return provider.writeBinary(path, content)
        }, false),
        createNote: async (path, content) => {
          await mutate(async (provider) => {
            if (!provider.writeText) throw new Error('当前 Provider 不支持新建文档')
            await ensureMissing(provider, path)
            return provider.writeText(path, content)
          })
          const document = get().session?.documents.find((item) => item.path === path)
          if (!document) throw new Error(`新建后无法索引文档：${path}`)
          return document
        },
        createFolder: (path) => mutate(async (provider) => {
          if (!provider.createDirectory) throw new Error('当前 Provider 不支持新建文件夹')
          await ensureMissing(provider, path)
          await provider.createDirectory(path)
        }),
        removeEntry: (path) => mutate(async (provider) => {
          if (!provider.removeEntry) throw new Error('当前 Provider 不支持删除')
          await provider.removeEntry(path)
        }),
        copyEntry: (source, destination) => mutate(async (provider) => {
          if (!provider.copyEntry) throw new Error('当前 Provider 不支持复制')
          await provider.copyEntry(source, destination)
        }),
        moveEntry: (source, destination) => mutate(async (provider) => {
          if (!provider.moveEntry) throw new Error('当前 Provider 不支持移动')
          await provider.moveEntry(source, destination)
        }),
        closeWorkspace: async () => {
          let closeError: string | null = null
          try {
            await get().provider?.close()
          } catch (reason) {
            closeError = reason instanceof Error ? `Workspace 已关闭，但 Provider 清理失败：${reason.message}` : 'Workspace 已关闭，但 Provider 清理失败'
          } finally {
            set({ status: 'idle', loadingMessage: '', error: closeError, provider: null, session: null })
          }
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
      }
    },
    {
      name: 'tensornote-workspaces',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ recentWorkspaces, trustedRevisions }) => ({ recentWorkspaces, trustedRevisions }),
    },
  ),
)
