import { describe, expect, it } from 'vitest'
import { DraftRecoveryRepository, draftRecoveryKey, type DraftRecoveryBackend, type DraftRecoveryRecord } from './draftRecovery'

class MemoryBackend implements DraftRecoveryBackend {
  values = new Map<string, DraftRecoveryRecord>()
  async get(key: string) { return this.values.get(key) ?? null }
  async put(key: string, value: DraftRecoveryRecord) { this.values.set(key, value) }
  async delete(key: string) { this.values.delete(key) }
}

describe('draft recovery repository', () => {
  it('keeps drafts isolated by workspace and path', async () => {
    const backend = new MemoryBackend()
    const repository = new DraftRecoveryRepository(backend, () => 100)
    await repository.write({ workspaceId: 'local:a', path: 'notes/a.md', content: '# Draft', baseModifiedAt: 10, baseSize: 20 })

    expect(await repository.read('local:a', 'notes/a.md')).toMatchObject({ content: '# Draft', updatedAt: 100 })
    expect(await repository.read('local:b', 'notes/a.md')).toBeNull()
    expect(backend.values.has(draftRecoveryKey('local:a', 'notes/a.md'))).toBe(true)
  })

  it('clears saved drafts and expires stale recovery state', async () => {
    const backend = new MemoryBackend()
    let now = 100
    const repository = new DraftRecoveryRepository(backend, () => now)
    await repository.write({ workspaceId: 'local:a', path: 'a.md', content: 'draft' })
    await repository.clear('local:a', 'a.md')
    expect(await repository.read('local:a', 'a.md')).toBeNull()

    await repository.write({ workspaceId: 'local:a', path: 'a.md', content: 'old' })
    now += 31 * 24 * 60 * 60 * 1000
    expect(await repository.read('local:a', 'a.md')).toBeNull()
    expect(backend.values.size).toBe(0)
  })
})
