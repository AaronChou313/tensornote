import { describe, expect, it } from 'vitest'
import { parseWorkspaceManifest } from './schema'

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
      extensions: { graph: 'custom' },
    })
    expect(manifest).not.toHaveProperty('futureField')
  })

  it('rejects an invalid schema version', () => {
    expect(() => parseWorkspaceManifest('schemaVersion: 0')).toThrow('schemaVersion')
  })
})
