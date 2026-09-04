import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { validatePublication } from './validate-publication.mjs'

const revision = '0123456789abcdef0123456789abcdef01234567'

async function workspace(overrides = {}) {
  const root = await mkdtemp(join(tmpdir(), 'tensornote-publish-'))
  await mkdir(join(root, 'notes'))
  await mkdir(join(root, 'assets'))
  await writeFile(join(root, 'LICENSE'), 'Example license')
  await writeFile(join(root, 'notes/start.md'), `---\nid: start\ntitle: Start\nsection: Guide\norder: 0\ntags: [start]\nprerequisites: []\nsummary: Start here.\n---\n\n# Start\n`)
  await writeFile(join(root, 'tensornote.yaml'), `schemaVersion: 1\nworkspace:\n  name: Demo\ncontent:\n  root: notes\nassets:\n  root: assets\nnavigation:\n  mode: filesystem\nfeatures:\n  executable: false\nenvironment:\n  files: []\npublishing:\n  title: Demo Course\n  description: Public demo\n  accent: '#5a8f69'\n  defaultNote: start\nextensions: {}\n`)
  for (const [path, source] of Object.entries(overrides)) await writeFile(join(root, path), source)
  return root
}

describe('publication validator', () => {
  it('accepts a strict Workspace with license, presentation, and immutable revision', async () => {
    const result = await validatePublication({ workspace: await workspace(), owner: 'demo', repo: 'course', revision })
    expect(result).toMatchObject({ ok: true, notes: 1, license: 'LICENSE' })
  })

  it('rejects missing license and non-immutable revisions', async () => {
    const root = await workspace({ LICENSE: '' })
    const result = await validatePublication({ workspace: root, owner: 'demo', repo: 'course', revision: 'main' })
    expect(result.ok).toBe(false)
    expect(result.findings.map((item) => item.code)).toEqual(expect.arrayContaining(['revision', 'license']))
  })

  it('rejects unbounded repository identifiers', async () => {
    const result = await validatePublication({ workspace: await workspace(), owner: '..', repo: 'x'.repeat(101), revision })
    expect(result.findings).toContainEqual(expect.objectContaining({ code: 'repository' }))
  })

  it('rejects obvious credential files', async () => {
    const root = await workspace({ '.env': 'TOKEN=do-not-publish' })
    const result = await validatePublication({ workspace: root, owner: 'demo', repo: 'course', revision })
    expect(result.findings).toContainEqual(expect.objectContaining({ code: 'secret-file', file: '.env' }))
  })
})
