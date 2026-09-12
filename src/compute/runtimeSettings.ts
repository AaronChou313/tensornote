import type { HostCapabilities } from '../host/types'
import { computeConnectorKind } from './connectors'
import type { ComputeProfile } from './types'

export type RuntimeLocation = 'local' | 'remote'

export interface ComputeCapabilities {
  localRuntime: boolean
  remoteRuntime: boolean
  environmentDiscovery: boolean
  environmentManagement: boolean
  ownedJupyterServer: boolean
  manualLocalJupyter: boolean
  remoteJupyter: boolean
  jupyterHub: boolean
  binderHub: boolean
}

export function resolveComputeCapabilities(host: Pick<HostCapabilities, 'desktopShell' | 'environmentDiscovery' | 'processManagement'>): ComputeCapabilities {
  const desktop = host.desktopShell
  return {
    localRuntime: desktop,
    remoteRuntime: true,
    environmentDiscovery: desktop && host.environmentDiscovery,
    environmentManagement: desktop && host.environmentDiscovery && host.processManagement,
    ownedJupyterServer: desktop && host.processManagement,
    manualLocalJupyter: desktop,
    remoteJupyter: true,
    jupyterHub: true,
    binderHub: true,
  }
}

export function runtimeLocationsForCapabilities(capabilities: ComputeCapabilities): RuntimeLocation[] {
  return capabilities.localRuntime ? ['local', 'remote'] : ['remote']
}

export function connectorKindsFor(location: RuntimeLocation) {
  return location === 'local' ? ['direct'] as const : ['direct', 'jupyterhub', 'binderhub'] as const
}

export function profileRuntimeLocation(profile: Pick<ComputeProfile, 'connector' | 'serverUrl' | 'runtimeLocation'>): RuntimeLocation {
  if (profile.runtimeLocation) return profile.runtimeLocation
  if (computeConnectorKind(profile.connector) !== 'direct' || !profile.serverUrl.trim()) return 'remote'
  try {
    return ['localhost', '127.0.0.1', '::1'].includes(new URL(profile.serverUrl).hostname) ? 'local' : 'remote'
  } catch {
    return 'remote'
  }
}
