import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { validateWorkspace } from '../skills/tensornote-knowledge-workspace/scripts/validate-workspace.mjs'

const roots = []
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))) })
const note = (extra = '', body = '# Start\n\n## Details') => `---\nid: start\ntitle: Start\nsection: Basics\norder: 1\ntags: []\nprerequisites: []\nsummary: A starting point\n${extra}---\n${body}\n`
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'tensornote-validator-'))
  roots.push(root)
  await mkdir(join(root, 'notes'))
  await mkdir(join(root, 'assets'))
  await writeFile(join(root, 'tensornote.yaml'), 'schemaVersion: 1\ncontent: { root: notes }\nassets: { root: assets }\nfeatures: { executable: false }\n')
  await writeFile(join(root, 'notes/start.md'), note())
  return root
}
const codes = (result) => result.findings.map((finding) => finding.code)

describe('portable workspace validator', () => {
  it('parses real YAML quoting, block lists and aliases', async () => {
    const root = await fixture()
    await writeFile(join(root, 'notes/start.md'), note('aliases:\n  - "An alias: with punctuation"\n', '# Start\n\n## Details\n\n[[An alias: with punctuation#Details]]'))
    const result = await validateWorkspace(root, { strict: true })
    expect(result.ok).toBe(true)
    expect(result.notes).toBe(1)
  })
  it('rejects malformed YAML and duplicate keys without printing source values', async () => {
    const root = await fixture()
    await writeFile(join(root, 'tensornote.yaml'), 'schemaVersion: 1\nschemaVersion: 2\npassword: DO_NOT_PRINT\n')
    const result = await validateWorkspace(root)
    expect(codes(result)).toContain('yaml-invalid')
    expect(JSON.stringify(result)).not.toContain('DO_NOT_PRINT')
    expect(result.notes).toBe(0)
  })
  it('does not walk a content root outside the workspace', async () => {
    const root = await fixture()
    await writeFile(join(root, 'tensornote.yaml'), 'schemaVersion: 1\ncontent:\n  root: ../\n')
    const result = await validateWorkspace(root)
    expect(codes(result)).toContain('content-root')
    expect(result.notes).toBe(0)
  })
  it('rejects symlinked content roots', async () => {
    const root = await fixture()
    const outside = await fixture()
    await symlink(join(outside, 'notes'), join(root, 'linked'), process.platform === 'win32' ? 'junction' : 'dir')
    await writeFile(join(root, 'tensornote.yaml'), 'schemaVersion: 1\ncontent: {root: linked}\n')
    const result = await validateWorkspace(root)
    expect(codes(result)).toContain('symlink')
    expect(result.notes).toBe(0)
  })
  it('reports unresolved prerequisites, headings and malformed URLs without crashing', async () => {
    const root = await fixture()
    await writeFile(join(root, 'notes/start.md'), note('', '# Start\n\n[[start#Missing]]\n![x](%oops)\n[missing](missing.md)').replace('prerequisites: []', 'prerequisites: [missing]'))
    const result = await validateWorkspace(root, { strict: true })
    expect(codes(result)).toEqual(expect.arrayContaining(['prerequisite-unresolved', 'heading-unresolved', 'link-encoding', 'link-unresolved']))
    expect(result.ok).toBe(false)
    expect(codes(result)).not.toContain('workspace-io')
  })
  it('ignores example links inside backtick and tilde fences', async () => {
    const root = await fixture()
    await writeFile(join(root, 'notes/start.md'), note('', '# Start\n\n~~~~md\n[[absent]]\n~~~~\n\n````md\n[[absent]]\n```\n````'))
    expect((await validateWorkspace(root, { strict: true })).ok).toBe(true)
  })
  it('reports future schema as read-only and never rewrites it', async () => {
    const root = await fixture()
    await writeFile(join(root, 'tensornote.yaml'), 'schemaVersion: 99\n')
    expect(await validateWorkspace(root)).toMatchObject({ ok: false, readOnly: true, schemaVersion: 99 })
  })
  it('provides stable machine-readable JSON from its executable entry point', async () => {
    const root = await fixture()
    const output = execFileSync(process.execPath, [resolve('skills/tensornote-knowledge-workspace/scripts/validate-workspace.mjs'), root, '--strict', '--json'], { encoding: 'utf8' })
    expect(JSON.parse(output)).toMatchObject({ formatVersion: 1, ok: true, notes: 1, findings: [] })
  })
  it.skipIf(process.platform === 'win32')('runs through a symlinked skill entry point', async () => {
    const root = await fixture()
    const link = join(root, 'validator.mjs')
    await symlink(resolve('skills/tensornote-knowledge-workspace/scripts/validate-workspace.mjs'), link)
    const output = execFileSync(process.execPath, [link, root, '--json'], { encoding: 'utf8' })
    expect(JSON.parse(output)).toMatchObject({ formatVersion: 1, ok: true, notes: 1 })
  })

})
