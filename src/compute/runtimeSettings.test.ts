import { describe, expect, it } from 'vitest'
import { connectorKindsFor, profileRuntimeLocation, resolveComputeCapabilities, runtimeLocationsForCapabilities } from './runtimeSettings'

const desktopHost = { desktopShell: true, environmentDiscovery: true, processManagement: true }
const webHost = { desktopShell: false, environmentDiscovery: false, processManagement: false }

describe('runtime settings host boundaries', () => {
  it('resolves complete Desktop capabilities', () => {
    const capabilities = resolveComputeCapabilities(desktopHost)
    expect(capabilities).toEqual({ localRuntime: true, remoteRuntime: true, environmentDiscovery: true, environmentManagement: true, ownedJupyterServer: true, manualLocalJupyter: true, remoteJupyter: true, jupyterHub: true, binderHub: true })
    expect(runtimeLocationsForCapabilities(capabilities)).toEqual(['local', 'remote'])
  })

  it('keeps every Web deployment remote-only', () => {
    const capabilities = resolveComputeCapabilities(webHost)
    expect(capabilities).toEqual({ localRuntime: false, remoteRuntime: true, environmentDiscovery: false, environmentManagement: false, ownedJupyterServer: false, manualLocalJupyter: false, remoteJupyter: true, jupyterHub: true, binderHub: true })
    expect(runtimeLocationsForCapabilities(capabilities)).toEqual(['remote'])
  })

  it('limits local connections and classifies loopback profiles', () => {
    expect(connectorKindsFor('local')).toEqual(['direct'])
    expect(connectorKindsFor('remote')).toEqual(['direct', 'jupyterhub', 'binderhub'])
    expect(profileRuntimeLocation({ serverUrl: 'http://127.0.0.1:8888', connector: { kind: 'direct' } })).toBe('local')
    expect(profileRuntimeLocation({ serverUrl: 'https://hub.example.com', connector: { kind: 'jupyterhub' } })).toBe('remote')
  })
})
