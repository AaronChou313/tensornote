import type { DeploymentMode } from '../deployment/config'
import { computeConnectorKind } from './connectors'
import type { ComputeProfile } from './types'

export type RuntimeLocation = 'local' | 'remote'

export function runtimeLocationsFor(mode: DeploymentMode): RuntimeLocation[] {
  return mode === 'static' || mode === 'self-hosted' ? ['remote'] : ['local', 'remote']
}

export function supportsConvenientLocalRuntime(mode: DeploymentMode) {
  return mode === 'desktop'
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
