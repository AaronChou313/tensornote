import { useMemo, useState } from 'react'
import { FolderPlus, X } from '@phosphor-icons/react'
import { Button } from '../ui/Button'
import { ModalSurface } from '../ui/ModalSurface'
import { getHostAdapter } from '../../host/runtime'
import type { HostParentDirectorySelection } from '../../host/types'
import { createWorkspaceManifest, validateKnowledgeBaseName } from '../../workspace/createWorkspace'
import { createLocalWorkspaceInParent, pickLocalWorkspaceParent, type DirectoryHandleLike } from '../../workspace/providers/LocalWorkspaceProvider'
import type { WorkspaceProvider } from '../../workspace/types'

const packagedNativeProviderLoader = import.meta.env.VITE_TENSORNOTE_HOST === 'desktop'
  ? () => import('../../workspace/providers/NativeLocalWorkspaceProvider')
  : undefined

export function CreateKnowledgeBaseDialog({ open, onOpenChange, onCreate, busy }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (provider: WorkspaceProvider) => Promise<void>
  busy: boolean
}) {
  const host = getHostAdapter()
  const [name, setName] = useState('')
  const [nativeParent, setNativeParent] = useState<HostParentDirectorySelection | null>(null)
  const [webParent, setWebParent] = useState<DirectoryHandleLike | null>(null)
  const [error, setError] = useState<string | null>(null)
  const parentLabel = nativeParent?.displayPath || webParent?.name || ''
  const nameError = name ? validateKnowledgeBaseName(name) : null
  const preview = useMemo(() => parentLabel && name ? `${parentLabel} / ${name}` : '选择存放位置后显示', [name, parentLabel])
  const close = () => { setError(null); setName(''); setNativeParent(null); setWebParent(null); onOpenChange(false) }

  const chooseParent = async () => {
    setError(null)
    try {
      if (host.id === 'desktop') setNativeParent(await host.selectWorkspaceParentDirectory?.() ?? null)
      else setWebParent(await pickLocalWorkspaceParent())
    } catch (reason) { if (!(reason instanceof DOMException && reason.name === 'AbortError')) setError(reason instanceof Error ? reason.message : '无法选择存放位置') }
  }
  const create = async () => {
    const validation = validateKnowledgeBaseName(name)
    if (validation) { setError(validation); return }
    if (!nativeParent && !webParent) { setError('请先选择存放位置'); return }
    setError(null)
    try {
      let provider: WorkspaceProvider
      if (nativeParent) {
        if (!packagedNativeProviderLoader) throw new Error('当前 Web 构建不包含桌面文件能力')
        const { NativeLocalWorkspaceProvider } = await packagedNativeProviderLoader()
        provider = new NativeLocalWorkspaceProvider(await host.createWorkspaceDirectory!(nativeParent.parentId, name, createWorkspaceManifest(name)))
      } else {
        provider = await createLocalWorkspaceInParent(webParent!, name, createWorkspaceManifest(name))
      }
      await onCreate(provider)
      close()
    } catch (reason) { setError(reason instanceof Error ? reason.message : '无法创建知识库') }
  }

  return <ModalSurface open={open} onOpenChange={(next) => { if (!busy) { if (next) onOpenChange(true); else close() } }} title="新建本地知识库" layerClassName="knowledge-dialog-layer" className="knowledge-dialog">
    <header><span><FolderPlus size={19} />新建本地知识库</span><button className="icon-button" onClick={close} disabled={busy} aria-label="关闭"><X size={17} /></button></header>
    <form onSubmit={(event) => { event.preventDefault(); void create() }}>
      <label><span>知识库名称</span><input autoFocus value={name} onChange={(event) => { setName(event.target.value); setError(null) }} placeholder="Transformer Notes" disabled={busy} />{nameError && <small className="is-error">{nameError}</small>}</label>
      <label><span>存放位置</span><div className="directory-picker-row"><output title={parentLabel}>{parentLabel || '尚未选择父目录'}</output><Button onClick={() => void chooseParent()} disabled={busy}>选择…</Button></div></label>
      <div className="workspace-path-preview"><small>知识库将被创建为</small><strong title={preview}>{preview}</strong></div>
      {error && <p className="knowledge-dialog__error" role="alert">{error}</p>}
      <footer><Button variant="ghost" onClick={close} disabled={busy}>取消</Button><Button type="submit" variant="primary" disabled={busy || Boolean(nameError) || !name || (!nativeParent && !webParent)}>{busy ? '正在创建…' : '创建知识库'}</Button></footer>
    </form>
  </ModalSurface>
}
