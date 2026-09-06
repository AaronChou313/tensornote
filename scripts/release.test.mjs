import { mkdtemp, mkdir, readFile, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { collectReleaseArtifacts } from './collect-release-artifacts.mjs'
import { createWindowsReleaseConfig } from './create-release-config.mjs'
import { generateReleaseManifest } from './generate-release-manifest.mjs'
import { requiredReleaseCredentials } from './release-policy.mjs'
import { validateRelease } from './validate-release.mjs'

describe('release tooling', () => {
  it('keeps updater signing mandatory and platform signing explicit by channel', () => {
    const community = { channel: 'github-community', platformSigning: 'optional', updaterSigning: 'required' }
    expect(requiredReleaseCredentials(community)).toEqual(['TAURI_SIGNING_PRIVATE_KEY', 'TAURI_SIGNING_PRIVATE_KEY_PASSWORD'])
    expect(requiredReleaseCredentials({ ...community, channel: 'trusted-desktop', platformSigning: 'required' })).toContain('APPLE_CERTIFICATE')
    expect(() => requiredReleaseCredentials({ ...community, updaterSigning: 'optional' })).toThrow('Invalid release policy')
    expect(() => requiredReleaseCredentials({ ...community, channel: 'unknown' })).toThrow('Invalid release policy')
    expect(() => requiredReleaseCredentials({ ...community, channel: 'trusted-desktop' })).toThrow('Invalid release policy')
  })

  it('keeps repository release contracts aligned', async () => {
    await expect(validateRelease({ root: '.', tag: 'v1.6.1' })).resolves.toMatchObject({ ok: true, version: '1.6.1', tag: 'v1.6.1' })
    const mismatch = await validateRelease({ root: '.', tag: 'v1.6.2' })
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

  it('collects only distributable installers and updater signatures', async () => {
    const root = await mkdtemp(join(tmpdir(), 'tensornote-artifacts-'))
    const bundle = join(root, 'bundle')
    const output = join(root, 'output')
    await mkdir(join(bundle, 'macos/TensorNote.app/Contents'), { recursive: true })
    await mkdir(join(bundle, 'dmg'), { recursive: true })
    await writeFile(join(bundle, 'macos/TensorNote.app/Contents/Info.plist'), 'internal')
    await writeFile(join(bundle, 'macos/TensorNote.app.tar.gz'), 'updater')
    await writeFile(join(bundle, 'macos/TensorNote.app.tar.gz.sig'), 'signature')
    await writeFile(join(bundle, 'dmg/TensorNote.dmg'), 'installer')
    await symlink(join(bundle, 'dmg'), join(bundle, 'linked-bundle'), 'junction')
    await expect(collectReleaseArtifacts({ bundleRoot: bundle, outputDirectory: output, platform: 'macOS' })).resolves.toEqual([
      'TensorNote.app.tar.gz',
      'TensorNote.app.tar.gz.sig',
      'TensorNote.dmg',
    ])
    await expect(readFile(join(output, 'Info.plist'), 'utf8')).rejects.toThrow()
    expect(await readFile(join(output, 'TensorNote.dmg'), 'utf8')).toBe('installer')
  })
})
