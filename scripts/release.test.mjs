import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createWindowsReleaseConfig } from './create-release-config.mjs'
import { generateReleaseManifest } from './generate-release-manifest.mjs'
import { validateRelease } from './validate-release.mjs'

describe('release tooling', () => {
  it('keeps repository release contracts aligned', async () => {
    await expect(validateRelease({ root: '.', tag: 'v1.6.0' })).resolves.toMatchObject({ ok: true, version: '1.6.0', tag: 'v1.6.0' })
    const mismatch = await validateRelease({ root: '.', tag: 'v1.6.1' })
    expect(mismatch.findings).toContainEqual(expect.objectContaining({ code: 'tag' }))
  })

  it('generates deterministic hashes for every release asset', async () => {
    const root = await mkdtemp(join(tmpdir(), 'tensornote-release-'))
    await mkdir(join(root, 'desktop'))
    await writeFile(join(root, 'desktop/TensorNote.bin'), 'release asset')
    const revision = 'ab'.repeat(20)
    const manifest = await generateReleaseManifest({ assetsDirectory: root, version: '1.6.0', tag: 'v1.6.0', revision })
    expect(manifest.assets).toEqual([expect.objectContaining({ path: 'desktop/TensorNote.bin', size: 13, sha256: expect.stringMatching(/^[a-f0-9]{64}$/) })])
    expect(manifest.revision).toBe(revision)
    expect(await readFile(join(root, 'SHA256SUMS'), 'utf8')).toContain('desktop/TensorNote.bin')
    await expect(generateReleaseManifest({ assetsDirectory: root, version: '1.6.0', tag: 'v1.6.0', revision: 'short' })).rejects.toThrow('complete Git commit SHA')
  })

  it('builds a bounded Windows signing override without certificate material', async () => {
    const root = await mkdtemp(join(tmpdir(), 'tensornote-signing-'))
    const path = join(root, 'release.json')
    const config = await createWindowsReleaseConfig({ output: path, thumbprint: 'ab'.repeat(20), timestampUrl: 'https://timestamp.example.com' })
    expect(config.bundle.windows).toEqual({ certificateThumbprint: 'AB'.repeat(20), digestAlgorithm: 'sha256', timestampUrl: 'https://timestamp.example.com/' })
    await expect(createWindowsReleaseConfig({ output: path, thumbprint: 'bad', timestampUrl: 'http://timestamp.example.com' })).rejects.toThrow('THUMBPRINT')
  })
})
