import { describe, expect, it } from 'vitest'
import { detectEnvironmentFiles, loadWorkspace } from './loadWorkspace'
import type { WorkspaceEntry, WorkspaceProvider } from './types'

function createProvider(type: 'local' | 'github', files: Record<string, string>): WorkspaceProvider {
  const entries = Object.keys(files)
  const directories = new Set<string>()
  for (const path of entries) {
    const parts = path.split('/')
    for (let index = 1; index < parts.length; index += 1) directories.add(parts.slice(0, index).join('/'))
  }

  return {
    id: `${type}:demo`,
    type,
    capabilities: { read: true, write: false, watch: false, binary: true, git: type === 'github', authentication: false },
    descriptor: {
      id: `${type}:demo`,
      type,
      name: 'Demo',
      sourceLabel: type === 'github' ? 'GitHub · Read only' : 'Local · Read only',
      ...(type === 'github' ? { revision: 'abc123', trustKey: 'github:demo/repo@abc123' } : {}),
    },
    async open() {},
    async close() {},
    async list(parent) {
      const prefix = parent ? `${parent}/` : ''
      const children = new Map<string, WorkspaceEntry>()
      for (const directory of directories) {
        if (!directory.startsWith(prefix)) continue
        const relative = directory.slice(prefix.length)
        if (!relative || relative.includes('/')) continue
        children.set(directory, { path: directory, name: relative, kind: 'directory' })
      }
      for (const path of entries) {
        if (!path.startsWith(prefix)) continue
        const relative = path.slice(prefix.length)
        if (!relative || relative.includes('/')) continue
        children.set(path, { path, name: relative, kind: 'file' })
      }
      return [...children.values()]
    },
    async readText(path) { return files[path] },
    async readBinary() { return new ArrayBuffer(0) },
    async stat(path) { return { path, kind: files[path] === undefined ? 'directory' : 'file' } },
    async resolveAssetUrl(path) { return path },
  }
}

const note = `---
id: hello
title: Hello Workspace
section: Guide
tags: [start]
---
# Hello Workspace
`

describe('loadWorkspace', () => {
  it('opens an empty local folder so the first note can be authored', async () => {
    const session = await loadWorkspace(createProvider('local', {}), [])

    expect(session.documents).toEqual([])
    expect(session.navigation).toEqual([])
    expect(session.manifest.features.executable).toBe(false)
  })

  it('opens a plain Markdown folder without granting execution', async () => {
    const session = await loadWorkspace(createProvider('local', { 'hello.md': note }), [])

    expect(session.documents).toHaveLength(1)
    expect(session.documents[0].id).toBe('hello')
    expect(session.manifest.content.root).toBe('')
    expect(session.manifest.features.executable).toBe(false)
    expect(session.trusted).toBe(true)
    expect(session.propertyIndex.query('section = Guide').rows.map((row) => row.note.id)).toEqual(['hello'])
  })

  it('pins trust to the exact GitHub revision', async () => {
    const provider = createProvider('github', {
      'tensornote.yaml': 'schemaVersion: 1\ncontent:\n  root: notes\nfeatures:\n  executable: true',
      'notes/hello.md': note,
    })

    expect((await loadWorkspace(provider, [])).trusted).toBe(false)
    expect((await loadWorkspace(provider, ['github:demo/repo@abc123'])).trusted).toBe(true)
  })

  it('keeps future-schema Markdown readable while disabling mutation capabilities', async () => {
    const provider = createProvider('local', {
      'tensornote.yaml': 'schemaVersion: 3\ncontent:\n  root: notes\nfeatures:\n  executable: true',
      'notes/hello.md': note,
    })
    provider.capabilities.write = true
    provider.capabilities.git = true

    const session = await loadWorkspace(provider, [])

    expect(session.documents.map((document) => document.id)).toEqual(['hello'])
    expect(session.capabilities).toMatchObject({ read: true, write: false, git: false })
    expect(session.manifest.features.executable).toBe(false)
    expect(session.compatibility.status).toBe('future')
  })

  it('detects declared and conventional environment files without installing them', () => {
    const entries: WorkspaceEntry[] = [
      { path: 'requirements.txt', name: 'requirements.txt', kind: 'file' },
      { path: 'env/environment.yml', name: 'environment.yml', kind: 'file' },
      { path: 'notes', name: 'notes', kind: 'directory' },
    ]

    expect(detectEnvironmentFiles(entries, ['env/environment.yml', 'missing.toml'])).toEqual([
      { path: 'env/environment.yml', kind: 'conda', exists: true, declared: true },
      { path: 'missing.toml', kind: 'unknown', exists: false, declared: true },
      { path: 'requirements.txt', kind: 'requirements', exists: true, declared: false },
    ])
  })
})
