import { deploymentAdapter } from '../deployment/config'
import { initialComputeProfile } from '../compute/defaultProfile'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { type ComputeConnectionEvent, type ComputeProfile } from '../compute/types'

interface ComputeState {
  profiles: ComputeProfile[]
  activeProfileId: string
  tokens: Record<string, string>
  connectionEvent: ComputeConnectionEvent | null
  scratchOpen: boolean
  setScratchOpen: (open: boolean) => void
  setActiveProfile: (id: string) => void
  addProfile: (template: Omit<ComputeProfile, 'id'>) => string
  updateProfile: (id: string, patch: Partial<Omit<ComputeProfile, 'id'>>) => void
  removeProfile: (id: string) => void
  setToken: (profileId: string, token: string) => void
  setConnectionEvent: (event: ComputeConnectionEvent | null) => void
  upsertOwnedRuntimeProfile: (input: { serverId: string; environmentName: string; serverUrl: string; kernelName: string; token: string }) => string
  removeOwnedRuntimeProfile: (serverId: string) => void
}

const tokenStorageKey = 'tensornote-compute-tokens'
const legacyTokenStorageKey = 'tensornote-jupyter-token'
const defaultProfile = initialComputeProfile(deploymentAdapter.mode)
const legacyProfile = initialComputeProfile('local')

function readTokens() {
  try {
    const stored = sessionStorage.getItem(tokenStorageKey)
    if (stored) return JSON.parse(stored) as Record<string, string>
    const legacyToken = sessionStorage.getItem(legacyTokenStorageKey)
    return legacyToken ? { [legacyProfile.id]: legacyToken } : {}
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
      connectionEvent: null,
      scratchOpen: false,
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
      setConnectionEvent: (connectionEvent) => set({ connectionEvent }),
      upsertOwnedRuntimeProfile: ({ serverId, environmentName, serverUrl, kernelName, token }) => {
        const state = get()
        const existing = state.profiles.find((profile) => profile.runtimeServerId === serverId)
        const id = existing?.id ?? profileId(`TensorNote · ${environmentName}`)
        const profile: ComputeProfile = {
          id,
          name: `TensorNote · ${environmentName}`,
          kind: 'jupyter',
          serverUrl,
          kernelName,
          scope: 'workspace',
          description: '由 TensorNote Desktop 启动并管理',
          runtimeServerId: serverId,
        }
        const profiles = existing
          ? state.profiles.map((item) => item.id === id ? profile : item)
          : [...state.profiles, profile]
        const tokens = { ...state.tokens, [id]: token }
        writeTokens(tokens)
        set({ profiles, activeProfileId: id, tokens })
        return id
      },
      removeOwnedRuntimeProfile: (serverId) => {
        const state = get()
        const removed = state.profiles.find((profile) => profile.runtimeServerId === serverId)
        if (!removed) return
        const profiles = state.profiles.filter((profile) => profile.id !== removed.id)
        const nextProfiles = profiles.length > 0 ? profiles : [defaultProfile]
        const tokens = { ...state.tokens }
        delete tokens[removed.id]
        writeTokens(tokens)
        set({
          profiles: nextProfiles,
          tokens,
          activeProfileId: state.activeProfileId === removed.id ? nextProfiles[0].id : state.activeProfileId,
        })
      },
    }),
    {
      name: 'tensornote-jupyter-config',
      version: 2,
      migrate: (persisted, version) => {
        if (version >= 2) return persisted as ComputeState
        const legacy = persisted as { serverUrl?: string; kernelName?: string }
        const migrated: ComputeProfile = {
          ...legacyProfile,
          serverUrl: legacy.serverUrl || legacyProfile.serverUrl,
          kernelName: legacy.kernelName || legacyProfile.kernelName,
        }
        return { profiles: [migrated], activeProfileId: migrated.id }
      },
      partialize: ({ profiles, activeProfileId }) => {
        const persistentProfiles = profiles.filter((profile) => !profile.runtimeServerId)
        const safeProfiles = persistentProfiles.length > 0 ? persistentProfiles : [defaultProfile]
        return {
          profiles: safeProfiles,
          activeProfileId: safeProfiles.some((profile) => profile.id === activeProfileId)
            ? activeProfileId
            : safeProfiles[0].id,
        }
      },
    },
  ),
)
