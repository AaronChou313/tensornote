import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Note } from '../types'
import type { WorkspaceEntry, WorkspaceProvider } from '../workspace/types'
import { indexExperiments } from './indexer'

function provider(files: Record<string, string>): WorkspaceProvider {
  return {
    id: 'local:test', type: 'local',
    capabilities: { read: true, write: false, watch: false, binary: false, git: false, authentication: false },
    descriptor: { id: 'local:test', type: 'local', name: 'Test', sourceLabel: 'Test' },
    async open() {}, async close() {},
    async list(parent) {
      const prefix = parent ? `${parent}/` : ''
      return Object.keys(files).filter((path) => path.startsWith(prefix) && !path.slice(prefix.length).includes('/')).map((path): WorkspaceEntry => ({ path, name: path.slice(prefix.length), kind: 'file' }))
    },
    async readText(path) { return files[path] },
    async readBinary() { return new ArrayBuffer(0) },
    async stat(path) { if (!(path in files)) throw new Error('missing'); return { path, kind: 'file', size: files[path].length } },
    async resolveAssetUrl(path) { return path },
  }
}

describe('experiment index requirements discovery', () => {
  it('adds direct requirements files from the working directory without treating them as declared', async () => {
    const manifest = readFileSync('fixtures/experiments/minimal/tensornote.experiment.yaml', 'utf8')
    const note = { id: 'note', path: 'lesson.md', experimentReferences: [{ manifest: 'project/tensornote.experiment.yaml', sourceOffset: 1 }] } as Note
    const result = await indexExperiments(provider({
      'project/tensornote.experiment.yaml': manifest,
      'project/hello.py': 'print("hello")',
      'project/requirements.txt': 'jupyterlab\n',
      'project/requirements-gpu.txt': 'torch\n',
      'project/not-requirements.md': '# ignored',
    }), [note])

    expect(result[0].detectedRequirementFiles).toEqual([
      { path: 'project/requirements-gpu.txt', size: 6 },
      { path: 'project/requirements.txt', size: 11 },
    ])
  })
})
