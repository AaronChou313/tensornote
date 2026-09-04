import { describe, expect, it } from 'vitest'
import { resolveDeploymentConfig } from './config'

describe('deployment configuration', () => {
  it('uses full local web capabilities by default', () => {
    expect(resolveDeploymentConfig()).toMatchObject({ mode: 'local', router: 'browser', pwa: true, publicReaderUrl: 'https://aaronchou313.github.io/tensornote/', capabilities: { localDirectory: true, gitBridge: true, remoteWorkspace: true, serverWorkspace: false } })
  })

  it('uses hash routing and disables the local Git bridge in static mode', () => {
    expect(resolveDeploymentConfig({ mode: 'static' })).toMatchObject({ mode: 'static', router: 'hash', capabilities: { gitBridge: false } })
  })

  it('exposes a complete repository-owned publication without inferring partial input', () => {
    expect(resolveDeploymentConfig({
      mode: 'static',
      publishedOwner: 'demo',
      publishedRepo: 'course',
      publishedRevision: '0123456789abcdef0123456789abcdef01234567',
      publishedNote: 'start',
    }).publishedWorkspace).toEqual({ owner: 'demo', repo: 'course', revision: '0123456789abcdef0123456789abcdef01234567', noteId: 'start' })
    expect(resolveDeploymentConfig({ mode: 'static', publishedOwner: 'demo' }).publishedWorkspace).toBeUndefined()
  })

  it('keeps self-hosted capability claims within the implemented browser runtime', () => {
    expect(resolveDeploymentConfig({ mode: 'self-hosted', pwa: 'false' })).toMatchObject({ mode: 'self-hosted', router: 'browser', pwa: false, capabilities: { remoteWorkspace: true, serverWorkspace: false } })
  })

  it('uses hash routing and only claims implemented capabilities in desktop mode', () => {
    expect(resolveDeploymentConfig({ mode: 'desktop' })).toEqual({
      mode: 'desktop',
      label: 'Desktop',
      router: 'hash',
      pwa: false,
      publicReaderUrl: 'https://aaronchou313.github.io/tensornote/',
      capabilities: {
        localDirectory: false,
        gitBridge: false,
        remoteWorkspace: true,
        serverWorkspace: false,
      },
    })
  })
})
