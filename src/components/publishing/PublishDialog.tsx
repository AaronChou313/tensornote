import { useState } from 'react'
import { ArrowSquareOut, Check, Copy, ShareNetwork, X } from '@phosphor-icons/react'
import { useLocation } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { useWorkspaceStore } from '../../store/useWorkspaceStore'
import { useWorkbenchStore } from '../../workbench/useWorkbenchStore'
import { createRemoteReaderUrl } from '../../publishing/links'
import { deploymentAdapter } from '../../deployment/config'
import { formatWorkspaceSource, isRemoteWorkspaceSource } from '../../workspace/remote'
import { Button } from '../ui/Button'
import { ModalSurface } from '../ui/ModalSurface'

function copyFallback(value: string) {
  const field = document.createElement('textarea'); field.value = value; field.style.position = 'fixed'; field.style.opacity = '0'
  document.body.append(field); field.select(); const copied = document.execCommand('copy'); field.remove(); return copied
}

async function copyText(value: string) {
  try { await navigator.clipboard.writeText(value); return true } catch { return copyFallback(value) }
}

export function PublishDialog() {
  const open = useAppStore((state) => state.publishOpen)
  const setOpen = useAppStore((state) => state.setPublishOpen)
  const session = useWorkspaceStore((state) => state.session)
  const activeNoteId = useWorkbenchStore((state) => state.activeNoteId)
  const location = useLocation()
  const [pinned, setPinned] = useState(false)
  const [copied, setCopied] = useState<'ok' | 'error' | null>(null)
  const noteId = location.pathname.startsWith('/notes/') ? activeNoteId || undefined : undefined
  const remote = session && isRemoteWorkspaceSource(session.descriptor.type) && session.descriptor.config?.project
    ? { provider: session.descriptor.type, project: session.descriptor.config.project, repositoryUrl: session.descriptor.config.repositoryUrl || '', ref: session.descriptor.config.ref, revision: session.descriptor.revision, noteId }
    : null
  const shareUrl = remote ? createRemoteReaderUrl(deploymentAdapter.publicReaderUrl, remote, pinned) : ''
  if (!session) return null

  const changeOpen = (next: boolean) => {
    if (!next) { setPinned(false); setCopied(null) }
    setOpen(next)
  }

  const copy = async () => {
    const ok = await copyText(shareUrl)
    setCopied(ok ? 'ok' : 'error')
    window.setTimeout(() => setCopied(null), 1800)
  }

  return <ModalSurface open={open} onOpenChange={changeOpen} title="分享知识库" layerClassName="publish-dialog-layer" className="publish-dialog publish-dialog--compact">
    <header><span><ShareNetwork size={18} />分享知识库</span><Button variant="ghost" size="icon" onClick={() => changeOpen(false)} aria-label="关闭分享窗口"><X size={18} /></Button></header>
    <div className="publish-dialog__body">
      <div className="share-source"><small>{formatWorkspaceSource(session.descriptor.type)}</small><strong>{session.manifest.publishing.title || session.manifest.workspace.name}</strong><span>{session.descriptor.detail || session.descriptor.sourceLabel}</span></div>
      {remote ? <>
        <section className="share-link"><label htmlFor="knowledge-share-link">分享链接</label><div><input id="knowledge-share-link" readOnly value={shareUrl} onFocus={(event) => event.currentTarget.select()} /><Button variant="primary" onClick={() => void copy()}>{copied === 'ok' ? <Check size={16} /> : <Copy size={16} />}{copied === 'ok' ? '已复制' : '复制链接'}</Button></div>{copied === 'error' && <small role="alert">无法访问剪贴板，请手动选择链接。</small>}</section>
        <p className="share-target">当前链接将打开：<strong>{noteId ? session.documentById.get(noteId)?.frontmatter.title || noteId : '知识库概览'}</strong></p>
        {session.descriptor.revision && <details className="share-options"><summary>更多选项</summary><label><input type="checkbox" checked={pinned} onChange={(event) => setPinned(event.target.checked)} />固定到当前版本 <code>{session.descriptor.revision.slice(0, 8)}</code></label></details>}
        <footer><a href={shareUrl} target="_blank" rel="noreferrer">打开链接 <ArrowSquareOut size={14} /></a></footer>
      </> : <section className="share-local-guidance"><strong>这是一个本地知识库。</strong><p>TensorNote 不会自动上传你的文件。如果需要分享，请先将知识库托管到 GitHub、GitLab 或 Gitee，再通过“打开在线知识库”打开并复制分享链接。</p></section>}
    </div>
  </ModalSurface>
}
