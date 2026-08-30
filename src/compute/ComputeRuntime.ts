import type { KernelStatus } from '../types'
import type {
  ComputeConnectionConfig,
  ComputeContext,
  ComputeProfile,
  ComputeProvider,
  ComputeProviderKind,
  ComputeSession,
  DiagnosticCheck,
  ExecutionHandlers,
} from './types'

type ProviderFactory = (kind: ComputeProviderKind) => ComputeProvider | Promise<ComputeProvider>

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

function connectionConfig(profile: ComputeProfile, token: string): ComputeConnectionConfig {
  return {
    serverUrl: profile.serverUrl,
    token,
    kernelName: profile.kernelName,
  }
}

export class ComputeRuntime {
  private provider: ComputeProvider | null = null
  private session: ComputeSession | null = null
  private activeProfile: ComputeProfile | null = null
  private activeContext: ComputeContext | null = null
  private activeScopeKey = ''
  private configSignature = ''
  private statusHandler: (status: KernelStatus) => void = () => undefined

  constructor(private readonly providerFactory: ProviderFactory = defaultProviderFactory) {}

  onStatus(handler: (status: KernelStatus) => void) {
    this.statusHandler = handler
  }

  get connected() {
    return Boolean(this.session)
  }

  get sessionScopeKey() {
    return this.activeScopeKey
  }

  private async ensureSession(profile: ComputeProfile, token: string, context: ComputeContext) {
    const scopeKey = computeScopeKey(profile, context)
    const config = connectionConfig(profile, token)
    const signature = JSON.stringify({ profileId: profile.id, ...config })
    if (this.session && this.activeScopeKey === scopeKey && this.configSignature === signature) return this.session

    await this.shutdown()
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
      this.configSignature = ''
      throw reason
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
    if (!this.session || !this.activeProfile || !this.activeContext) return
    const profileChanged = this.activeProfile.id !== profile.id
      || this.activeProfile.kind !== profile.kind
      || this.activeProfile.serverUrl !== profile.serverUrl
      || this.activeProfile.kernelName !== profile.kernelName
      || this.activeProfile.scope !== profile.scope
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
    this.session = null
    this.provider = null
    this.activeProfile = null
    this.activeContext = null
    this.activeScopeKey = ''
    this.configSignature = ''
    if (session) await session.shutdown().catch(() => undefined)
    await provider?.disconnect().catch(() => undefined)
    this.statusHandler('offline')
  }

  async diagnose(profile: ComputeProfile, token: string): Promise<DiagnosticCheck[]> {
    const provider = await this.providerFactory(profile.kind)
    try {
      return await provider.diagnose(connectionConfig(profile, token))
    } finally {
      await provider.disconnect().catch(() => undefined)
    }
  }

  async listKernels(profile: ComputeProfile, token: string) {
    const provider = await this.providerFactory(profile.kind)
    try {
      return await provider.listKernels(connectionConfig(profile, token))
    } finally {
      await provider.disconnect().catch(() => undefined)
    }
  }
}

export const computeRuntime = new ComputeRuntime()
