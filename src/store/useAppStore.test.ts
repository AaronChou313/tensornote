// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { useAppStore } from './useAppStore'

describe('app workspace UI state', () => {
  beforeEach(() => {
    localStorage.clear()
    useAppStore.setState({
      theme: 'dark',
      editorDefaultMode: 'edit',
      editorLineNumbers: false,
      editorWordWrap: false,
      sidebarOpen: true,
      searchOpen: true,
      publishOpen: true,
      settingsOpen: true,
      settingsSection: 'compute',
      kernelStatus: 'busy',
      editorDirtyPath: 'notes/a.md',
      editorDirtyPaths: { 'notes/a.md': true },
      labDirty: true,
      progress: { note: { read: true, labRun: false, reviewed: false } },
    })
  })

  it('clears workspace-scoped UI state without resetting preferences or progress', () => {
    useAppStore.getState().resetWorkspaceUi()

    expect(useAppStore.getState()).toMatchObject({
      theme: 'dark',
      editorDefaultMode: 'edit',
      editorLineNumbers: false,
      editorWordWrap: false,
      sidebarOpen: false,
      searchOpen: false,
      publishOpen: false,
      settingsOpen: false,
      settingsSection: 'appearance',
      kernelStatus: 'offline',
      editorDirtyPath: null,
      editorDirtyPaths: {},
      labDirty: false,
      progress: { note: { read: true, labRun: false, reviewed: false } },
    })
  })

  it('keeps the requested settings section in memory', () => {
    const store = useAppStore.getState()
    store.setSettingsOpen(true, 'compute')
    expect(useAppStore.getState()).toMatchObject({ settingsOpen: true, settingsSection: 'compute' })
  })
})
