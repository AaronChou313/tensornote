import { describe, expect, it } from 'vitest'
import { connectorKindsFor, profileRuntimeLocation, runtimeLocationsFor, supportsConvenientLocalRuntime } from './runtimeSettings'

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
