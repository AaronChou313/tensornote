import { describe, expect, it } from 'vitest'
import { createWorkspaceManifest, validateKnowledgeBaseName } from './createWorkspace'
import { parseWorkspaceManifestWithCompatibility } from './schema'

describe('knowledge base creation', () => {
  it.each(['', '.', '..', 'a/b', 'a\\b', 'bad:name', 'CON', 'LPT9.txt', 'trailing ', 'name.'])('rejects unsafe name %s', (name) => expect(validateKnowledgeBaseName(name)).toBeTruthy())
  it.each(['Transformer Notes', '课程笔记', 'notes-2026'])('accepts %s', (name) => expect(validateKnowledgeBaseName(name)).toBeNull())
  it('uses the current schema defaults in the generated manifest', () => {
    const { manifest, compatibility } = parseWorkspaceManifestWithCompatibility(createWorkspaceManifest('课程笔记'), 'fallback')
    expect(compatibility.status).toBe('supported')
    expect(manifest).toMatchObject({ schemaVersion: 1, workspace: { name: '课程笔记' }, content: { root: 'notes' }, assets: { root: 'assets' }, features: { executable: false } })
  })
})
