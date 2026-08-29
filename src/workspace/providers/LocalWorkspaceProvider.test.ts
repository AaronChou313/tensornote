import { describe, expect, it } from 'vitest'
import { WorkspaceConflictError } from '../types'
import { LocalWorkspaceProvider } from './LocalWorkspaceProvider'

let clock = 100

class MemoryFile {
  kind = 'file' as const
  data: Uint8Array
  modifiedAt = clock++

  constructor(readonly name: string, content = '') {
    this.data = new TextEncoder().encode(content)
  }

  async getFile() {
    const data = this.data
    return {
      size: data.byteLength,
      lastModified: this.modifiedAt,
      text: async () => new TextDecoder().decode(data),
      arrayBuffer: async () => data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
    }
  }

  async createWritable() {
    return {
      write: async (value: string | ArrayBuffer | Blob) => {
        if (typeof value === 'string') this.data = new TextEncoder().encode(value)
        else if (value instanceof ArrayBuffer) this.data = new Uint8Array(value)
        else this.data = new Uint8Array(await value.arrayBuffer())
      },
      close: async () => { this.modifiedAt = clock++ },
    }
  }
}

class MemoryDirectory {
  kind = 'directory' as const
  entries = new Map<string, MemoryFile | MemoryDirectory>()

  constructor(readonly name: string) {}

  async *values() { for (const entry of this.entries.values()) yield entry }

  async getFileHandle(name: string, options?: { create?: boolean }) {
    const existing = this.entries.get(name)
    if (existing instanceof MemoryFile) return existing
    if (!options?.create) throw new Error('File not found')
    const file = new MemoryFile(name)
    this.entries.set(name, file)
    return file
  }

  async getDirectoryHandle(name: string, options?: { create?: boolean }) {
    const existing = this.entries.get(name)
    if (existing instanceof MemoryDirectory) return existing
    if (!options?.create) throw new Error('Directory not found')
    const directory = new MemoryDirectory(name)
    this.entries.set(name, directory)
    return directory
  }

  async removeEntry(name: string) {
    if (!this.entries.delete(name)) throw new Error('Entry not found')
  }
}

function providerWithNote() {
  const root = new MemoryDirectory('demo')
  const notes = new MemoryDirectory('notes')
  notes.entries.set('hello.md', new MemoryFile('hello.md', '# Hello'))
  root.entries.set('notes', notes)
  return new LocalWorkspaceProvider(root as never)
}

describe('LocalWorkspaceProvider authoring', () => {
  it('writes with optimistic conflict protection', async () => {
    const provider = providerWithNote()
    await provider.open()
    const initial = await provider.stat('notes/hello.md')

    await provider.writeText('notes/hello.md', '# Updated', { expectedModifiedAt: initial.modifiedAt, expectedSize: initial.size })
    await expect(provider.writeText('notes/hello.md', '# Stale', { expectedModifiedAt: initial.modifiedAt })).rejects.toBeInstanceOf(WorkspaceConflictError)
    expect(await provider.readText('notes/hello.md')).toBe('# Updated')

    const latest = await provider.stat('notes/hello.md')
    await provider.removeEntry('notes/hello.md')
    await expect(provider.writeText('notes/hello.md', '# Recreated silently', { expectedModifiedAt: latest.modifiedAt })).rejects.toBeInstanceOf(WorkspaceConflictError)
  })

  it('creates, copies, moves and removes workspace entries', async () => {
    const provider = providerWithNote()
    await provider.open()

    await provider.createDirectory('notes/drafts')
    await provider.writeText('notes/drafts/new.md', '# New')
    await expect(provider.moveEntry('notes/drafts', 'notes/drafts/nested')).rejects.toThrow('来源目录内部')
    await provider.copyEntry('notes/drafts/new.md', 'notes/drafts/copy.md')
    await provider.moveEntry('notes/drafts/copy.md', 'notes/moved.md')

    expect(await provider.readText('notes/moved.md')).toBe('# New')
    await provider.removeEntry('notes/drafts')
    await expect(provider.stat('notes/drafts')).rejects.toThrow('not found')
  })
})
