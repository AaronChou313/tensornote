import { useEffect, useRef } from 'react'
import { GithubLogo } from '@phosphor-icons/react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import { GitHubWorkspaceProvider } from '../workspace/providers/GitHubWorkspaceProvider'

export function GitHubOpenPage() {
  const { owner, repo } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const attempted = useRef('')
  const error = useWorkspaceStore((state) => state.error)
  const loadingMessage = useWorkspaceStore((state) => state.loadingMessage)
  const openProvider = useWorkspaceStore((state) => state.openProvider)
  const ref = params.get('ref') || undefined
  const requestedNote = params.get('note') || undefined
  const key = `${owner}/${repo}@${ref || 'default'}:${requestedNote || 'overview'}`

  useEffect(() => {
    if (!owner || !repo || attempted.current === key) return
    attempted.current = key
    void openProvider(new GitHubWorkspaceProvider(owner, repo, ref))
      .then((session) => {
        const noteId = requestedNote || session.manifest.publishing.defaultNote
        navigate(noteId && session.documentById.has(noteId) ? `/notes/${encodeURIComponent(noteId)}` : '/workspace', { replace: true })
      })
      .catch(() => undefined)
  }, [key, navigate, openProvider, owner, ref, repo, requestedNote])

  return (
    <main className="route-status-page">
      <GithubLogo size={30} weight="duotone" />
      <h1>{error ? '无法打开 GitHub Workspace' : '正在打开 GitHub Workspace'}</h1>
      <p>{error || loadingMessage || `${owner}/${repo}`}</p>
      {error && <Link to="/">返回 Workspace 首页</Link>}
    </main>
  )
}
