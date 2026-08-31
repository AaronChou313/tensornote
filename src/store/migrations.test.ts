import { describe, expect, it } from 'vitest'
import { migrateAppPreferences, migrateExtensionSettings, migrateGitSettings, migrateWorkspaceSettings } from './migrations'

describe('persisted settings migrations', () => {
  it('migrates legacy theme and progress while dropping malformed values', () => {
    expect(migrateAppPreferences({ darkMode: true, noteProgress: { a: { read: true }, bad: null } })).toEqual({
      theme: 'dark',
      editorDefaultMode: 'read',
      editorLineNumbers: true,
      editorWordWrap: true,
      progress: {
        a: { read: true, labRun: false, reviewed: false },
        bad: { read: false, labRun: false, reviewed: false },
      },
    })
  })

  it('keeps valid editor preferences and repairs invalid values', () => {
    expect(migrateAppPreferences({ editorDefaultMode: 'split', editorLineNumbers: false, editorWordWrap: false })).toMatchObject({
      editorDefaultMode: 'split',
      editorLineNumbers: false,
      editorWordWrap: false,
    })
    expect(migrateAppPreferences({ editorDefaultMode: 'rich-text' })).toMatchObject({
      editorDefaultMode: 'read',
      editorLineNumbers: true,
      editorWordWrap: true,
    })
  })

  it('normalizes recent workspaces and trust keys from old settings', () => {
    expect(migrateWorkspaceSettings({
      recent: [{ id: 'local:notes', type: 'local', name: 'Notes', config: { provider: 'local', invalid: 3 } }, { id: 2 }],
      trustedRevisions: ['github:a/b@1', 'github:a/b@1', null],
      executionOverrides: { 'local:notes': true, malformed: 'yes' },
    })).toEqual({
      recentWorkspaces: [{ id: 'local:notes', type: 'local', name: 'Notes', sourceLabel: 'local', detail: undefined, config: { provider: 'local' }, openedAt: 0 }],
      trustedRevisions: ['github:a/b@1'],
      executionOverrides: { 'local:notes': true },
    })
  })

  it('renames extension permissions to grants and removes unknown capabilities', () => {
    expect(migrateExtensionSettings({
      enabled: { 'demo.ok': true, bad: 'yes' },
      permissions: { 'demo.ok': ['workspace:read', 'camera', 'workspace:read'] },
      settings: { 'demo.ok': { label: 'Hello', count: 3 } },
    })).toEqual({
      enabled: { 'demo.ok': true },
      grants: { 'demo.ok': ['workspace:read'] },
      settings: { 'demo.ok': { label: 'Hello' } },
    })
  })

  it('migrates the legacy Git bridge url and falls back safely', () => {
    expect(migrateGitSettings({ url: ' http://127.0.0.1:9000 ' })).toEqual({ bridgeUrl: 'http://127.0.0.1:9000' })
    expect(migrateGitSettings(null)).toEqual({ bridgeUrl: 'http://127.0.0.1:4318' })
  })
})
