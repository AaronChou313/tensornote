import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ArrowsClockwise,
  Check,
  CheckCircle,
  ClockCounterClockwise,
  Code,
  File,
  GitBranch,
  GitCommit,
  LinkBreak,
  Minus,
  Plus,
  TerminalWindow,
  WarningCircle,
} from '@phosphor-icons/react'
import { useAppStore } from '../store/useAppStore'
import { useGitStore } from '../store/useGitStore'
import { deploymentAdapter } from '../deployment/config'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import type { GitChange, GitChangeKind } from '../git/types'

const kindLabels: Record<GitChangeKind, string> = {
  modified: 'Modified',
  added: 'Added',
  deleted: 'Deleted',
  renamed: 'Renamed',
  copied: 'Copied',
  untracked: 'Untracked',
  conflicted: 'Conflict',
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)
}

function ChangeRow({ change, staged, selected, busy, onSelect, onStage }: {
  change: GitChange
  staged: boolean
  selected: boolean
  busy: boolean
  onSelect: () => void
  onStage: () => void
}) {
  return <div className={`git-change-row ${selected ? 'is-selected' : ''}`}>
    <button className="git-change-row__main" onClick={onSelect} aria-label={`查看 ${staged ? '已暂存' : '工作区'}差异：${change.path}`}>
      <span className={`git-change-kind git-change-kind--${change.kind}`}>{change.kind === 'deleted' ? <Minus size={12} /> : change.kind === 'added' || change.kind === 'untracked' ? <Plus size={12} /> : <File size={12} />}</span>
      <span><strong>{change.path.split('/').pop()}</strong><small>{change.originalPath ? `${change.originalPath} → ${change.path}` : change.path.includes('/') ? change.path.slice(0, change.path.lastIndexOf('/')) : 'Workspace root'}</small></span>
      <i>{kindLabels[change.kind]}</i>
    </button>
    <button className="git-stage-action" onClick={onStage} disabled={busy} aria-label={`${staged ? '取消暂存' : '暂存'} ${change.path}`} title={staged ? 'Unstage' : 'Stage'}>{staged ? <Minus size={14} /> : <Plus size={14} />}</button>
  </div>
}

function DiffView({ patch }: { patch: string }) {
  const lines = useMemo(() => patch.split('\n'), [patch])
  const visible = lines.slice(0, 2000)
  if (!patch) return <div className="git-diff-empty"><Code size={18} /><strong>No textual diff</strong><p>二进制文件、空文件或未跟踪文件在暂存前可能没有可显示的补丁。</p></div>
  return <div className="git-diff-code" role="region" aria-label="Git diff">
    {visible.map((line, index) => {
      const tone = line.startsWith('+++') || line.startsWith('---') ? 'meta' : line.startsWith('+') ? 'add' : line.startsWith('-') ? 'delete' : line.startsWith('@@') ? 'hunk' : line.startsWith('diff ') || line.startsWith('index ') ? 'meta' : 'context'
      return <div key={`${index}:${line}`} className={`git-diff-line git-diff-line--${tone}`}><span>{index + 1}</span><code>{line || ' '}</code></div>
    })}
    {lines.length > visible.length && <p className="git-diff-truncated">为保持界面流畅，仅显示前 2,000 行。</p>}
  </div>
}

function SetupState({ bridgeDraft, busy, error, onDraft, onConnect }: {
  bridgeDraft: string
  busy: boolean
  error: string | null
  onDraft: (value: string) => void
  onConnect: () => void
}) {
  return <section className="git-setup-state">
    <div className="git-setup-state__icon"><TerminalWindow size={23} /></div>
    <div className="git-setup-state__copy">
      <span>Optional local companion</span>
      <h2>Connect the Git Bridge</h2>
      <p>浏览器不能直接执行系统 Git。请在第三个终端把 Bridge 固定到当前 Local Workspace 的仓库根目录。</p>
      <code>pnpm git:bridge -- --workspace /absolute/path/to/workspace</code>
    </div>
    <div className="git-connect-form">
      <label><span>Bridge URL</span><input value={bridgeDraft} onChange={(event) => onDraft(event.target.value)} placeholder="http://127.0.0.1:4318" /></label>
      <button onClick={onConnect} disabled={busy}>{busy ? 'Connecting…' : 'Connect'}</button>
    </div>
    {error && <div className="git-inline-error" role="alert"><WarningCircle size={16} /><span><strong>Connection unavailable</strong>{error}</span></div>}
    <p className="git-security-note">Bridge 只监听本机、只允许配置的 TensorNote Origin，并且不暴露 Push、Pull、凭据或任意 Shell 命令。</p>
  </section>
}

export function GitWorkspacePage() {
  const session = useWorkspaceStore((state) => state.session)
  const provider = useWorkspaceStore((state) => state.provider)
  const editorDirtyPaths = useAppStore((state) => state.editorDirtyPaths)
  const bridgeUrl = useGitStore((state) => state.bridgeUrl)
  const connection = useGitStore((state) => state.connection)
  const busy = useGitStore((state) => state.busy)
  const error = useGitStore((state) => state.error)
  const notice = useGitStore((state) => state.notice)
  const health = useGitStore((state) => state.health)
  const status = useGitStore((state) => state.status)
  const history = useGitStore((state) => state.history)
  const diff = useGitStore((state) => state.diff)
  const setBridgeUrl = useGitStore((state) => state.setBridgeUrl)
  const connect = useGitStore((state) => state.connect)
  const refresh = useGitStore((state) => state.refresh)
  const selectDiff = useGitStore((state) => state.selectDiff)
  const stage = useGitStore((state) => state.stage)
  const commit = useGitStore((state) => state.commit)
  const [bridgeDraft, setBridgeDraft] = useState(bridgeUrl)
  const [commitMessage, setCommitMessage] = useState('')
  const autoConnectKey = useRef('')

  const workspaceName = provider?.descriptor.detail || provider?.descriptor.name || ''
  const supported = Boolean(deploymentAdapter.capabilities.gitBridge && session?.capabilities.git && session.descriptor.type === 'local')
  useEffect(() => {
    if (!supported || !workspaceName || autoConnectKey.current === `${workspaceName}:${bridgeUrl}`) return
    autoConnectKey.current = `${workspaceName}:${bridgeUrl}`
    void connect(workspaceName).catch(() => undefined)
  }, [bridgeUrl, connect, supported, workspaceName])

  if (!session) return null
  const stagedChanges = status?.changes.filter((change) => change.staged) ?? []
  const workingChanges = status?.changes.filter((change) => change.unstaged) ?? []
  const unsavedCount = Object.keys(editorDirtyPaths).length
  const submitConnect = () => {
    const normalized = bridgeDraft.trim().replace(/\/$/, '')
    setBridgeUrl(normalized)
    autoConnectKey.current = `${workspaceName}:${normalized}`
    void useGitStore.getState().connect(workspaceName).catch(() => undefined)
  }
  const submitCommit = (event: FormEvent) => {
    event.preventDefault()
    if (!commitMessage.trim()) return
    void commit(commitMessage).then(() => setCommitMessage('')).catch(() => undefined)
  }

  return <main className="git-page">
    <div className="git-page__inner">
      <header className="git-page__header">
        <div><span className="workspace-kicker">Local-first versioning</span><h1>Git & Sync</h1><p>查看改动、理解差异并创建本地提交。Workspace 文件仍是唯一数据源，同步始终可选。</p></div>
        {status && <div className="git-branch-badge"><GitBranch size={15} /><span><strong>{status.branch || 'No branch'}</strong><small>{status.detached ? 'Detached HEAD' : status.upstream || 'Local branch'}</small></span></div>}
      </header>

      {!supported ? <section className="git-unavailable-state"><LinkBreak size={21} /><strong>Local Git is not available in this runtime.</strong><p>{deploymentAdapter.capabilities.gitBridge ? '请先把 Workspace 作为本地目录打开。Bundled 与 GitHub 阅读来源保持只读，也不会连接本地仓库。' : `${deploymentAdapter.label} 不连接 localhost Git Bridge；请使用 Local Web Runtime 完成本地 Git 操作。`}</p></section>
        : connection !== 'ready' || !status || !health ? <SetupState bridgeDraft={bridgeDraft} busy={busy} error={error} onDraft={setBridgeDraft} onConnect={submitConnect} />
          : <>
            <section className="git-repository-bar" aria-label="Repository summary">
              <div><CheckCircle size={16} /><span><strong>{health.workspaceName}</strong><small>{health.repositoryRoot}</small></span></div>
              <div className="git-repository-stats">
                <span><strong>{stagedChanges.length}</strong> staged</span>
                <span><strong>{workingChanges.length}</strong> working</span>
                {status.ahead > 0 && <span><ArrowUp size={12} />{status.ahead}</span>}
                {status.behind > 0 && <span><ArrowDown size={12} />{status.behind}</span>}
              </div>
              <button onClick={() => void refresh().catch(() => undefined)} disabled={busy} aria-label="刷新 Git 状态"><ArrowsClockwise className={busy ? 'is-spinning' : ''} size={15} />Refresh</button>
            </section>

            {unsavedCount > 0 && <div className="git-unsaved-warning"><WarningCircle size={16} /><span><strong>{unsavedCount} unsaved editor {unsavedCount === 1 ? 'draft' : 'drafts'}</strong>保存笔记后，改动才会出现在 Git 中。</span></div>}
            {error && <div className="git-inline-error" role="alert"><WarningCircle size={16} /><span><strong>Git action failed</strong>{error}</span></div>}
            {notice && <div className="git-inline-notice" role="status"><Check size={15} />{notice}</div>}

            <div className="git-workbench">
              <section className="git-changes-panel" aria-label="Git changes">
                <div className="git-panel-heading"><div><span>Changes</span><strong>{status.changes.length}</strong></div><small>{status.clean ? 'Working tree clean' : 'Select a file to inspect'}</small></div>
                {status.clean ? <div className="git-clean-state"><CheckCircle size={22} /><strong>Everything is committed</strong><p>当前工作树没有已暂存或未暂存的改动。</p></div> : <>
                  <div className="git-change-group"><h2>Staged <span>{stagedChanges.length}</span></h2>{stagedChanges.length === 0 ? <p>Stage a change before committing.</p> : stagedChanges.map((change) => <ChangeRow key={`staged:${change.path}`} change={change} staged selected={diff?.path === change.path && diff.staged} busy={busy} onSelect={() => void selectDiff(change.path, true).catch(() => undefined)} onStage={() => void stage(change.path, false).catch(() => undefined)} />)}</div>
                  <div className="git-change-group"><h2>Working tree <span>{workingChanges.length}</span></h2>{workingChanges.length === 0 ? <p>No unstaged changes.</p> : workingChanges.map((change) => <ChangeRow key={`working:${change.path}`} change={change} staged={false} selected={diff?.path === change.path && !diff.staged} busy={busy} onSelect={() => void selectDiff(change.path, false).catch(() => undefined)} onStage={() => void stage(change.path, true).catch(() => undefined)} />)}</div>
                </>}
                <form className="git-commit-form" onSubmit={submitCommit}>
                  <label htmlFor="git-commit-message">Commit staged changes</label>
                  <div><input id="git-commit-message" value={commitMessage} onChange={(event) => setCommitMessage(event.target.value)} maxLength={200} placeholder="Describe this change" /><button disabled={busy || stagedChanges.length === 0 || !commitMessage.trim()}><GitCommit size={15} />Commit</button></div>
                  <small>{stagedChanges.length === 0 ? 'Nothing staged yet.' : `${stagedChanges.length} ${stagedChanges.length === 1 ? 'file' : 'files'} will be committed locally.`}</small>
                </form>
              </section>

              <section className="git-diff-panel" aria-label="Selected difference">
                <header><div><Code size={15} /><span><strong>{diff?.path || 'Select a changed file'}</strong><small>{diff ? `${diff.staged ? 'Staged' : 'Working tree'} diff` : 'Patch preview'}</small></span></div>{diff && <i>{diff.staged ? 'INDEX' : 'WORKTREE'}</i>}</header>
                {diff ? <DiffView patch={diff.patch} /> : <div className="git-diff-empty"><Code size={18} /><strong>No file selected</strong><p>从左侧选择一个改动以查看补丁。</p></div>}
              </section>
            </div>

            <section className="git-history" aria-label="Commit history">
              <header><div><ClockCounterClockwise size={17} /><span><strong>History</strong><small>Latest {history.length} local commits</small></span></div><span>{status.head.slice(0, 7)}</span></header>
              <ol>{history.map((entry) => <li key={entry.hash}><span className="git-history__rail"><i /></span><div><strong>{entry.subject}</strong><small>{entry.author} · {formatDate(entry.authoredAt)}</small></div><code>{entry.shortHash}</code></li>)}</ol>
              {history.length === 0 && <p className="git-history__empty">This repository does not have any commits yet.</p>}
            </section>
          </>}
    </div>
  </main>
}
