import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { JupyterConfig } from '../jupyter/types'

interface JupyterState extends JupyterConfig {
  settingsOpen: boolean
  setSettingsOpen: (open: boolean) => void
  updateConfig: (patch: Partial<JupyterConfig>) => void
}

export const useJupyterStore = create<JupyterState>()(
  persist(
    (set) => ({
      serverUrl: 'http://127.0.0.1:8888',
      token: '',
      kernelName: 'python3',
      settingsOpen: false,
      setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
      updateConfig: (patch) => set(patch),
    }),
    {
      name: 'tensornote-jupyter-config',
      partialize: ({ serverUrl, token, kernelName }) => ({ serverUrl, token, kernelName }),
    },
  ),
)
