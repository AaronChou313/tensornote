import type { KernelStatus } from '../types'
import { JupyterClient } from '../jupyter/JupyterClient'
import type {
  ComputeConnectionConfig,
  ComputeKernelSpec,
  ComputeProvider,
  ComputeSession,
  DiagnosticCheck,
} from './types'

function baseUrl(value: string) {
  return `${value.trim().replace(/\/+$/, '')}/`
}

function apiUrl(config: ComputeConnectionConfig, path: string) {
  return new URL(path.replace(/^\/+/, ''), baseUrl(config.serverUrl))
}

function apiRequestInit(config: ComputeConnectionConfig): RequestInit {
  const token = config.token.trim()
  return {
    mode: 'cors',
    headers: token ? { Authorization: `token ${token}` } : undefined,
  }
}

function safeMessage(reason: unknown, token: string) {
  const message = reason instanceof Error ? reason.message : String(reason)
  return token ? message.replaceAll(token, '[redacted]') : message
}

interface KernelSpecsResponse {
  default?: string
  kernelspecs?: Record<string, { spec?: { display_name?: string; language?: string } }>
}

async function fetchKernels(config: ComputeConnectionConfig) {
  const response = await fetch(apiUrl(config, 'api/kernelspecs'), apiRequestInit(config))
  if (!response.ok) throw new Error(`Kernel API returned HTTP ${response.status}`)
  const payload = await response.json() as KernelSpecsResponse
  return Object.entries(payload.kernelspecs ?? {}).map(([name, value]) => ({
    name,
    displayName: value.spec?.display_name || name,
    language: value.spec?.language,
  }))
}

export class JupyterComputeProvider implements ComputeProvider {
  readonly id = 'jupyter'
  readonly kind = 'jupyter' as const
  readonly label = 'Jupyter Server'
  private client: JupyterClient | null = null
  private statusHandler: (status: KernelStatus) => void = () => undefined

  onStatus(handler: (status: KernelStatus) => void) {
    this.statusHandler = handler
  }

  async connect(config: ComputeConnectionConfig) { void config }

  async disconnect() {
    await this.client?.shutdown()
    this.client = null
    this.statusHandler('offline')
  }

  async listKernels(config: ComputeConnectionConfig): Promise<ComputeKernelSpec[]> {
    return fetchKernels(config)
  }

  async createSession(config: ComputeConnectionConfig): Promise<ComputeSession> {
    await this.disconnect()
    await this.connect(config)
    const client = new JupyterClient()
    client.onStatus(this.statusHandler)
    await client.connect(config)
    this.client = client
    return {
      get id() { return client.sessionId },
      get status() { return client.status },
      execute: (code, handlers) => client.execute(code, config, handlers),
      interrupt: () => client.interrupt(),
      restart: () => client.restart(),
      shutdown: async () => {
        await client.shutdown()
        if (this.client === client) this.client = null
      },
    }
  }

  async diagnose(config: ComputeConnectionConfig): Promise<DiagnosticCheck[]> {
    const checks: DiagnosticCheck[] = []
    let parsedServer: URL
    try {
      parsedServer = new URL(config.serverUrl)
    } catch {
      return [{ id: 'browser', label: 'Browser access', status: 'fail', detail: 'Server URL 格式无效。' }]
    }

    const pageProtocol = typeof globalThis.location === 'undefined' ? 'http:' : globalThis.location.protocol
    const mixedContent = pageProtocol === 'https:' && parsedServer.protocol === 'http:'
    checks.push({
      id: 'browser',
      label: 'Browser access',
      status: mixedContent ? 'fail' : 'pass',
      detail: mixedContent
        ? 'HTTPS 页面不能访问 HTTP Jupyter。请为 Server 配置 HTTPS，或从本地 HTTP TensorNote 访问。'
        : '当前页面协议允许尝试访问该 Server。',
    })
    if (mixedContent) {
      for (const [id, label] of [['server', 'Server reachable'], ['authentication', 'Authentication'], ['cors', 'CORS'], ['kernel', 'Kernel available'], ['websocket', 'WebSocket']] as const) {
        checks.push({ id, label, status: 'skipped', detail: 'Browser access 检查未通过。' })
      }
      return checks
    }

    let apiResponse: Response | null = null
    try {
      apiResponse = await fetch(apiUrl(config, 'api'), apiRequestInit(config))
      checks.push({ id: 'server', label: 'Server reachable', status: 'pass', detail: `Jupyter 返回 HTTP ${apiResponse.status}。` })
      checks.push({ id: 'cors', label: 'CORS', status: 'pass', detail: '浏览器可以读取 Jupyter API 响应。' })
      if (apiResponse.status === 401 || apiResponse.status === 403) {
        checks.push({ id: 'authentication', label: 'Authentication', status: 'fail', detail: `Token 被拒绝（HTTP ${apiResponse.status}）。` })
      }
    } catch (reason) {
      const detail = safeMessage(reason, config.token)
      const localHint = ['localhost', '127.0.0.1', '::1'].includes(parsedServer.hostname)
        ? ' 请检查 Jupyter 是否启动、allow_origin 是否匹配，以及浏览器是否阻止 localhost。'
        : ' 请检查网络、TLS 证书和 Server 地址。'
      checks.push({ id: 'server', label: 'Server reachable', status: 'fail', detail: `${detail}.${localHint}` })
      checks.push({ id: 'cors', label: 'CORS', status: 'fail', detail: '浏览器未能读取响应；Server 离线和 CORS 配置错误都可能导致此结果。' })
      checks.push({ id: 'authentication', label: 'Authentication', status: 'skipped', detail: 'Server/CORS 检查未通过。' })
    }

    if (!apiResponse?.ok) {
      if (!checks.some((check) => check.id === 'authentication')) {
        checks.push({ id: 'authentication', label: 'Authentication', status: 'warning', detail: `API 返回 HTTP ${apiResponse?.status ?? '未知'}，无法确认身份验证状态。` })
      }
      checks.push({ id: 'kernel', label: 'Kernel available', status: 'skipped', detail: 'API 身份验证未通过。' })
      checks.push({ id: 'websocket', label: 'WebSocket', status: 'skipped', detail: 'Kernel 检查未运行。' })
      return checks
    }

    try {
      const kernelResponse = await fetch(apiUrl(config, 'api/kernelspecs'), apiRequestInit(config))
      if (kernelResponse.status === 401 || kernelResponse.status === 403) {
        if (!checks.some((check) => check.id === 'authentication')) {
          checks.push({ id: 'authentication', label: 'Authentication', status: 'fail', detail: `Token 被拒绝（HTTP ${kernelResponse.status}）。` })
        }
        checks.push({ id: 'kernel', label: 'Kernel available', status: 'skipped', detail: 'API 身份验证未通过。' })
        checks.push({ id: 'websocket', label: 'WebSocket', status: 'skipped', detail: 'Kernel 检查未运行。' })
        return checks
      }
      if (!kernelResponse.ok) throw new Error(`Kernel API returned HTTP ${kernelResponse.status}`)
      if (!checks.some((check) => check.id === 'authentication')) {
        checks.push({
          id: 'authentication',
          label: 'Authentication',
          status: config.token.trim() ? 'pass' : 'warning',
          detail: config.token.trim() ? 'Token 验证通过。' : 'Server 未要求 Token；不建议关闭 Jupyter 身份验证。',
        })
      }
      const payload = await kernelResponse.json() as KernelSpecsResponse
      const kernels = Object.entries(payload.kernelspecs ?? {}).map(([name, value]) => ({
        name,
        displayName: value.spec?.display_name || name,
        language: value.spec?.language,
      }))
      const selected = kernels.find((kernel) => kernel.name === config.kernelName.trim())
      checks.push({
        id: 'kernel',
        label: 'Kernel available',
        status: selected ? 'pass' : 'fail',
        detail: selected
          ? `已找到 ${selected.displayName}（${selected.name}）。`
          : `未找到 ${config.kernelName || '未命名 Kernel'}；可用：${kernels.map((kernel) => kernel.name).join(', ') || '无'}。`,
      })
      if (!selected) {
        checks.push({ id: 'websocket', label: 'WebSocket', status: 'skipped', detail: '目标 Kernel 不存在。' })
        return checks
      }
    } catch (reason) {
      if (!checks.some((check) => check.id === 'authentication')) {
        checks.push({ id: 'authentication', label: 'Authentication', status: 'warning', detail: 'Kernel API 未成功返回，无法确认身份验证状态。' })
      }
      checks.push({ id: 'kernel', label: 'Kernel available', status: 'fail', detail: safeMessage(reason, config.token) })
      checks.push({ id: 'websocket', label: 'WebSocket', status: 'skipped', detail: 'Kernel API 检查未通过。' })
      return checks
    }

    const probe = new JupyterClient()
    probe.onStatus(() => undefined)
    try {
      await probe.connect(config)
      checks.push({ id: 'websocket', label: 'WebSocket', status: 'pass', detail: '已创建临时 Kernel 并完成 WebSocket 握手。' })
    } catch (reason) {
      checks.push({ id: 'websocket', label: 'WebSocket', status: 'fail', detail: safeMessage(reason, config.token) })
    } finally {
      await probe.shutdown()
    }
    return checks
  }
}
