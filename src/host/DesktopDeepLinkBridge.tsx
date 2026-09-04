import { useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { computeRuntime } from '../compute/ComputeRuntime'
import { parseTensorNoteDeepLink } from '../publishing/links'
import { useAppStore } from '../store/useAppStore'
import { useComputeStore } from '../store/useComputeStore'
import { useGitStore } from '../store/useGitStore'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import { useWorkbenchStore } from '../workbench/useWorkbenchStore'
import { GitHubWorkspaceProvider } from '../workspace/providers/GitHubWorkspaceProvider'

const loadDeepLinkPlugin = import.meta.env.VITE_TENSORNOTE_HOST === 'desktop'
  ? () => import('@tauri-apps/plugin-deep-link')
  : undefined

let initialDeepLinkConsumed = false

export function DesktopDeepLinkBridge() {
  const navigate = useNavigate()

  const open = useCallback(async (value: string) => {
    const source = parseTensorNoteDeepLink(value)
    if (!source) return
    const workspace = useWorkspaceStore.getState()
    const current = workspace.session
    const sameRevision = current?.descriptor.type === 'github'
      && current.descriptor.config?.owner === source.owner
      && current.descriptor.config?.repo === source.repo
      && current.descriptor.revision === source.revision

    if (!sameRevision) {
      const app = useAppStore.getState()
      const dirtyNotes = Object.keys(app.editorDirtyPaths).length
      if ((dirtyNotes > 0 || app.labDirty) && !window.confirm('当前 Workspace 有未保存修改。确定打开分享链接吗？')) return
      await computeRuntime.shutdown()
      await workspace.closeWorkspace()
      useWorkbenchStore.getState().resetWorkspace()
      app.resetWorkspaceUi()
      useComputeStore.getState().setScratchOpen(false)
      useGitStore.getState().disconnect()
    }

    const session = sameRevision
      ? current
      : await useWorkspaceStore.getState().openProvider(new GitHubWorkspaceProvider(source.owner, source.repo, source.revision))
    const noteId = source.noteId || session?.manifest.publishing.defaultNote
    navigate(noteId && session?.documentById.has(noteId) ? `/notes/${encodeURIComponent(noteId)}` : '/workspace')
  }, [navigate])

  useEffect(() => {
    if (!loadDeepLinkPlugin) return
    let disposed = false
    let unlisten: (() => void) | undefined
    void loadDeepLinkPlugin().then(async ({ getCurrent, onOpenUrl }) => {
      if (!initialDeepLinkConsumed) {
        initialDeepLinkConsumed = true
        const current = await getCurrent()
        if (!disposed && current?.[0]) await open(current[0])
      }
      if (!disposed) unlisten = await onOpenUrl((urls) => { if (urls[0]) void open(urls[0]) })
    }).catch(() => undefined)
    return () => { disposed = true; unlisten?.() }
  }, [open])

  return null
}
