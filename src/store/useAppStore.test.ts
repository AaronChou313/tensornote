// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { useAppStore } from './useAppStore'

describe('app workspace UI state', () => {
  beforeEach(() => {
    localStorage.clear()
    useAppStore.setState({
      theme: 'dark',
      sidebarOpen: true,
      searchOpen: true,
      commandPaletteOpen: true,
      activeLabId: 'lab-1',
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
      sidebarOpen: false,
      searchOpen: false,
      commandPaletteOpen: false,
      activeLabId: null,
      pendingLabAction: null,
      kernelStatus: 'offline',
      editorDirtyPath: null,
      editorDirtyPaths: {},
      labDirty: false,
      progress: { note: { read: true, labRun: false, reviewed: false } },
    })
  })
})
