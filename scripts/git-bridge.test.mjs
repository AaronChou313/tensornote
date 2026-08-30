import { execFile } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'
import { createGitService, parseHistory, parsePorcelainV2, validateRepositoryPaths } from './git-bridge-lib.mjs'

const execFileAsync = promisify(execFile)

describe('Git Bridge protocol parsing', () => {
  it('parses branch metadata and staged, working, renamed, and untracked records', () => {
    const source = [
      '# branch.oid 0123456789abcdef',
      '# branch.head main',
      '# branch.upstream origin/main',
      '# branch.ab +2 -1',
      '1 M. N... 100644 100644 100644 aaaaaaa bbbbbbb staged.md',
      '1 .M N... 100644 100644 100644 aaaaaaa bbbbbbb working.md',
      '2 R. N... 100644 100644 100644 aaaaaaa bbbbbbb R100 renamed.md',
      'old.md',
      '? new.md',
      '',
    ].join('\0')
    const result = parsePorcelainV2(source)
    expect(result).toMatchObject({ branch: 'main', upstream: 'origin/main', ahead: 2, behind: 1, clean: false })
    expect(result.changes).toEqual([
      expect.objectContaining({ path: 'staged.md', staged: true, unstaged: false, kind: 'modified' }),
      expect.objectContaining({ path: 'working.md', staged: false, unstaged: true, kind: 'modified' }),
      expect.objectContaining({ path: 'renamed.md', originalPath: 'old.md', staged: true, kind: 'renamed' }),
      expect.objectContaining({ path: 'new.md', staged: false, unstaged: true, kind: 'untracked' }),
    ])
  })

  it('parses structured history records', () => {
    const source = 'abcdef\x1fabc123\x1fAda\x1f2026-08-30T10:00:00Z\x1fAdd Git status\x1e'
    expect(parseHistory(source)).toEqual([{ hash: 'abcdef', shortHash: 'abc123', author: 'Ada', authoredAt: '2026-08-30T10:00:00Z', subject: 'Add Git status' }])
  })

  it('rejects absolute and escaping repository paths', () => {
    expect(validateRepositoryPaths(['notes/a.md'])).toEqual(['notes/a.md'])
    expect(() => validateRepositoryPaths(['../secret'])).toThrow('不能越过')
    expect(() => validateRepositoryPaths(['/tmp/file'])).toThrow('无效')
  })

  it('stages and commits through the fixed repository service', async () => {
    const root = await mkdtemp(join(tmpdir(), 'tensornote-git-'))
    const git = (args) => execFileAsync('git', args, { cwd: root })
    try {
      await git(['init', '--initial-branch=main'])
      await git(['config', 'user.name', 'TensorNote Test'])
      await git(['config', 'user.email', 'test@tensornote.local'])
      await expect(createGitService(root).history()).resolves.toEqual([])
      await writeFile(join(root, 'note.md'), '# First\n')
      await git(['add', 'note.md'])
      await git(['commit', '-m', 'Initial note'])
      await writeFile(join(root, 'note.md'), '# Updated\n')

      const service = createGitService(root)
      await expect(service.status()).resolves.toMatchObject({ branch: 'main', clean: false, changes: [expect.objectContaining({ path: 'note.md', unstaged: true })] })
      await expect(service.stage(['note.md'], true)).resolves.toMatchObject({ changes: [expect.objectContaining({ staged: true, unstaged: false })] })
      await expect(service.commit('Update note')).resolves.toMatchObject({ clean: true })
      await expect(service.history(1)).resolves.toEqual([expect.objectContaining({ subject: 'Update note' })])
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
