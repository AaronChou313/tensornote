import { describe, expect, it } from 'vitest'
import { connectorKindsFor, profileRuntimeLocation, resolveComputeCapabilities, runtimeLocationsFor, runtimeLocationsForCapabilities, supportsConvenientLocalRuntime } from './runtimeSettings'

const desktopHost = { environmentDiscovery: true, processManagement: true }
const webHost = { environmentDiscovery: false, processManagement: false }

describe('runtime settings platform boundaries', () => {
  it('shows convenient local runtime only in Desktop', () => {
    expect(supportsConvenientLocalRuntime('desktop')).toBe(true)
    expect(supportsConvenientLocalRuntime('local')).toBe(false)
    expect(supportsConvenientLocalRuntime('static')).toBe(false)
  })

  it('keeps online builds remote-only and local builds explicit', () => {
    expect(runtimeLocationsFor('static')).toEqual(['remote'])
    expect(runtimeLocationsFor('self-hosted')).toEqual(['remote'])
    expect(runtimeLocationsFor('local')).toEqual(['local', 'remote'])
    expect(runtimeLocationsFor('desktop')).toEqual(['local', 'remote'])
  })

  it('resolves the complete Desktop compute capability matrix', () => {
    const capabilities = resolveComputeCapabilities('desktop', desktopHost)
    expect(capabilities).toEqual({
      localRuntime: true,
      remoteRuntime: true,
      environmentDiscovery: true,
      environmentManagement: true,
      ownedJupyterServer: true,
      manualLocalJupyter: true,
      remoteJupyter: true,
      jupyterHub: true,
      binderHub: true,
    })
    expect(runtimeLocationsForCapabilities(capabilities)).toEqual(['local', 'remote'])
  })

  it('resolves Local Web without pretending it can inspect local environments', () => {
    expect(resolveComputeCapabilities('local', webHost)).toEqual({
      localRuntime: true,
      remoteRuntime: true,
      environmentDiscovery: false,
      environmentManagement: false,
      ownedJupyterServer: false,
      manualLocalJupyter: true,
      remoteJupyter: true,
      jupyterHub: true,
      binderHub: true,
    })
  })

  it.each(['static', 'self-hosted'] as const)('resolves %s Web as remote-only', (mode) => {
    const capabilities = resolveComputeCapabilities(mode, webHost)
    expect(capabilities).toMatchObject({
      localRuntime: false,
      remoteRuntime: true,
      environmentDiscovery: false,
      environmentManagement: false,
      ownedJupyterServer: false,
      manualLocalJupyter: false,
      remoteJupyter: true,
      jupyterHub: true,
      binderHub: true,
    })
    expect(runtimeLocationsForCapabilities(capabilities)).toEqual(['remote'])
  })

  it('requires both the Desktop deployment and matching Host capabilities for native management', () => {
    expect(resolveComputeCapabilities('desktop', webHost)).toMatchObject({
      localRuntime: true,
      environmentDiscovery: false,
      environmentManagement: false,
      ownedJupyterServer: false,
    })
    expect(resolveComputeCapabilities('local', desktopHost)).toMatchObject({
      localRuntime: true,
      environmentDiscovery: false,
      environmentManagement: false,
      ownedJupyterServer: false,
    })
  })

  it('limits local manual connections to direct Jupyter', () => {
    expect(connectorKindsFor('local')).toEqual(['direct'])
    expect(connectorKindsFor('remote')).toEqual(['direct', 'jupyterhub', 'binderhub'])
  })

  it('separates loopback profiles from remote and LAN profiles', () => {
    expect(profileRuntimeLocation({ serverUrl: 'http://127.0.0.1:8888', connector: { kind: 'direct' } })).toBe('local')
    expect(profileRuntimeLocation({ serverUrl: 'https://jupyter.example.com', connector: { kind: 'direct' } })).toBe('remote')
    expect(profileRuntimeLocation({ serverUrl: 'https://hub.example.com', connector: { kind: 'jupyterhub' } })).toBe('remote')
  })
})
