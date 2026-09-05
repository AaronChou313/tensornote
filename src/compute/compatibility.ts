import { computeConnectorKind } from './connectors'
import type { ComputeConnectorKind, ComputeProfile, DiagnosticCheck } from './types'

export interface ComputeConnectorCompatibility {
  kind: 'direct' | 'jupyterhub' | 'binderhub'
  endpoint: string
  authentication: string
  lifecycle: string
  persistence: string
  requirements: string[]
}

export const computeConnectorCompatibilityMatrix: ComputeConnectorCompatibility[] = [
  {
    kind: 'direct',
    endpoint: 'Jupyter Server REST + WebSocket',
    authentication: 'Optional Jupyter token',
    lifecycle: 'TensorNote manages kernels only',
    persistence: 'Defined by the server owner',
    requirements: ['HTTPS for remote hosts', 'Browser CORS', 'Kernel WebSocket access'],
  },
  {
    kind: 'jupyterhub',
    endpoint: 'JupyterHub REST + single-user Jupyter',
    authentication: 'Current-user limited API token',
    lifecycle: 'Connect existing or start/stop TensorNote-owned server',
    persistence: 'Defined by the Hub administrator',
    requirements: ['HTTPS', 'Hub and user-server CORS', 'read:servers and servers scopes', 'Named servers enabled when a name is used', 'JUPYTERHUB_ALLOW_TOKEN_IN_URL=1 for browser token WebSockets on JupyterHub 5'],
  },
  {
    kind: 'binderhub',
    endpoint: 'BinderHub build event stream + temporary Jupyter',
    authentication: 'Ephemeral launch token',
    lifecycle: 'Build, launch, then release temporary server',
    persistence: 'Ephemeral; platform idle limits apply',
    requirements: ['HTTPS and CORS', 'Public GitHub repository', 'Full 40-character commit SHA', 'Binder-compatible environment files'],
  },
]

function safeServer(value: string) {
  try {
    const url = new URL(value)
    url.username = ''
    url.password = ''
    url.search = ''
    url.hash = ''
    return url.toString()
  } catch {
    return '[invalid URL]'
  }
}

export function formatComputeDiagnosticReport(profile: ComputeProfile, checks: DiagnosticCheck[], pageOrigin = globalThis.location?.origin ?? 'unknown') {
  const connector = computeConnectorKind(profile.connector)
  const lines = [
    'TensorNote Compute Diagnostic Report',
    `Generated: ${new Date().toISOString()}`,
    `Page origin: ${pageOrigin}`,
    `Connector: ${connector}`,
    `Provider: ${profile.kind}`,
    `Server: ${safeServer(profile.serverUrl)}`,
    `Kernel: ${profile.kernelName}`,
    `Scope: ${profile.scope}`,
    '',
    ...checks.map((check) => `[${check.status.toUpperCase()}] ${check.label}: ${check.detail}`),
    '',
    'Secrets are intentionally excluded. Review the text before sharing.',
  ]
  return lines.join('\n')
}

export function connectorCompatibility(kind: ComputeConnectorKind) {
  return computeConnectorCompatibilityMatrix.find((item) => item.kind === kind)
}
