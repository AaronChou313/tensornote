import { describe, expect, it, vi } from 'vitest'
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

  it('reuses parsed documents when a refresh reports the same file fingerprint', async () => {
    const provider = createProvider('local', { 'hello.md': note })
    const readText = provider.readText.bind(provider)
    let reads = 0
    provider.readText = async (path) => { reads += 1; return readText(path) }
    provider.stat = async (path) => ({ path, kind: 'file', size: note.length, modifiedAt: 123 })

    await loadWorkspace(provider, [])
    await loadWorkspace(provider, [])

    expect(reads).toBe(1)
  })

  it('indexes large asset listings without reading binary payloads', async () => {
    const files = Object.fromEntries([
      ['notes/hello.md', note],
      ...Array.from({ length: 1_000 }, (_, index) => [`assets/image-${index}.bin`, 'binary-placeholder']),
    ])
    const provider = createProvider('local', files)
    provider.readBinary = vi.fn(async () => new ArrayBuffer(0))

    const session = await loadWorkspace(provider, [])

    expect(session.documents).toHaveLength(1)
    expect(session.navigation.length).toBeGreaterThan(0)
    expect(provider.readBinary).not.toHaveBeenCalled()
  })
})

it('loads root README outside content.root without indexing attachments or enabling execution', async () => {
  const session = await loadWorkspace(createProvider('local', {
    'tensornote.yaml': 'schemaVersion: 1\ncontent:\n  root: notes',
    'README.md': '# Course\n\n[Start](notes/hello.md)\n![Image](images/one.png)',
    'notes/hello.md': note,
    'images/one.png': 'binary fixture',
  }), [])
  expect(session.overview?.path).toBe('README.md')
  expect(session.documents.map((item) => item.path)).toEqual(['notes/hello.md'])
  expect(session.manifest.features.executable).toBe(false)
  expect(session.knowledgeIndex.resolveMarkdownHref('notes/hello.md', '')?.note.id).toBe('hello')
})

it('prefers a dedicated root overview and refreshes edited introductions', async () => {
  const files = { 'README.md': '# GitHub README', 'OVERVIEW.md': '# Custom introduction' }
  const provider = createProvider('local', files)
  expect((await loadWorkspace(provider, [])).overview?.content).toContain('Custom introduction')
  files['OVERVIEW.md'] = '# Updated introduction'
  expect((await loadWorkspace(provider, [])).overview?.content).toContain('Updated introduction')
})

it('indexes Project Experiment references without executing them', async () => {
  const manifest = `schemaVersion: 1
experiment:
  id: demo-project
  title: Demo project
  workingDirectory: .
environments:
  default:
    python: '3.11'
    files: [requirements.txt]
presets:
  smoke:
    title: Smoke
    environment: default
    steps: [run]
defaultPreset: smoke
steps:
  run:
    title: Run
    runner: python
    file: run.py`
  const session = await loadWorkspace(createProvider('local', {
    'note.md': `${note}\n\`\`\`tensornote-experiment\nmanifest: ./experiment/tensornote.experiment.yaml\npreset: smoke\n\`\`\``,
    'experiment/tensornote.experiment.yaml': manifest,
    'experiment/requirements.txt': '',
    'experiment/run.py': 'print(1)',
  }), [])
  expect(session.experiments).toHaveLength(1)
  expect(session.experiments[0]).toMatchObject({ manifestPath: 'experiment/tensornote.experiment.yaml', readOnly: false })
  expect(session.experiments[0].manifest?.experiment.id).toBe('demo-project')
})
