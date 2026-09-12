import { useMemo, useState } from 'react'
import { ArrowRight, ClockCounterClockwise, CloudArrowDown, FolderOpen, FolderPlus, Trash, X } from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import { ProductIdentity } from '../components/ProductIdentity'
import { CreateKnowledgeBaseDialog } from '../components/home/CreateKnowledgeBaseDialog'
import { OpenOnlineWorkspaceDialog } from '../components/home/OpenOnlineWorkspaceDialog'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import { getHostAdapter } from '../host/runtime'
import { pickLocalWorkspace } from '../workspace/providers/LocalWorkspaceProvider'
import { createRemoteWorkspaceProvider } from '../workspace/providers/createRemoteWorkspaceProvider'
import { formatWorkspaceSource, isRemoteWorkspaceSource } from '../workspace/remote'
import type { RecentWorkspace, WorkspaceProvider } from '../workspace/types'

const packagedNativeProviderLoader = import.meta.env.VITE_TENSORNOTE_HOST === 'desktop'
  ? () => import('../workspace/providers/NativeLocalWorkspaceProvider')
  : undefined

export function HomePage() {
  const navigate = useNavigate()
  const host = getHostAdapter()
  const status = useWorkspaceStore((state) => state.status)
  const loadingMessage = useWorkspaceStore((state) => state.loadingMessage)
  const clearError = useWorkspaceStore((state) => state.clearError)
  const openProvider = useWorkspaceStore((state) => state.openProvider)
  const recentWorkspaces = useWorkspaceStore((state) => state.recentWorkspaces)
  const removeRecentWorkspace = useWorkspaceStore((state) => state.removeRecentWorkspace)
  const clearRecentWorkspaces = useWorkspaceStore((state) => state.clearRecentWorkspaces)
  const [message, setMessage] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [onlineOpen, setOnlineOpen] = useState(false)
  const webSupportsLocal = typeof window !== 'undefined' && 'showDirectoryPicker' in window
  const supportsLocal = host.id === 'desktop' || webSupportsLocal
  const busy = status === 'loading'
  const recents = useMemo(() => [...recentWorkspaces].sort((a, b) => b.openedAt - a.openedAt).slice(0, 8), [recentWorkspaces])

  const open = async (provider: WorkspaceProvider, loading = '正在打开知识库…') => {
    setMessage(null); clearError()
    try { await openProvider(provider, loading); navigate('/workspace') }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : '无法打开知识库') }
  }

  const openLocal = async () => {
    if (!supportsLocal) return
    try {
      if (host.id === 'desktop') {
        const selection = await host.selectWorkspaceDirectory?.()
        if (selection) {
          if (!packagedNativeProviderLoader) throw new Error('当前 Web 构建不包含桌面文件能力')
          const { NativeLocalWorkspaceProvider } = await packagedNativeProviderLoader()
          await open(new NativeLocalWorkspaceProvider(selection), '正在读取本地知识库…')
        }
      } else await open(await pickLocalWorkspace(), '正在读取本地知识库…')
    } catch (reason) {
      if (!(reason instanceof DOMException && reason.name === 'AbortError')) setMessage(reason instanceof Error ? reason.message : '无法打开本地知识库')
    }
  }

  const reopen = async (recent: RecentWorkspace) => {
    setMessage(null)
    if (isRemoteWorkspaceSource(recent.type) && recent.config?.project) {
      await open(createRemoteWorkspaceProvider({ provider: recent.type, project: recent.config.project, repositoryUrl: recent.config.repositoryUrl || '', ref: recent.config.ref }), `正在读取 ${formatWorkspaceSource(recent.type)} 知识库…`)
      return
    }
    if (recent.type === 'local' && recent.config?.provider === 'native-local' && recent.config.workspaceId) {
      try {
        const selection = await host.restoreWorkspaceDirectory?.(recent.config.workspaceId)
        if (!selection) throw new Error('这个知识库需要 TensorNote Desktop 打开')
        if (!packagedNativeProviderLoader) throw new Error('这个知识库需要 TensorNote Desktop 打开')
        const { NativeLocalWorkspaceProvider } = await packagedNativeProviderLoader()
        await open(new NativeLocalWorkspaceProvider(selection), '正在读取本地知识库…')
      } catch (reason) { setMessage(reason instanceof Error ? reason.message : '无法重新打开知识库') }
      return
    }
    await openLocal()
  }

  const localUnsupported = '当前浏览器不支持本地目录读写，请使用最新版 Chrome / Edge 或 TensorNote Desktop。'
  const actions = [
    { id: 'open-local', title: '打开本地知识库', description: supportsLocal ? '选择已有 Markdown 知识库' : localUnsupported, icon: FolderOpen, disabled: !supportsLocal, run: openLocal, primary: host.id === 'desktop' },
    { id: 'create-local', title: '新建本地知识库', description: supportsLocal ? '创建一个新的 TensorNote 知识库' : localUnsupported, icon: FolderPlus, disabled: !supportsLocal, run: () => setCreateOpen(true), primary: false },
    { id: 'open-online', title: '打开在线知识库', description: '从 GitHub、GitLab 或 Gitee 打开', icon: CloudArrowDown, disabled: false, run: () => setOnlineOpen(true), primary: host.id === 'web' },
  ]

  return <main className="workspace-home">
    <header className="landing-nav"><ProductIdentity /></header>
    <div className="workspace-home__content">
      <section className="workspace-hero"><h1>打开知识库，继续你的工作。</h1><p>Markdown 主体笔记，推导与实验按需展开。</p></section>
      {message && <div className="workspace-alert" role="alert"><span>{message}</span><button onClick={() => setMessage(null)}>关闭</button></div>}
      <div className="knowledge-entry-grid">
        <section className="recent-workspaces" aria-labelledby="recent-title">
          <div className="section-heading recent-heading"><span><ClockCounterClockwise size={17} /><h2 id="recent-title">最近打开</h2></span>{recents.length > 0 && <button type="button" onClick={clearRecentWorkspaces}><Trash size={14} />清空记录</button>}</div>
          {recents.length ? <div className="recent-list">{recents.map((recent) => <div className="recent-item" key={recent.id}>
            <button className="recent-open" onClick={() => void reopen(recent)} disabled={busy}><span className="recent-mark">{recent.name.slice(0, 1).toUpperCase()}</span><span><strong>{recent.name}</strong><small>{recent.detail || recent.config?.repositoryUrl || recent.sourceLabel}</small></span><span className={`recent-source recent-source--${recent.type}`}>{formatWorkspaceSource(recent.type)}</span></button>
            <button className="recent-remove" type="button" onClick={() => removeRecentWorkspace(recent.id)} aria-label={`从最近打开中移除 ${recent.name}`}><X size={15} /></button>
          </div>)}</div> : <div className="recent-empty"><ClockCounterClockwise size={23} /><strong>还没有最近打开的知识库</strong><p>从右侧打开或创建一个知识库开始。</p></div>}
        </section>
        <section className="knowledge-actions" aria-labelledby="start-title"><div className="section-heading"><h2 id="start-title">开始</h2></div><div>{actions.map(({ id, title, description, icon: Icon, disabled, run, primary }) => <button key={id} className={`knowledge-action${primary ? ' knowledge-action--primary' : ''}`} onClick={() => void run()} disabled={busy || disabled} title={disabled ? localUnsupported : undefined}><span><Icon size={21} weight="duotone" /></span><span><strong>{title}</strong><small>{description}</small></span><ArrowRight size={16} /></button>)}</div></section>
      </div>
      {busy && <div className="workspace-loading" role="status"><span />{loadingMessage || '正在打开知识库…'}</div>}
    </div>
    <CreateKnowledgeBaseDialog open={createOpen} onOpenChange={setCreateOpen} onCreate={(provider) => open(provider, '正在创建知识库…')} busy={busy} />
    <OpenOnlineWorkspaceDialog open={onlineOpen} onOpenChange={setOnlineOpen} onOpen={open} busy={busy} />
  </main>
}
