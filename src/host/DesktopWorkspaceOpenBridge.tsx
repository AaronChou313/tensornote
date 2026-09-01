import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { computeRuntime } from '../compute/ComputeRuntime'
import { useAppStore } from '../store/useAppStore'
import { useComputeStore } from '../store/useComputeStore'
import { useGitStore } from '../store/useGitStore'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import { useWorkbenchStore } from '../workbench/useWorkbenchStore'
import type { HostDirectorySelection } from './types'
import { getHostAdapter } from './runtime'

const loadNativeWorkspaceProvider = import.meta.env.VITE_TENSORNOTE_HOST === 'desktop'
  ? () => import('../workspace/providers/NativeLocalWorkspaceProvider')
  : undefined

export function DesktopWorkspaceOpenBridge() {
  const navigate = useNavigate()
  const opening = useRef(false)

  useEffect(() => {
    const host = getHostAdapter()
    if (!host.capabilities.nativeFilesystem || !loadNativeWorkspaceProvider) return
    let cancelled = false
    let unsubscribe: (() => void) | undefined

    const openSelection = async (selection: HostDirectorySelection) => {
      if (cancelled || opening.current) return
      opening.current = true
      try {
        const current = useWorkspaceStore.getState().session
        if (current?.descriptor.id !== selection.workspaceId) {
          const app = useAppStore.getState()
          const dirtyNotes = Object.keys(app.editorDirtyPaths).length
          if ((dirtyNotes > 0 || app.labDirty) && !window.confirm('当前 Workspace 有未保存修改。确定打开拖入的 Workspace 吗？')) return
          await computeRuntime.shutdown()
          await useWorkspaceStore.getState().closeWorkspace()
          useWorkbenchStore.getState().resetWorkspace()
          app.resetWorkspaceUi()
          useComputeStore.getState().setScratchOpen(false)
          useGitStore.getState().disconnect()
          const { NativeLocalWorkspaceProvider } = await loadNativeWorkspaceProvider()
          await useWorkspaceStore.getState().openProvider(new NativeLocalWorkspaceProvider(selection))
        }

        const session = useWorkspaceStore.getState().session
        const note = selection.initialPath
          ? session?.documents.find((document) => document.path === selection.initialPath)
          : undefined
        if (note) {
          useWorkbenchStore.getState().openNote(note.id, note.frontmatter.title)
          navigate(`/notes/${note.id}`)
        } else {
          navigate('/workspace')
        }
      } finally {
        opening.current = false
      }
    }

    const requestOpen = (selection: HostDirectorySelection) => {
      void openSelection(selection).catch(() => undefined)
    }

    if (host.onWorkspaceOpen) void host.onWorkspaceOpen((selection) => {
      if (!host.takePendingWorkspaceOpen) {
        requestOpen(selection)
        return
      }
      void host.takePendingWorkspaceOpen()
        .then((pending) => requestOpen(pending ?? selection))
        .catch(() => requestOpen(selection))
    })
      .then((remove) => {
        if (cancelled) remove()
        else unsubscribe = remove
      })
      .catch(() => undefined)
    if (host.takePendingWorkspaceOpen) void host.takePendingWorkspaceOpen()
      .then((selection) => { if (selection) requestOpen(selection) })
      .catch(() => undefined)

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [navigate])

  return null
}
