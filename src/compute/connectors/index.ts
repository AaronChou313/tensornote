import type { ComputeConnector, ComputeConnectorKind } from '../types'
import { BinderHubConnector } from './BinderHubConnector'
import { DirectJupyterConnector } from './DirectJupyterConnector'
import { JupyterHubConnector } from './JupyterHubConnector'

export function computeConnectorKind(connector: { kind: ComputeConnectorKind } | undefined) {
  return connector?.kind ?? 'direct'
}

export function createComputeConnector(kind: ComputeConnectorKind): ComputeConnector {
  if (kind === 'direct') return new DirectJupyterConnector()
  if (kind === 'jupyterhub') return new JupyterHubConnector()
  if (kind === 'binderhub') return new BinderHubConnector()
  throw new Error(`Unsupported Compute Connector: ${kind}`)
}

export { BinderHubConnector } from './BinderHubConnector'
export { DirectJupyterConnector } from './DirectJupyterConnector'
export { JupyterHubConnector } from './JupyterHubConnector'
