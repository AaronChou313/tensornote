export interface DraftRecoveryRecord {
  version: 1
  workspaceId: string
  path: string
  content: string
  baseModifiedAt?: number
  baseSize?: number
  updatedAt: number
}

export interface DraftRecoveryBackend {
  get(key: string): Promise<DraftRecoveryRecord | null>
  put(key: string, value: DraftRecoveryRecord): Promise<void>
  delete(key: string): Promise<void>
}

const databaseName = 'tensornote-recovery'
const storeName = 'drafts'
const fallbackPrefix = 'tensornote:draft-recovery:'
const maxAge = 30 * 24 * 60 * 60 * 1000

export function draftRecoveryKey(workspaceId: string, path: string) {
  return `${workspaceId}\u0000${path}`
}

function validRecord(value: unknown): value is DraftRecoveryRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return record.version === 1
    && typeof record.workspaceId === 'string'
    && typeof record.path === 'string'
    && typeof record.content === 'string'
    && typeof record.updatedAt === 'number'
}

class LocalStorageBackend implements DraftRecoveryBackend {
  async get(key: string) {
    try {
      const source = localStorage.getItem(`${fallbackPrefix}${key}`)
      const parsed: unknown = source ? JSON.parse(source) : null
      return validRecord(parsed) ? parsed : null
    } catch {
      return null
    }
  }

  async put(key: string, value: DraftRecoveryRecord) {
    localStorage.setItem(`${fallbackPrefix}${key}`, JSON.stringify(value))
  }

  async delete(key: string) {
    localStorage.removeItem(`${fallbackPrefix}${key}`)
  }
}

class IndexedDbBackend implements DraftRecoveryBackend {
  private open() {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1)
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(storeName)) request.result.createObjectStore(storeName)
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error('无法打开草稿恢复数据库'))
    })
  }

  private async request<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>) {
    const database = await this.open()
    try {
      return await new Promise<T>((resolve, reject) => {
        const request = operation(database.transaction(storeName, mode).objectStore(storeName))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error ?? new Error('草稿恢复数据库操作失败'))
      })
    } finally {
      database.close()
    }
  }

  async get(key: string) {
    const value: unknown = await this.request('readonly', (store) => store.get(key))
    return validRecord(value) ? value : null
  }

  async put(key: string, value: DraftRecoveryRecord) {
    await this.request('readwrite', (store) => store.put(value, key))
  }

  async delete(key: string) {
    await this.request('readwrite', (store) => store.delete(key))
  }
}

class ResilientBackend implements DraftRecoveryBackend {
  private readonly fallback = new LocalStorageBackend()

  private primary() {
    return typeof indexedDB === 'undefined' ? this.fallback : new IndexedDbBackend()
  }

  async get(key: string) {
    try { return await this.primary().get(key) ?? await this.fallback.get(key) } catch { return this.fallback.get(key) }
  }

  async put(key: string, value: DraftRecoveryRecord) {
    try { await this.primary().put(key, value) } catch { await this.fallback.put(key, value) }
  }

  async delete(key: string) {
    try { await this.primary().delete(key) } catch { await this.fallback.delete(key) }
    await this.fallback.delete(key)
  }
}

export class DraftRecoveryRepository {
  constructor(private readonly backend: DraftRecoveryBackend = new ResilientBackend(), private readonly now = () => Date.now()) {}

  async read(workspaceId: string, path: string) {
    const key = draftRecoveryKey(workspaceId, path)
    const record = await this.backend.get(key)
    if (!record) return null
    if (record.workspaceId !== workspaceId || record.path !== path || this.now() - record.updatedAt > maxAge) {
      await this.backend.delete(key)
      return null
    }
    return record
  }

  write(input: Omit<DraftRecoveryRecord, 'version' | 'updatedAt'>) {
    const record: DraftRecoveryRecord = { ...input, version: 1, updatedAt: this.now() }
    return this.backend.put(draftRecoveryKey(input.workspaceId, input.path), record)
  }

  clear(workspaceId: string, path: string) {
    return this.backend.delete(draftRecoveryKey(workspaceId, path))
  }
}

export const draftRecovery = new DraftRecoveryRepository()
