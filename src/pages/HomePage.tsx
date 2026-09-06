import { GettingStarted } from '../components/GettingStarted'
import { useState } from 'react'
import {
  ArrowRight,
  BookOpenText,
  ClockCounterClockwise,
  FolderOpen,
  GithubLogo,
  Plus,
} from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import logoSquare from '../../assets/images/TensorNote_logo.png'
import { Button } from '../components/ui/Button'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import { GitHubWorkspaceProvider } from '../workspace/providers/GitHubWorkspaceProvider'
import { pickLocalWorkspace } from '../workspace/providers/LocalWorkspaceProvider'
import type { RecentWorkspace, WorkspaceProvider } from '../workspace/types'
import { deploymentAdapter } from '../deployment/config'
import { getHostAdapter } from '../host/runtime'

const loadNativeWorkspaceProvider = import.meta.env.VITE_TENSORNOTE_HOST === 'desktop'
  ? () => import('../workspace/providers/NativeLocalWorkspaceProvider')
  : undefined

function parseGitHubRepository(value: string) {
  const normalized = value.trim().replace(/\.git$/, '').replace(/\/$/, '')
  const urlMatch = normalized.match(/github\.com[/:]([^/]+)\/([^/]+)$/i)
  const shortMatch = normalized.match(/^([^/\s]+)\/([^/\s]+)$/)
  const match = urlMatch ?? shortMatch
  return match ? { owner: match[1], repo: match[2] } : null
}

export function HomePage() {
  const navigate = useNavigate()
  const status = useWorkspaceStore((state) => state.status)
  const loadingMessage = useWorkspaceStore((state) => state.loadingMessage)
  const error = useWorkspaceStore((state) => state.error)
  const clearError = useWorkspaceStore((state) => state.clearError)
  const openProvider = useWorkspaceStore((state) => state.openProvider)
  const recentWorkspaces = useWorkspaceStore((state) => state.recentWorkspaces)
  const [repository, setRepository] = useState('')
  const [ref, setRef] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)

  const open = async (provider: WorkspaceProvider) => {
    setInputError(null)
    clearError()
    try {
      await openProvider(provider)
      navigate('/workspace')
    } catch {
      // Store exposes the user-facing error state.
    }
  }

  const openLocal = async () => {
    try {
      const host = getHostAdapter()
      if (host.capabilities.nativeFilesystem) {
        if (!loadNativeWorkspaceProvider) throw new Error('当前构建不包含桌面文件系统能力')
        const selection = await host.selectWorkspaceDirectory?.()
        if (!selection) return
        const { NativeLocalWorkspaceProvider } = await loadNativeWorkspaceProvider()
        await open(new NativeLocalWorkspaceProvider(selection))
        return
      }
      await open(await pickLocalWorkspace())
    } catch (reason) {
      if (!(reason instanceof DOMException && reason.name === 'AbortError')) setInputError(reason instanceof Error ? reason.message : '无法打开本地目录')
    }
  }

  const openBundled = async () => {
    const { BundledWorkspaceProvider } = await import('../workspace/providers/BundledWorkspaceProvider')
    await open(new BundledWorkspaceProvider())
  }

  const openGitHub = async () => {
    const parsed = parseGitHubRepository(repository)
    if (!parsed) {
      setInputError('请输入 owner/repository 或完整 GitHub Repository URL')
      return
    }
    await open(new GitHubWorkspaceProvider(parsed.owner, parsed.repo, ref.trim() || undefined))
  }

  const reopen = async (recent: RecentWorkspace) => {
    if (recent.type === 'bundled') return openBundled()
    if (recent.type === 'github' && recent.config?.owner && recent.config.repo) {
      return open(new GitHubWorkspaceProvider(recent.config.owner, recent.config.repo, recent.config.ref))
    }
    if (recent.type === 'local' && recent.config?.provider === 'native-local' && recent.config.workspaceId) {
      const host = getHostAdapter()
      if (!host.capabilities.nativeFilesystem || !host.restoreWorkspaceDirectory) {
        setInputError('这个 Workspace 需要 TensorNote Desktop 打开')
        return
      }
      try {
        if (!loadNativeWorkspaceProvider) throw new Error('当前构建不包含桌面文件系统能力')
        const selection = await host.restoreWorkspaceDirectory(recent.config.workspaceId)
        const { NativeLocalWorkspaceProvider } = await loadNativeWorkspaceProvider()
        return open(new NativeLocalWorkspaceProvider(selection))
      } catch (reason) {
        setInputError(reason instanceof Error ? reason.message : String(reason))
        return
      }
    }
    await openLocal()
  }

  const busy = status === 'loading'
  const hostAdapter = getHostAdapter()
  const supportsLocalWorkspace = deploymentAdapter.capabilities.localDirectory || hostAdapter.capabilities.nativeFilesystem
  const visibleRecentWorkspaces = supportsLocalWorkspace
    ? recentWorkspaces
    : recentWorkspaces.filter((recent) => recent.type !== 'local')

  return (
    <main className="workspace-home">
      <header className="landing-nav">
        <div className="brand-compact">
          <span className="brand-compact__logo"><img src={logoSquare} alt="" aria-hidden="true" /></span>
          <strong>TensorNote</strong>
        </div>
        <div className="landing-nav__runtime"><span>{hostAdapter.label}</span></div>
      </header>

      <div className="workspace-home__content">
        <section className="workspace-hero">
          <h1>打开知识，继续探索。</h1>
          <p>用 Markdown 记录想法，在同一个工作台中阅读、写作与运行实验。</p>
        </section>

        {(error || inputError) && (
          <div className="workspace-alert" role="alert">
            <span>{inputError || error}</span>
            <button onClick={() => { setInputError(null); clearError() }}>关闭</button>
          </div>
        )}

        <section className="workspace-actions" aria-label="打开 Workspace">
          {supportsLocalWorkspace && <button className="workspace-action workspace-action--primary" onClick={() => void openLocal()} disabled={busy}>
            <span className="workspace-action__icon"><FolderOpen size={23} weight="duotone" /></span>
            <span><strong>打开本地 Workspace</strong><small>选择电脑上的 Markdown 文件夹</small></span>
            <ArrowRight size={17} />
          </button>}

          <button className={`workspace-action${supportsLocalWorkspace ? '' : ' workspace-action--primary'}`} onClick={() => void openBundled()} disabled={busy}>
            <span className="workspace-action__icon"><BookOpenText size={23} weight="duotone" /></span>
            <span><strong>AI Learning Notes</strong><small>打开随 TensorNote 提供的示例 Workspace</small></span>
            <ArrowRight size={17} />
          </button>

          {supportsLocalWorkspace && <button className="workspace-action" onClick={() => void openLocal()} disabled={busy}>
            <span className="workspace-action__icon"><Plus size={22} /></span>
            <span><strong>新建 Workspace</strong><small>选择一个新建或空文件夹，从第一篇笔记开始</small></span>
            <ArrowRight size={17} />
          </button>}
        </section>

        <GettingStarted />

        {visibleRecentWorkspaces.length > 0 && (
          <section className="recent-workspaces">
            <div className="section-heading"><ClockCounterClockwise size={17} /><h2>最近打开</h2></div>
            <div className="recent-list">
              {visibleRecentWorkspaces.map((recent) => (
                <button key={recent.id} onClick={() => void reopen(recent)} disabled={busy}>
                  <span className="recent-mark">{recent.name.slice(0, 1).toUpperCase()}</span>
                  <span><strong>{recent.name}</strong><small>{recent.detail || recent.sourceLabel}</small></span>
                  <span className="recent-source">{recent.sourceLabel}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="github-open">
          <div>
            <span className="workspace-section-icon"><GithubLogo size={18} weight="fill" /></span>
            <div><h2>从 GitHub 打开</h2><p>读取公开 Repository；默认禁用远程可执行代码。</p></div>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); void openGitHub() }}>
            <input value={repository} onChange={(event) => setRepository(event.target.value)} placeholder="owner/repository 或 GitHub URL" aria-label="GitHub Repository" />
            <input value={ref} onChange={(event) => setRef(event.target.value)} placeholder="分支 / Ref（可选）" aria-label="GitHub Branch 或 Ref" />
            <Button type="submit" variant="primary" disabled={busy || !repository.trim()}>打开</Button>
          </form>
        </section>

        {busy && <div className="workspace-loading" role="status"><span />{loadingMessage || '正在打开 Workspace…'}</div>}
      </div>
    </main>
  )
}
