import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { JupyterConfig } from '../jupyter/types'

interface JupyterState extends JupyterConfig {
  settingsOpen: boolean
  setSettingsOpen: (open: boolean) => void
  updateConfig: (patch: Partial<JupyterConfig>) => void
}

const tokenStorageKey = 'tensornote-jupyter-token'

function sessionToken() {
  try {
    return sessionStorage.getItem(tokenStorageKey) ?? ''
  } catch {
    return ''
  }
}

export const useJupyterStore = create<JupyterState>()(
  persist(
    (set) => ({
      serverUrl: 'http://127.0.0.1:8888',
      token: sessionToken(),
      kernelName: 'python3',
      settingsOpen: false,
      setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
      updateConfig: (patch) => {
        if (patch.token !== undefined) {
          try { sessionStorage.setItem(tokenStorageKey, patch.token) } catch { /* Session-only fallback stays in memory. */ }
        }
        set(patch)
      },
    }),
    {
      name: 'tensornote-jupyter-config',
      version: 1,
      migrate: (persisted) => {
        const value = persisted as Partial<JupyterState>
        return { serverUrl: value.serverUrl, kernelName: value.kernelName }
      },
      partialize: ({ serverUrl, kernelName }) => ({ serverUrl, kernelName }),
    },
  ),
)
