import type { KernelStatus } from '../types'
import type {
  ComputeConnectionEvent,
  ComputeConnector,
  ComputeConnectorKind,
  ComputeContext,
  ComputeProfile,
  ComputeProvider,
  ComputeProviderKind,
  ComputeSession,
  DiagnosticCheck,
  ExecutionHandlers,
} from './types'
import { computeConnectorKind, createComputeConnector } from './connectors'

type ProviderFactory = (kind: ComputeProviderKind) => ComputeProvider | Promise<ComputeProvider>
type ConnectorFactory = (kind: ComputeConnectorKind) => ComputeConnector | Promise<ComputeConnector>

async function defaultProviderFactory(kind: ComputeProviderKind) {
  if (kind === 'jupyter') {
    const { JupyterComputeProvider } = await import('./JupyterComputeProvider')
    return new JupyterComputeProvider()
  }
  throw new Error(`Unsupported Compute Provider: ${kind}`)
}

export function computeScopeKey(profile: ComputeProfile, context: ComputeContext) {
  if (profile.scope === 'note') return `note:${context.workspaceId}:${context.noteId || 'scratch'}`
  if (profile.scope === 'workspace') return `workspace:${context.workspaceId}`
  return `manual:${context.workspaceId}`
}

export class ComputeRuntime {
  private provider: ComputeProvider | null = null
  private session: ComputeSession | null = null
  private lease: Awaited<ReturnType<ComputeConnector['connect']>> | null = null
  private connectionAbort: AbortController | null = null
  private activeProfile: ComputeProfile | null = null
  private activeContext: ComputeContext | null = null
  private activeScopeKey = ''
  private configSignature = ''
  private statusHandler: (status: KernelStatus) => void = () => undefined
  private connectionHandler: (event: ComputeConnectionEvent) => void = () => undefined

  constructor(
    private readonly providerFactory: ProviderFactory = defaultProviderFactory,
    private readonly connectorFactory: ConnectorFactory = createComputeConnector,
  ) {}

  onStatus(handler: (status: KernelStatus) => void) {
    this.statusHandler = handler
  }

  onConnectionEvent(handler: (event: ComputeConnectionEvent) => void) {
    this.connectionHandler = handler
  }

  get connected() {
    return Boolean(this.session)
  }

  get sessionScopeKey() {
    return this.activeScopeKey
  }

  get connectionActive() {
    return Boolean(this.connectionAbort || this.lease)
  }

  private request(profile: ComputeProfile, token: string, context: ComputeContext, signal?: AbortSignal) {
    return {
      profile,
      credential: token,
      context,
      signal,
      onEvent: this.connectionHandler,
    }
  }

  private signature(profile: ComputeProfile, token: string, context: ComputeContext) {
    return JSON.stringify({ profile, token, workspaceSource: context.workspaceSource })
  }

  private async prepareConnection(profile: ComputeProfile, token: string, context: ComputeContext) {
    const signature = this.signature(profile, token, context)
    if (this.lease && this.configSignature === signature) return this.lease.connection

    await this.shutdown()
    const connector = await this.connectorFactory(computeConnectorKind(profile.connector))
    const abort = new AbortController()
    this.connectionAbort = abort
    this.configSignature = signature
    try {
      const lease = await connector.connect(this.request(profile, token, context, abort.signal))
      this.lease = lease
      this.connectionAbort = null
      this.activeProfile = profile
      this.activeContext = context
      this.activeScopeKey = computeScopeKey(profile, context)
      return lease.connection
    } catch (reason) {
      const cancelled = abort.signal.aborted
      this.connectionAbort = null
      this.configSignature = ''
      this.connectionHandler(cancelled ? {
        connector: connector.kind,
        phase: 'idle',
        message: 'Compute 连接已取消。',
        occurredAt: Date.now(),
      } : {
        connector: connector.kind,
        phase: 'error',
        message: reason instanceof Error ? reason.message : 'Compute 连接失败',
        occurredAt: Date.now(),
      })
      if (cancelled) throw new DOMException('Compute 连接已取消。', 'AbortError')
      throw reason
    }
  }

  private async ensureSession(profile: ComputeProfile, token: string, context: ComputeContext) {
    const scopeKey = computeScopeKey(profile, context)
    const signature = this.signature(profile, token, context)
    if (this.session && this.activeScopeKey === scopeKey && this.configSignature === signature) return this.session

    const config = await this.prepareConnection(profile, token, context)
    const provider = await this.providerFactory(profile.kind)
    provider.onStatus(this.statusHandler)
    this.provider = provider
    this.activeProfile = profile
    this.activeContext = context
    this.activeScopeKey = scopeKey
    this.configSignature = signature
    try {
      await provider.connect(config)
      this.session = await provider.createSession(config)
      return this.session
    } catch (reason) {
      await provider.disconnect().catch(() => undefined)
      this.provider = null
      this.activeProfile = null
      this.activeContext = null
      this.activeScopeKey = ''
      await this.releaseConnection()
      throw reason
    }
  }

  async prepare(profile: ComputeProfile, token: string, context: ComputeContext) {
    const config = await this.prepareConnection(profile, token, context)
    const provider = await this.providerFactory(profile.kind)
    try {
      return await provider.diagnose(config)
    } finally {
      await provider.disconnect().catch(() => undefined)
    }
  }

  async execute(
    profile: ComputeProfile,
    token: string,
    context: ComputeContext,
    code: string,
    handlers: ExecutionHandlers,
  ) {
    const session = await this.ensureSession(profile, token, context)
    return session.execute(code, handlers)
  }

  async handleContextChange(profile: ComputeProfile, context: ComputeContext) {
    if ((!this.session && !this.lease) || !this.activeProfile || !this.activeContext) return
    const profileChanged = this.activeProfile.id !== profile.id
      || this.activeProfile.kind !== profile.kind
      || this.activeProfile.serverUrl !== profile.serverUrl
      || this.activeProfile.kernelName !== profile.kernelName
      || this.activeProfile.scope !== profile.scope
      || JSON.stringify(this.activeProfile.connector ?? { kind: 'direct' }) !== JSON.stringify(profile.connector ?? { kind: 'direct' })
    const workspaceChanged = this.activeContext.workspaceId !== context.workspaceId
    const scopeChanged = computeScopeKey(profile, context) !== this.activeScopeKey
    if (profileChanged || workspaceChanged || (profile.scope === 'note' && scopeChanged)) await this.shutdown()
    else this.activeContext = context
  }

  async interrupt() {
    await this.session?.interrupt()
  }

  async restart() {
    await this.session?.restart()
  }

  async shutdown() {
    const session = this.session
    const provider = this.provider
    this.connectionAbort?.abort(new DOMException('Compute connection cancelled', 'AbortError'))
    this.connectionAbort = null
    this.session = null
    this.provider = null
    this.activeProfile = null
    this.activeContext = null
    this.activeScopeKey = ''
    if (session) await session.shutdown().catch(() => undefined)
    await provider?.disconnect().catch(() => undefined)
    await this.releaseConnection()
    this.statusHandler('offline')
  }

  private async releaseConnection() {
    const lease = this.lease
    this.lease = null
    this.configSignature = ''
    let releaseFailed = false
    if (lease) await lease.release().catch((reason) => {
      releaseFailed = true
      this.connectionHandler({
        connector: lease.connector,
        phase: 'error',
        message: reason instanceof Error ? reason.message : 'Compute 环境清理失败',
        occurredAt: Date.now(),
      })
    })
    if (!releaseFailed) this.connectionHandler({ connector: lease?.connector ?? 'direct', phase: 'idle', message: 'Compute 连接已断开。', occurredAt: Date.now() })
  }

  async diagnose(profile: ComputeProfile, token: string, context: ComputeContext = { workspaceId: 'workspace' }): Promise<DiagnosticCheck[]> {
    const connector = await this.connectorFactory(computeConnectorKind(profile.connector))
    const connectorResult = await connector.diagnose(this.request(profile, token, context))
    if (!connectorResult.connection) return connectorResult.checks
    const provider = await this.providerFactory(profile.kind)
    try {
      return [...connectorResult.checks, ...await provider.diagnose(connectorResult.connection)]
    } finally {
      await provider.disconnect().catch(() => undefined)
    }
  }

  async listKernels(profile: ComputeProfile, token: string, context: ComputeContext = { workspaceId: 'workspace' }) {
    const connector = await this.connectorFactory(computeConnectorKind(profile.connector))
    const connectorResult = await connector.diagnose(this.request(profile, token, context))
    if (!connectorResult.connection) throw new Error('Compute 环境尚未就绪，请先启动或连接环境。')
    const provider = await this.providerFactory(profile.kind)
    try {
      return await provider.listKernels(connectorResult.connection)
    } finally {
      await provider.disconnect().catch(() => undefined)
    }
  }
}

export const computeRuntime = new ComputeRuntime()
