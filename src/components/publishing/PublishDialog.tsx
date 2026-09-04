import { useEffect, useMemo, useState } from 'react'
import { ArrowSquareOut, Check, Copy, DownloadSimple, GithubLogo, Laptop, ShareNetwork, ShieldCheck, ShieldWarning, X } from '@phosphor-icons/react'
import { useLocation } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { useWorkspaceStore } from '../../store/useWorkspaceStore'
import { useWorkbenchStore } from '../../workbench/useWorkbenchStore'
import { createGitHubPublicationTargets, isPinnedGitHubRevision } from '../../publishing/links'
import { Button } from '../ui/Button'
import { deploymentAdapter } from '../../deployment/config'

type CopyTarget = 'link' | 'badge' | null
type CopyFeedback = { target: Exclude<CopyTarget, null>; status: 'copied' | 'error' } | null

function copyWithSelection(value: string) {
  const field = document.createElement('textarea')
  field.value = value
  field.setAttribute('readonly', '')
  field.style.position = 'fixed'
  field.style.opacity = '0'
  document.body.append(field)
  field.select()
  const copied = document.execCommand('copy')
  field.remove()
  return copied
}

async function writeClipboard(value: string) {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable')
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return copyWithSelection(value)
  }
}

export function PublishDialog() {
  const open = useAppStore((state) => state.publishOpen)
  const setOpen = useAppStore((state) => state.setPublishOpen)
  const session = useWorkspaceStore((state) => state.session)
  const paneNote = useWorkbenchStore((state) => state.panes[state.activePane])
  const location = useLocation()
  const [copyFeedback, setCopyFeedback] = useState<CopyFeedback>(null)
  const activeNote = location.pathname.startsWith('/notes/') ? paneNote ?? undefined : undefined
  const owner = session?.descriptor.config?.owner
  const repo = session?.descriptor.config?.repo
  const revision = session?.descriptor.revision
  const targets = useMemo(() => {
    if (!owner || !repo || !isPinnedGitHubRevision(revision)) return null
    return createGitHubPublicationTargets(deploymentAdapter.publicReaderUrl, { owner, repo, revision, ...(activeNote ? { noteId: activeNote } : {}) })
  }, [activeNote, owner, repo, revision])

  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open, setOpen])

  if (!open || !session) return null

  const copy = async (value: string, target: Exclude<CopyTarget, null>) => {
    const copied = await writeClipboard(value)
    setCopyFeedback({ target, status: copied ? 'copied' : 'error' })
    window.setTimeout(() => setCopyFeedback(null), 1800)
  }
  const environment = session.environmentFiles.filter((file) => file.exists)

  return <div className="publish-dialog-layer" role="presentation" onMouseDown={() => setOpen(false)}>
    <section className="publish-dialog" role="dialog" aria-modal="true" aria-label="分享与发布 Workspace" onMouseDown={(event) => event.stopPropagation()}>
      <header>
        <span><ShareNetwork size={18} />分享与发布</span>
        <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="关闭分享窗口"><X size={18} /></Button>
      </header>
      <div className="publish-dialog__body">
        <div className="publish-source-card">
          <div className="publish-source-card__mark"><GithubLogo size={22} weight="duotone" /></div>
          <div><small>Current workspace</small><strong>{session.manifest.publishing.title || session.manifest.workspace.name}</strong><span>{session.descriptor.detail || session.descriptor.sourceLabel}</span></div>
          <div className="publish-badges"><em>{session.capabilities.write ? 'Editable' : 'Read only'}</em>{revision && <em>{revision.slice(0, 8)}</em>}</div>
        </div>

        {targets ? <>
          <section className="publish-section">
            <div><strong>可复现阅读链接</strong><p>固定到当前 commit{activeNote ? ' 和当前笔记' : ''}；仓库后续更新不会改变这次分享的内容。</p></div>
            <div className="publish-copy-row"><code>{targets.webUrl}</code><button onClick={() => void copy(targets.webUrl, 'link')} aria-label={copyFeedback?.target === 'link' && copyFeedback.status === 'copied' ? '固定链接已复制' : '复制固定链接'}>{copyFeedback?.target === 'link' && copyFeedback.status === 'copied' ? <Check size={16} /> : <Copy size={16} />}</button></div>
            {copyFeedback?.target === 'link' && <small className={`publish-copy-status${copyFeedback.status === 'error' ? ' is-error' : ''}`} role="status">{copyFeedback.status === 'copied' ? '固定链接已复制' : '无法访问剪贴板，请手动选择复制'}</small>}
          </section>
          <section className="publish-actions-grid">
            <a href={targets.repositoryUrl} target="_blank" rel="noreferrer"><GithubLogo size={18} /><span><strong>Repository</strong><small>查看来源与 License</small></span><ArrowSquareOut size={14} /></a>
            <a href={targets.forkUrl} target="_blank" rel="noreferrer"><ShareNetwork size={18} /><span><strong>Fork</strong><small>创建自己的副本</small></span><ArrowSquareOut size={14} /></a>
            <a href={targets.downloadUrl}><DownloadSimple size={18} /><span><strong>Download</strong><small>下载当前 revision</small></span><ArrowSquareOut size={14} /></a>
            <a href={targets.desktopUrl}><Laptop size={18} /><span><strong>Open in Desktop</strong><small>需要已安装 TensorNote</small></span><ArrowSquareOut size={14} /></a>
          </section>
          <section className="publish-section">
            <div><strong>Open in TensorNote Badge</strong><p>复制到知识库 README，让读者一键打开这个固定版本。</p></div>
            <div className="publish-copy-row"><code>{targets.badgeMarkdown}</code><button onClick={() => void copy(targets.badgeMarkdown, 'badge')} aria-label={copyFeedback?.target === 'badge' && copyFeedback.status === 'copied' ? 'Badge Markdown 已复制' : '复制 Badge Markdown'}>{copyFeedback?.target === 'badge' && copyFeedback.status === 'copied' ? <Check size={16} /> : <Copy size={16} />}</button></div>
            {copyFeedback?.target === 'badge' && <small className={`publish-copy-status${copyFeedback.status === 'error' ? ' is-error' : ''}`} role="status">{copyFeedback.status === 'copied' ? 'Badge Markdown 已复制' : '无法访问剪贴板，请手动选择复制'}</small>}
          </section>
        </> : <section className="publish-guidance">
          <GithubLogo size={24} />
          <div><strong>先发布到公开 GitHub Repository</strong><p>固定 revision 分享、Fork、下载和 Desktop 深链只对 GitHub Workspace 开放。本地内容不会被 TensorNote 自动上传。</p></div>
        </section>}

        <section className="publish-readiness">
          <div><span>{session.descriptor.type === 'github' ? <ShieldCheck size={17} /> : <ShieldWarning size={17} />}</span><strong>来源与权限</strong><small>{session.descriptor.sourceLabel} · {session.capabilities.write ? '可编辑' : '只读'}</small></div>
          <div><span>{session.manifest.features.executable ? <Check size={17} /> : <ShieldWarning size={17} />}</span><strong>实验能力</strong><small>{session.manifest.features.executable ? 'Workspace 已声明可执行' : '默认仅阅读代码'}</small></div>
          <div><span>{environment.length ? <Check size={17} /> : <ShieldWarning size={17} />}</span><strong>环境说明</strong><small>{environment.length ? environment.map((file) => file.path).join(', ') : '没有可用的依赖声明'}</small></div>
          {session.descriptor.type === 'github' && <div><span>{session.trusted ? <ShieldCheck size={17} /> : <ShieldWarning size={17} />}</span><strong>执行信任</strong><small>{session.trusted ? '当前 revision 已由本机信任' : '阅读安全；运行前仍需信任当前 revision'}</small></div>}
        </section>
        {!targets && <p className="publish-footer-note">Repository-owned Pages 的复制式 Workflow 和发布前检查见项目分发文档。</p>}
      </div>
    </section>
  </div>
}
