import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ExtensionPermission } from '../extensions/types'
import { migrateExtensionSettings } from './migrations'

interface ExtensionState {
  managerOpen: boolean
  enabled: Record<string, boolean>
  grants: Record<string, ExtensionPermission[]>
  settings: Record<string, Record<string, boolean | string>>
  setManagerOpen(open: boolean): void
  setEnabled(id: string, enabled: boolean): void
  setGrants(id: string, grants: ExtensionPermission[]): void
  setSetting(id: string, key: string, value: boolean | string): void
  removeExtension(id: string): void
}

export const useExtensionStore = create<ExtensionState>()(persist((set) => ({
  managerOpen: false,
  enabled: {},
  grants: {},
  settings: {},
  setManagerOpen: (managerOpen) => set({ managerOpen }),
  setEnabled: (id, enabled) => set((state) => ({ enabled: { ...state.enabled, [id]: enabled } })),
  setGrants: (id, grants) => set((state) => ({ grants: { ...state.grants, [id]: grants } })),
  setSetting: (id, key, value) => set((state) => ({ settings: { ...state.settings, [id]: { ...state.settings[id], [key]: value } } })),
  removeExtension: (id) => set((state) => {
    const enabled = { ...state.enabled }; const grants = { ...state.grants }; const settings = { ...state.settings }
    delete enabled[id]; delete grants[id]; delete settings[id]
    return { enabled, grants, settings }
  }),
}), {
  name: 'tensornote-extensions',
  version: 1,
  migrate: (persisted) => migrateExtensionSettings(persisted),
  partialize: ({ enabled, grants, settings }) => ({ enabled, grants, settings }),
}))
