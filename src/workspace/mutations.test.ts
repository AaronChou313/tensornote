import { describe, expect, it, vi } from 'vitest'
import { ensureWorkspacePathMissing } from './mutations'
import { WorkspaceNotFoundError } from './types'

describe('workspace creation preflight', () => {
  it('accepts native typed absence and older v1 absence errors', async () => {
    for (const error of [new WorkspaceNotFoundError('notes/new.md'), new Error('Workspace path not found: notes/new.md')]) {
      await expect(ensureWorkspacePathMissing({ stat: vi.fn().mockRejectedValue(error) }, 'notes/new.md')).resolves.toBeUndefined()
    }
  })
  it('never treats access failures or an existing file as absence', async () => {
    await expect(ensureWorkspacePathMissing({ stat: vi.fn().mockRejectedValue(new Error('Permission denied')) }, 'notes/new.md')).rejects.toThrow('Permission denied')
    await expect(ensureWorkspacePathMissing({ stat: vi.fn().mockResolvedValue({}) }, 'notes/new.md')).rejects.toThrow('目标路径已存在')
  })
})
