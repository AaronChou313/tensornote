import {
  Kernel,
  KernelManager,
  KernelMessage,
  ServerConnection,
} from '@jupyterlab/services'
import type { KernelStatus } from '../types'
import type { ComputeConnectionConfig, ExecutionHandlers } from '../compute/types'

type StatusHandler = (status: KernelStatus) => void

function normalizeBaseUrl(url: string) {
  return `${url.trim().replace(/\/+$/, '')}/`
}

function toWebSocketUrl(baseUrl: string) {
  return baseUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:')
}

function normalizeText(value: unknown) {
  if (Array.isArray(value)) return value.join('')
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
}

export class JupyterClient {
  private manager: KernelManager | null = null
  private kernel: Kernel.IKernelConnection | null = null
  private statusHandler: StatusHandler = () => undefined
  private configKey = ''
  private currentStatus: KernelStatus = 'offline'

  get connected() {
    return Boolean(this.kernel)
  }

  get status() {
    return this.currentStatus
  }

  get sessionId() {
    return this.kernel?.id ?? 'jupyter-pending'
  }

  private setStatus(status: KernelStatus) {
    this.currentStatus = status
    this.statusHandler(status)
  }

  onStatus(handler: StatusHandler) {
    this.statusHandler = handler
  }

  async connect(config: ComputeConnectionConfig) {
    const nextKey = JSON.stringify(config)
    if (this.kernel && this.configKey === nextKey) return this.kernel
    if (this.kernel) await this.shutdown()

    this.setStatus('starting')
    try {
      const baseUrl = normalizeBaseUrl(config.serverUrl)
      const serverSettings = ServerConnection.makeSettings({
        baseUrl,
        wsUrl: toWebSocketUrl(baseUrl),
        token: config.token.trim(),
        appendToken: true,
      })
      this.manager = new KernelManager({ serverSettings })
      await this.manager.ready
      this.kernel = await this.manager.startNew({ name: config.kernelName.trim() || 'python3' })
      this.configKey = nextKey
      this.kernel.statusChanged.connect((_sender, status) => {
        if (status === 'busy') this.setStatus('busy')
        else if (status === 'idle') this.setStatus('idle')
        else if (status === 'starting' || status === 'restarting') this.setStatus('starting')
        else if (status === 'dead') this.setStatus('error')
      })
      this.setStatus(this.kernel.status === 'busy' ? 'busy' : 'idle')
      return this.kernel
    } catch (error) {
      this.setStatus('error')
      await this.disposeConnections()
      throw error
    }
  }

  async execute(code: string, config: ComputeConnectionConfig, handlers: ExecutionHandlers) {
    const kernel = await this.connect(config)
    this.setStatus('busy')
    const future = kernel.requestExecute({ code, stop_on_error: true, store_history: true })

    future.onIOPub = (message) => {
      if (KernelMessage.isExecuteInputMsg(message)) {
        handlers.onExecutionCount(message.content.execution_count)
        return
      }
      if (KernelMessage.isStreamMsg(message)) {
        handlers.onOutput({
          type: 'stream',
          name: message.content.name,
          text: normalizeText(message.content.text),
        })
        return
      }
      if (KernelMessage.isErrorMsg(message)) {
        handlers.onOutput({
          type: 'error',
          name: message.content.ename,
          value: message.content.evalue,
          traceback: [...message.content.traceback],
        })
        return
      }
      if (KernelMessage.isExecuteResultMsg(message) || KernelMessage.isDisplayDataMsg(message)) {
        if (KernelMessage.isExecuteResultMsg(message)) {
          handlers.onExecutionCount(message.content.execution_count)
        }
        handlers.onOutput({ type: 'display', data: { ...message.content.data } })
      }
    }

    await future.done
    this.setStatus('idle')
  }

  async interrupt() {
    if (!this.kernel) return
    await this.kernel.interrupt()
  }

  async restart() {
    if (!this.kernel) return
    this.setStatus('starting')
    await this.kernel.restart()
    this.setStatus('idle')
  }

  async shutdown() {
    if (this.kernel) {
      try {
        await this.kernel.shutdown()
      } catch {
        // The server may already be unavailable. Local handles are still disposed.
      }
    }
    await this.disposeConnections()
    this.setStatus('offline')
  }

  private async disposeConnections() {
    this.kernel?.dispose()
    this.manager?.dispose()
    this.kernel = null
    this.manager = null
    this.configKey = ''
  }
}
