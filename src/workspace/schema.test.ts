import { describe, expect, it } from 'vitest'
import { parseWorkspaceManifest, parseWorkspaceManifestWithCompatibility } from './schema'

describe('parseWorkspaceManifest', () => {
  it('uses safe defaults for a plain Markdown folder', () => {
    const manifest = parseWorkspaceManifest(undefined, 'Research Notes')

    expect(manifest.workspace.name).toBe('Research Notes')
    expect(manifest.content.root).toBe('notes')
    expect(manifest.features.executable).toBe(false)
  })

  it('normalizes supported fields and ignores unknown top-level fields', () => {
    const manifest = parseWorkspaceManifest(`
schemaVersion: 1
workspace:
  name: Demo
  description: Portable notes
content:
  root: ./knowledge/
assets:
  root: ./media/
features:
  executable: true
environment:
  files: [requirements-dev.txt, ./env/environment.yml]
publishing:
  title: Public Demo
  description: A reproducible knowledge product
  logo: ./media/logo.png
  accent: '#5A8F69'
  defaultNote: welcome
futureField:
  enabled: true
extensions:
  graph: custom
`)

    expect(manifest).toMatchObject({
      schemaVersion: 1,
      workspace: { name: 'Demo', description: 'Portable notes' },
      content: { root: 'knowledge' },
      assets: { root: 'media' },
      features: { executable: true },
      environment: { files: ['requirements-dev.txt', 'env/environment.yml'] },
      publishing: { title: 'Public Demo', description: 'A reproducible knowledge product', logo: 'media/logo.png', accent: '#5a8f69', defaultNote: 'welcome' },
      extensions: { graph: 'custom' },
    })
    expect(manifest).not.toHaveProperty('futureField')
  })

  it('drops unsafe or malformed publishing presentation values', () => {
    const manifest = parseWorkspaceManifest(`
schemaVersion: 1
publishing:
  logo: ../private/logo.png
  accent: green
  defaultNote: start
`)

    expect(manifest.publishing).toEqual({ defaultNote: 'start' })
  })

  it('rejects an invalid schema version', () => {
    expect(() => parseWorkspaceManifest('schemaVersion: 0')).toThrow('schemaVersion')
  })

  it('migrates an unversioned manifest in memory without changing portable fields', () => {
    const result = parseWorkspaceManifestWithCompatibility('workspace:\n  name: Legacy\ncontent:\n  root: knowledge')

    expect(result.manifest).toMatchObject({ schemaVersion: 1, workspace: { name: 'Legacy' }, content: { root: 'knowledge' } })
    expect(result.compatibility).toMatchObject({ sourceVersion: 0, targetVersion: 1, status: 'migrated', readOnly: false })
  })

  it('opens a future manifest through a read-only compatibility projection', () => {
    const result = parseWorkspaceManifestWithCompatibility('schemaVersion: 9\nworkspace:\n  name: Future\nfeatures:\n  executable: true')

    expect(result.manifest).toMatchObject({ schemaVersion: 1, workspace: { name: 'Future' }, features: { executable: false } })
    expect(result.compatibility).toMatchObject({ sourceVersion: 9, status: 'future', readOnly: true })
    expect(result.compatibility.warnings[0]).toContain('Schema v9')
  })
})
