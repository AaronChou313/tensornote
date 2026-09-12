import { useEffect, useRef } from 'react'
import { CloudArrowDown } from '@phosphor-icons/react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import { createRemoteWorkspaceProvider } from '../workspace/providers/createRemoteWorkspaceProvider'
import { parseRemoteRoute } from '../publishing/links'
import { formatWorkspaceSource } from '../workspace/remote'

export function RemoteWorkspaceOpenPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const attempted = useRef('')
  const error = useWorkspaceStore((state) => state.error)
  const loadingMessage = useWorkspaceStore((state) => state.loadingMessage)
  const openProvider = useWorkspaceStore((state) => state.openProvider)
  const location = parseRemoteRoute(params)
  const key = params.toString()

  useEffect(() => {
    if (!location || attempted.current === key) return
    attempted.current = key
    void openProvider(createRemoteWorkspaceProvider(location)).then((session) => {
      const requestedNote = params.get('note') || session.manifest.publishing.defaultNote
      navigate(requestedNote && session.documentById.has(requestedNote) ? `/notes/${encodeURIComponent(requestedNote)}` : '/workspace', { replace: true })
    }).catch(() => undefined)
  }, [key, location, navigate, openProvider, params])

  const label = location ? formatWorkspaceSource(location.provider) : '在线'
  return <main className="route-status-page"><CloudArrowDown size={30} weight="duotone" /><h1>{error || !location ? `无法打开${label}知识库` : `正在打开${label}知识库`}</h1><p>{!location ? '分享链接格式不正确' : error || loadingMessage || location.project}</p>{(error || !location) && <Link to="/">返回知识库首页</Link>}</main>
}
