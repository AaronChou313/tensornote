import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { LocalGitClient } from '../git/LocalGitClient'
import type { GitBridgeHealth, GitDiff, GitHistoryEntry, GitStatus } from '../git/types'
import { migrateGitSettings } from './migrations'

type GitConnectionState = 'idle' | 'connecting' | 'ready' | 'error'

interface GitState {
  bridgeUrl: string
  connection: GitConnectionState
  busy: boolean
  error: string | null
  notice: string | null
  health: GitBridgeHealth | null
  status: GitStatus | null
  history: GitHistoryEntry[]
  diff: GitDiff | null
  setBridgeUrl: (url: string) => void
  connect: (workspaceName: string) => Promise<void>
  refresh: () => Promise<void>
  selectDiff: (path: string, staged: boolean) => Promise<void>
  stage: (path: string, staged: boolean) => Promise<void>
  commit: (message: string) => Promise<void>
  disconnect: () => void
  clearNotice: () => void
}

function message(reason: unknown) {
  return reason instanceof Error ? reason.message : 'Git 操作失败'
}

export const useGitStore = create<GitState>()(
  persist(
    (set, get) => {
      const client = () => new LocalGitClient(get().bridgeUrl)
      const load = async (activeClient = client()) => {
        const [status, history] = await Promise.all([activeClient.status(), activeClient.history()])
        set({ status, history, error: null })
        const selected = get().diff
        const change = status.changes.find((item) => item.path === selected?.path)
        if (change) {
          const staged = change.staged && (!change.unstaged || selected?.staged === true)
          set({ diff: await activeClient.diff(change.path, staged) })
        } else if (status.changes[0]) {
          const first = status.changes[0]
          set({ diff: await activeClient.diff(first.path, first.staged && !first.unstaged) })
        } else set({ diff: null })
      }

      return {
        bridgeUrl: 'http://127.0.0.1:4318',
        connection: 'idle',
        busy: false,
        error: null,
        notice: null,
        health: null,
        status: null,
        history: [],
        diff: null,
        setBridgeUrl: (bridgeUrl) => set({ bridgeUrl, connection: 'idle', health: null, status: null, history: [], diff: null, error: null }),
        connect: async (workspaceName) => {
          set({ connection: 'connecting', busy: true, error: null, notice: null })
          try {
            const activeClient = client()
            const health = await activeClient.health()
            if (health.workspaceName !== workspaceName) {
              throw new Error(`Git Bridge 指向“${health.workspaceName}”，当前 Local Workspace 是“${workspaceName}”`)
            }
            set({ health })
            await load(activeClient)
            set({ connection: 'ready', busy: false })
          } catch (reason) {
            set({ connection: 'error', busy: false, error: message(reason), health: null, status: null, history: [], diff: null })
            throw reason
          }
        },
        refresh: async () => {
          set({ busy: true, error: null, notice: null })
          try {
            await load()
            set({ connection: 'ready', busy: false })
          } catch (reason) {
            set({ busy: false, error: message(reason) })
            throw reason
          }
        },
        selectDiff: async (path, staged) => {
          set({ busy: true, error: null })
          try {
            set({ diff: await client().diff(path, staged), busy: false })
          } catch (reason) {
            set({ busy: false, error: message(reason) })
            throw reason
          }
        },
        stage: async (path, staged) => {
          set({ busy: true, error: null, notice: null })
          try {
            await client().stage([path], staged)
            await load()
            set({ busy: false, notice: staged ? `已暂存 ${path}` : `已取消暂存 ${path}` })
          } catch (reason) {
            set({ busy: false, error: message(reason) })
            throw reason
          }
        },
        commit: async (commitMessage) => {
          set({ busy: true, error: null, notice: null })
          try {
            await client().commit(commitMessage)
            await load()
            set({ busy: false, notice: '提交已创建' })
          } catch (reason) {
            set({ busy: false, error: message(reason) })
            throw reason
          }
        },
        disconnect: () => set({ connection: 'idle', busy: false, error: null, notice: null, health: null, status: null, history: [], diff: null }),
        clearNotice: () => set({ notice: null }),
      }
    },
    { name: 'tensornote-git', version: 1, migrate: (persisted) => migrateGitSettings(persisted), partialize: ({ bridgeUrl }) => ({ bridgeUrl }) },
  ),
)
