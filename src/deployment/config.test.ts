import { describe, expect, it } from 'vitest'
import { resolveDeploymentConfig } from './config'

describe('deployment configuration', () => {
  it('uses full local web capabilities by default', () => {
    expect(resolveDeploymentConfig()).toMatchObject({ mode: 'local', router: 'browser', pwa: true, capabilities: { localDirectory: true, gitBridge: true, remoteWorkspace: true, serverWorkspace: false } })
  })

  it('uses hash routing and disables the local Git bridge in static mode', () => {
    expect(resolveDeploymentConfig({ mode: 'static' })).toMatchObject({ mode: 'static', router: 'hash', capabilities: { gitBridge: false } })
  })

  it('keeps self-hosted capability claims within the implemented browser runtime', () => {
    expect(resolveDeploymentConfig({ mode: 'self-hosted', pwa: 'false' })).toMatchObject({ mode: 'self-hosted', router: 'browser', pwa: false, capabilities: { remoteWorkspace: true, serverWorkspace: false } })
  })
})
