import type {
  ComputeConnector,
  ComputeConnectionLease,
  ComputeConnectionRequest,
  ComputeConnectorDiagnosticResult,
  DiagnosticCheck,
} from '../types'
import {
  connectorEvent,
  normalizeServiceUrl,
  readJsonEventStream,
  redactedMessage,
  requireHttpsForRemote,
  resolveServiceUrl,
  serviceUrl,
} from './http'

interface HubServerModel {
  name?: string
  ready?: boolean
  pending?: string | null
  url?: string
  progress_url?: string
}

interface HubUserModel {
  name: string
  servers?: Record<string, HubServerModel>
  server?: string | null
  pending?: string | null
}

interface HubProgressEvent {
  progress?: number
  message?: string
  ready?: boolean
  url?: string
}

function hubHeaders(token: string) {
  const headers: Record<string, string> = {}
  if (token.trim()) headers.Authorization = `token ${token.trim()}`
  return headers
}

async function hubRequest(request: ComputeConnectionRequest, path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  for (const [key, value] of Object.entries(hubHeaders(request.credential))) headers.set(key, value)
  const response = await fetch(serviceUrl(request.profile.serverUrl, path), {
    ...init,
    mode: 'cors',
    signal: request.signal,
    headers,
  })
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error(`JupyterHub Token 权限不足（HTTP ${response.status}）`)
    throw new Error(`JupyterHub API 返回 HTTP ${response.status}`)
  }
  return response
}

async function currentUser(request: ComputeConnectionRequest) {
  const response = await hubRequest(request, 'hub/api/user')
  return response.json() as Promise<HubUserModel>
}

function targetServer(user: HubUserModel, name: string) {
  if (user.servers) return user.servers[name]
  if (!name && user.server) return { name: '', ready: !user.pending, pending: user.pending, url: user.server }
  return undefined
}

function serverApiPath(username: string, serverName: string) {
  const user = encodeURIComponent(username)
  return serverName
    ? `hub/api/users/${user}/servers/${encodeURIComponent(serverName)}`
    : `hub/api/users/${user}/server`
}

function connection(request: ComputeConnectionRequest, url: string) {
  return {
    serverUrl: resolveServiceUrl(request.profile.serverUrl, url),
    token: request.credential,
    kernelName: request.profile.kernelName,
  }
}

function delay(milliseconds: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const finish = () => { signal?.removeEventListener('abort', abort); resolve() }
    const timeout = setTimeout(finish, milliseconds)
    const abort = () => { clearTimeout(timeout); reject(signal?.reason ?? new DOMException('Aborted', 'AbortError')) }
    signal?.addEventListener('abort', abort, { once: true })
  })
}

export class JupyterHubConnector implements ComputeConnector {
  readonly id = 'jupyterhub'
  readonly kind = 'jupyterhub' as const
  readonly label = 'JupyterHub'

  async connect(request: ComputeConnectionRequest): Promise<ComputeConnectionLease> {
    requireHttpsForRemote(request.profile.serverUrl)
    if (!request.credential.trim()) throw new Error('JupyterHub 连接需要当前用户的有限权限 API Token。')
    const config = request.profile.connector?.kind === 'jupyterhub' ? request.profile.connector : { kind: 'jupyterhub' as const }
    request.onEvent(connectorEvent(this.kind, 'authenticating', '正在验证 JupyterHub 身份…', 5))
    let user = await currentUser(request)
    if (config.username?.trim() && config.username.trim() !== user.name) {
      throw new Error(`Token 属于 ${user.name}，与 Profile 用户 ${config.username.trim()} 不一致。`)
    }
    const serverName = config.serverName?.trim() ?? ''
    let server = targetServer(user, serverName)
    let started = false

    if (!server?.ready || !server.url) {
      request.onEvent(connectorEvent(this.kind, 'spawning', `正在启动 ${serverName || '默认'} Server…`, 10))
      const start = await fetch(serviceUrl(request.profile.serverUrl, serverApiPath(user.name, serverName)), {
        method: 'POST',
        mode: 'cors',
        signal: request.signal,
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...hubHeaders(request.credential) },
        body: '{}',
      })
      if (![201, 202, 400, 409].includes(start.status)) {
        if (start.status === 401 || start.status === 403) throw new Error(`Token 缺少启动 Server 的权限（HTTP ${start.status}）。`)
        throw new Error(`JupyterHub 无法启动 Server（HTTP ${start.status}）。`)
      }
      if (start.status === 400) throw new Error('JupyterHub 拒绝启动请求；请检查命名 Server 是否启用及 Spawner 选项。')
      started = start.status === 201 || start.status === 202
      user = await currentUser(request)
      server = targetServer(user, serverName)

      if (server?.progress_url) {
        try {
          const progressResponse = await fetch(resolveServiceUrl(request.profile.serverUrl, server.progress_url), {
            mode: 'cors',
            signal: request.signal,
            headers: { Accept: 'text/event-stream', ...hubHeaders(request.credential) },
          })
          await readJsonEventStream<HubProgressEvent>(progressResponse, (event) => {
            request.onEvent(connectorEvent(this.kind, event.ready ? 'ready' : 'spawning', event.message || 'JupyterHub 正在启动 Server…', event.progress))
            if (event.ready && event.url) server = { ...server, ready: true, url: event.url }
          })
        } catch (reason) {
          if (request.signal?.aborted) throw reason
          request.onEvent(connectorEvent(this.kind, 'spawning', 'Progress stream 不可用，改用状态轮询…', 20))
        }
      }

      for (let attempt = 0; (!server?.ready || !server.url) && attempt < 120; attempt += 1) {
        await delay(1000, request.signal)
        user = await currentUser(request)
        server = targetServer(user, serverName)
        request.onEvent(connectorEvent(this.kind, 'spawning', server?.pending ? `Spawner: ${server.pending}` : '等待 Server 就绪…', Math.min(95, 20 + attempt)))
      }
    }

    if (!server?.ready || !server.url) throw new Error('JupyterHub Server 启动超时。')
    const resolved = connection(request, server.url)
    request.onEvent(connectorEvent(this.kind, 'ready', `JupyterHub Server 已就绪：${new URL(resolved.serverUrl).pathname}`, 100))
    return {
      connector: this.kind,
      connection: resolved,
      ownership: started ? 'tensornote' : 'external',
      persistence: 'provider-managed',
      release: async () => {
        if (!started || config.stopOnDisconnect === false) return
        request.onEvent(connectorEvent(this.kind, 'stopping', '正在停止 TensorNote 启动的 JupyterHub Server…'))
        const response = await fetch(serviceUrl(request.profile.serverUrl, serverApiPath(user.name, serverName)), {
          method: 'DELETE',
          mode: 'cors',
          headers: { Accept: 'application/json', ...hubHeaders(request.credential) },
        })
        if (!response.ok && response.status !== 202 && response.status !== 204 && response.status !== 404) {
          throw new Error(`JupyterHub Server 清理失败（HTTP ${response.status}）。`)
        }
      },
    }
  }

  async diagnose(request: ComputeConnectionRequest): Promise<ComputeConnectorDiagnosticResult> {
    const checks: DiagnosticCheck[] = []
    try {
      requireHttpsForRemote(request.profile.serverUrl)
      normalizeServiceUrl(request.profile.serverUrl)
      checks.push({ id: 'browser', label: 'Secure endpoint', status: 'pass', detail: 'Hub URL 可由当前页面安全访问。' })
    } catch (reason) {
      return { checks: [{ id: 'browser', label: 'Secure endpoint', status: 'fail', detail: redactedMessage(reason, request.credential) }] }
    }
    if (!request.credential.trim()) {
      checks.push({ id: 'authentication', label: 'Limited API token', status: 'fail', detail: '需要 JupyterHub 当前用户的 API Token；不会写入 Workspace。' })
      return { checks }
    }
    try {
      const user = await currentUser(request)
      const config = request.profile.connector?.kind === 'jupyterhub' ? request.profile.connector : { kind: 'jupyterhub' as const }
      const name = config.serverName?.trim() ?? ''
      const server = targetServer(user, name)
      checks.push({ id: 'identity', label: 'Hub identity', status: 'pass', detail: `已验证用户 ${user.name}。` })
      checks.push({ id: 'lifecycle', label: 'Server lifecycle', status: server?.ready ? 'pass' : 'warning', detail: server?.ready ? `${name || '默认'} Server 已运行。` : `连接时将启动 ${name || '默认'} Server。` })
      checks.push({ id: 'persistence', label: 'Data ownership', status: 'warning', detail: '持久性、配额与闲置回收由 JupyterHub 管理者决定。' })
      return { checks, ...(server?.ready && server.url ? { connection: connection(request, server.url) } : {}) }
    } catch (reason) {
      checks.push({ id: 'authentication', label: 'Hub API access', status: 'fail', detail: redactedMessage(reason, request.credential) })
      return { checks }
    }
  }
}
