import { useState } from 'react'
import { CloudArrowDown, X } from '@phosphor-icons/react'
import { Button } from '../ui/Button'
import { ModalSurface } from '../ui/ModalSurface'
import { detectRemoteProvider, parseRemoteRepositoryUrl, REMOTE_PROVIDER_LABELS, type RemoteProviderKind } from '../../workspace/remote'
import { createRemoteWorkspaceProvider } from '../../workspace/providers/createRemoteWorkspaceProvider'
import type { WorkspaceProvider } from '../../workspace/types'

export function OpenOnlineWorkspaceDialog({ open, onOpenChange, onOpen, busy }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpen: (provider: WorkspaceProvider, message: string) => Promise<void>
  busy: boolean
}) {
  const [provider, setProvider] = useState<RemoteProviderKind>('github')
  const [repositoryUrl, setRepositoryUrl] = useState('')
  const [ref, setRef] = useState('')
  const [error, setError] = useState<string | null>(null)
  const close = () => { setError(null); onOpenChange(false) }

  const submit = async () => {
    setError(null)
    try {
      const location = { ...parseRemoteRepositoryUrl(repositoryUrl, provider), ...(ref.trim() ? { ref: ref.trim() } : {}) }
      await onOpen(createRemoteWorkspaceProvider(location), `正在读取 ${REMOTE_PROVIDER_LABELS[location.provider]} 知识库…`)
      close()
    } catch (reason) { setError(reason instanceof Error ? reason.message : '无法打开在线知识库') }
  }

  const changeUrl = (value: string) => {
    setRepositoryUrl(value)
    const detected = detectRemoteProvider(value)
    if (detected) setProvider(detected)
    setError(null)
  }

  return <ModalSurface open={open} onOpenChange={(next) => { if (!busy) { if (next) onOpenChange(true); else close() } }} title="打开在线知识库" layerClassName="knowledge-dialog-layer" className="knowledge-dialog">
    <header><span><CloudArrowDown size={19} />打开在线知识库</span><button className="icon-button" onClick={close} disabled={busy} aria-label="关闭"><X size={17} /></button></header>
    <form onSubmit={(event) => { event.preventDefault(); void submit() }}>
      <fieldset disabled={busy}>
        <legend>来源</legend>
        <div className="provider-switch" role="radiogroup">{(['github', 'gitlab', 'gitee'] as const).map((item) => <button key={item} type="button" role="radio" aria-checked={provider === item} className={provider === item ? 'is-active' : ''} onClick={() => { setProvider(item); setError(null) }}>{REMOTE_PROVIDER_LABELS[item]}</button>)}</div>
      </fieldset>
      <label><span>仓库 URL</span><input autoFocus value={repositoryUrl} onChange={(event) => changeUrl(event.target.value)} placeholder={`https://${provider}.com/...`} disabled={busy} /></label>
      <label><span>分支 / Ref（可选）</span><input value={ref} onChange={(event) => setRef(event.target.value)} placeholder="留空时使用默认分支" disabled={busy} /><small>当前仅支持公开仓库，无需登录或 Token。</small></label>
      {error && <p className="knowledge-dialog__error" role="alert">{error}</p>}
      <footer><Button variant="ghost" onClick={close} disabled={busy}>取消</Button><Button type="submit" variant="primary" disabled={busy || !repositoryUrl.trim()}>{busy ? '正在读取…' : '打开'}</Button></footer>
    </form>
  </ModalSurface>
}
