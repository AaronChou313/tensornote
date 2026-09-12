import type { RemoteProviderKind } from '../remote'

export interface RemoteTreeEntry {
  path: string
  type: 'blob' | 'tree'
  sha: string
  size?: number
}

export interface RemoteMetadata {
  name: string
  ref: string
  revision: string
  tree: RemoteTreeEntry[]
}

interface CachedRemoteMetadata extends RemoteMetadata { expiresAt: number }
const memory = new Map<string, CachedRemoteMetadata>()
const COMMIT_PATTERN = /^[0-9a-f]{40}$/i

function key(provider: RemoteProviderKind, project: string, ref?: string) {
  return `tensornote:remote:v1:${provider}:${project.toLowerCase()}:${ref || 'default'}`
}

export function readRemoteMetadataCache(provider: RemoteProviderKind, project: string, ref?: string): RemoteMetadata | null {
  const cacheKey = key(provider, project, ref)
  let cached = memory.get(cacheKey)
  if (!cached && typeof sessionStorage !== 'undefined') {
    try { cached = JSON.parse(sessionStorage.getItem(cacheKey) || 'null') as CachedRemoteMetadata | undefined } catch { /* ignore corrupt browser cache */ }
  }
  if (!cached || cached.expiresAt <= Date.now()) {
    memory.delete(cacheKey)
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(cacheKey)
    return null
  }
  return { name: cached.name, ref: cached.ref, revision: cached.revision, tree: cached.tree }
}

export function writeRemoteMetadataCache(provider: RemoteProviderKind, project: string, requestedRef: string | undefined, metadata: RemoteMetadata) {
  const immutable = COMMIT_PATTERN.test(requestedRef || '')
  const cached: CachedRemoteMetadata = { ...metadata, expiresAt: Date.now() + (immutable ? 24 * 60 * 60_000 : 5 * 60_000) }
  const cacheKey = key(provider, project, requestedRef)
  memory.set(cacheKey, cached)
  if (typeof sessionStorage !== 'undefined') {
    try { sessionStorage.setItem(cacheKey, JSON.stringify(cached)) } catch { /* cache is an optimization */ }
  }
}

export function clearRemoteMetadataCache() {
  for (const cacheKey of memory.keys()) {
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(cacheKey)
  }
  memory.clear()
}
