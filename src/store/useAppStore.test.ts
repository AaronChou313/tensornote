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
      commandPaletteOpen: true,
      settingsOpen: true,
      settingsSection: 'compute',
      activeLabId: 'lab-1',
      activeLabNoteId: 'note-1',
      labOpenNonce: 4,
      pendingLabAction: { labId: 'lab-1', action: 'runAll' },
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
      commandPaletteOpen: false,
      settingsOpen: false,
      settingsSection: 'appearance',
      activeLabId: null,
      activeLabNoteId: null,
      labOpenNonce: 0,
      pendingLabAction: null,
      kernelStatus: 'offline',
      editorDirtyPath: null,
      editorDirtyPaths: {},
      labDirty: false,
      progress: { note: { read: true, labRun: false, reviewed: false } },
    })
  })

  it('keeps settings section in memory and remounts a requested lab on every open', () => {
    const store = useAppStore.getState()
    store.setSettingsOpen(true, 'compute')
    store.openLab('note-2', 'lab-2')
    store.openLab('note-2', 'lab-2')

    expect(useAppStore.getState()).toMatchObject({ settingsOpen: true, settingsSection: 'compute', activeLabId: 'lab-2', activeLabNoteId: 'note-2', labOpenNonce: 6 })
  })
})
