import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { computeProfileTemplates, type ComputeProfile } from '../compute/types'

interface ComputeState {
  profiles: ComputeProfile[]
  activeProfileId: string
  tokens: Record<string, string>
  settingsOpen: boolean
  scratchOpen: boolean
  setSettingsOpen: (open: boolean) => void
  setScratchOpen: (open: boolean) => void
  setActiveProfile: (id: string) => void
  addProfile: (template: Omit<ComputeProfile, 'id'>) => string
  updateProfile: (id: string, patch: Partial<Omit<ComputeProfile, 'id'>>) => void
  removeProfile: (id: string) => void
  setToken: (profileId: string, token: string) => void
}

const tokenStorageKey = 'tensornote-compute-tokens'
const legacyTokenStorageKey = 'tensornote-jupyter-token'
const defaultProfile: ComputeProfile = { id: 'local-python', ...computeProfileTemplates[0] }

function readTokens() {
  try {
    const stored = sessionStorage.getItem(tokenStorageKey)
    if (stored) return JSON.parse(stored) as Record<string, string>
    const legacyToken = sessionStorage.getItem(legacyTokenStorageKey)
    return legacyToken ? { [defaultProfile.id]: legacyToken } : {}
  } catch {
    return {}
  }
}

function writeTokens(tokens: Record<string, string>) {
  try { sessionStorage.setItem(tokenStorageKey, JSON.stringify(tokens)) } catch { /* Session-only fallback stays in memory. */ }
}

function profileId(name: string) {
  const slug = name.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'compute'
  return `${slug}-${Date.now().toString(36)}`
}

export function activeComputeProfile(state: Pick<ComputeState, 'profiles' | 'activeProfileId'>) {
  return state.profiles.find((profile) => profile.id === state.activeProfileId) ?? state.profiles[0] ?? defaultProfile
}

export const useComputeStore = create<ComputeState>()(
  persist(
    (set, get) => ({
      profiles: [defaultProfile],
      activeProfileId: defaultProfile.id,
      tokens: readTokens(),
      settingsOpen: false,
      scratchOpen: false,
      setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
      setScratchOpen: (scratchOpen) => set({ scratchOpen }),
      setActiveProfile: (activeProfileId) => set({ activeProfileId }),
      addProfile: (template) => {
        const id = profileId(template.name)
        set((state) => ({ profiles: [...state.profiles, { id, ...template }], activeProfileId: id }))
        return id
      },
      updateProfile: (id, patch) => set((state) => ({
        profiles: state.profiles.map((profile) => profile.id === id ? { ...profile, ...patch } : profile),
      })),
      removeProfile: (id) => {
        const state = get()
        if (state.profiles.length <= 1) return
        const profiles = state.profiles.filter((profile) => profile.id !== id)
        const tokens = { ...state.tokens }
        delete tokens[id]
        writeTokens(tokens)
        set({ profiles, tokens, activeProfileId: state.activeProfileId === id ? profiles[0].id : state.activeProfileId })
      },
      setToken: (profileIdValue, token) => set((state) => {
        const tokens = { ...state.tokens, [profileIdValue]: token }
        writeTokens(tokens)
        return { tokens }
      }),
    }),
    {
      name: 'tensornote-jupyter-config',
      version: 2,
      migrate: (persisted, version) => {
        if (version >= 2) return persisted as ComputeState
        const legacy = persisted as { serverUrl?: string; kernelName?: string }
        const migrated: ComputeProfile = {
          ...defaultProfile,
          serverUrl: legacy.serverUrl || defaultProfile.serverUrl,
          kernelName: legacy.kernelName || defaultProfile.kernelName,
        }
        return { profiles: [migrated], activeProfileId: migrated.id }
      },
      partialize: ({ profiles, activeProfileId }) => ({ profiles, activeProfileId }),
    },
  ),
)
