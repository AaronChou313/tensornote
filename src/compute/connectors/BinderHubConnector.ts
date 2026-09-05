import type {
  ComputeConnector,
  ComputeConnectionLease,
  ComputeConnectionRequest,
  ComputeWorkspaceSource,
  DiagnosticCheck,
} from '../types'
import { connectorEvent, readJsonEventStream, redactedMessage, requireHttpsForRemote, serviceUrl } from './http'

interface BinderEvent {
  phase: 'failed' | 'built' | 'waiting' | 'building' | 'fetching' | 'pushing' | 'launching' | 'ready' | string
  message?: string
  url?: string
  token?: string
}

function githubSource(request: ComputeConnectionRequest): ComputeWorkspaceSource {
  const config = request.profile.connector?.kind === 'binderhub' ? request.profile.connector : { kind: 'binderhub' as const }
  const repository = config.repository?.trim() || request.context.workspaceSource?.repository || ''
  const revision = config.revision?.trim() || request.context.workspaceSource?.revision || ''
  if (!/^[^/\s]+\/[^/\s]+$/.test(repository)) throw new Error('BinderHub 需要 owner/repository 格式的公开 GitHub Repository。')
  if (!/^[a-f0-9]{40}$/i.test(revision)) throw new Error('BinderHub 只接受 40 位完整 commit SHA，以确保环境可复现。')
  return { provider: 'github', repository, revision }
}

function binderBuildUrl(request: ComputeConnectionRequest, source: ComputeWorkspaceSource) {
  const [owner, repo] = source.repository.split('/')
  return serviceUrl(request.profile.serverUrl, `build/gh/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(source.revision)}`)
}

function phase(event: BinderEvent) {
  if (event.phase === 'fetching') return 'fetching' as const
  if (['building', 'pushing', 'waiting', 'built'].includes(event.phase)) return 'building' as const
  if (event.phase === 'launching') return 'launching' as const
  if (event.phase === 'ready') return 'ready' as const
  return 'error' as const
}

export class BinderHubConnector implements ComputeConnector {
  readonly id = 'binderhub'
  readonly kind = 'binderhub' as const
  readonly label = 'BinderHub'

  async connect(request: ComputeConnectionRequest): Promise<ComputeConnectionLease> {
    requireHttpsForRemote(request.profile.serverUrl)
    const source = githubSource(request)
    request.onEvent(connectorEvent(this.kind, 'fetching', `准备 ${source.repository}@${source.revision.slice(0, 7)}…`, 3))
    const launchAbort = new AbortController()
    const relayAbort = () => launchAbort.abort(request.signal?.reason)
    request.signal?.addEventListener('abort', relayAbort, { once: true })
    const timeout = setTimeout(() => launchAbort.abort(new DOMException('BinderHub 启动超过 5 分钟。', 'TimeoutError')), 300_000)
    let ready: BinderEvent | null = null
    let failed: BinderEvent | null = null
    try {
      const response = await fetch(binderBuildUrl(request, source), {
        mode: 'cors',
        signal: launchAbort.signal,
        headers: { Accept: 'text/event-stream' },
      })
      await readJsonEventStream<BinderEvent>(response, (event) => {
        if (event.phase === 'failed') failed = event
        if (event.phase === 'ready') ready = event
        const progress = event.phase === 'ready' ? 100 : event.phase === 'launching' ? 90 : event.phase === 'building' ? 45 : undefined
        request.onEvent(connectorEvent(this.kind, phase(event), event.message || `BinderHub: ${event.phase}`, progress))
      })
    } catch (reason) {
      if (!request.signal?.aborted && launchAbort.signal.aborted) throw new Error('BinderHub 启动超过 5 分钟，请稍后重试或选择其他服务。')
      throw reason
    } finally {
      clearTimeout(timeout)
      request.signal?.removeEventListener('abort', relayAbort)
    }
    if (failed) throw new Error((failed as BinderEvent).message || 'BinderHub build/launch 失败。')
    if (!ready || !(ready as BinderEvent).url || !(ready as BinderEvent).token) throw new Error('BinderHub 流结束，但没有返回可用的临时 Server。')
    const readyEvent = ready as BinderEvent & { url: string; token: string }
    const connection = { serverUrl: readyEvent.url, token: readyEvent.token, kernelName: request.profile.kernelName }
    const config = request.profile.connector?.kind === 'binderhub' ? request.profile.connector : { kind: 'binderhub' as const }
    return {
      connector: this.kind,
      connection,
      ownership: 'tensornote',
      persistence: 'temporary',
      release: async () => {
        if (config.shutdownOnDisconnect === false) return
        request.onEvent(connectorEvent(this.kind, 'stopping', '正在释放 Binder 临时 Server…'))
        const shutdown = new URL('api/shutdown', `${readyEvent.url.replace(/\/+$/, '')}/`)
        const result = await fetch(shutdown, {
          method: 'POST',
          mode: 'cors',
          headers: { Authorization: `token ${readyEvent.token}` },
        })
        if (!result.ok && result.status !== 404 && result.status !== 410) throw new Error(`Binder Server 清理失败（HTTP ${result.status}）。`)
      },
    }
  }

  async diagnose(request: ComputeConnectionRequest) {
    const checks: DiagnosticCheck[] = []
    try {
      requireHttpsForRemote(request.profile.serverUrl)
      const source = githubSource(request)
      checks.push({ id: 'source', label: 'Pinned source', status: 'pass', detail: `${source.repository}@${source.revision.slice(0, 12)} 使用完整 commit SHA。` })
      const response = await fetch(serviceUrl(request.profile.serverUrl, 'health'), { mode: 'cors', signal: request.signal })
      if (!response.ok) throw new Error(`BinderHub health 返回 HTTP ${response.status}`)
      checks.push({ id: 'server', label: 'BinderHub health', status: 'pass', detail: 'BinderHub Builder 可访问；连接时才会触发构建和计费。' })
      checks.push({ id: 'lifecycle', label: 'Session lifecycle', status: 'warning', detail: '环境按需构建，启动可能需要数分钟，并会被平台按闲置策略回收。' })
      checks.push({ id: 'persistence', label: 'Ephemeral data', status: 'warning', detail: '临时 Server 中的文件和输出不会写回 GitHub；请另行下载重要结果。' })
    } catch (reason) {
      checks.push({ id: checks.some((item) => item.id === 'source') ? 'server' : 'source', label: 'Binder compatibility', status: 'fail', detail: redactedMessage(reason) })
    }
    return { checks }
  }
}
