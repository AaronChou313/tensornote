import { describe, expect, it } from 'vitest'
import { createHostAdapter, getHostAdapter, installHostAdapter, resolveHostKind } from './runtime'

describe('host adapter runtime', () => {
  it('uses the web host for missing and unknown host modes', () => {
    expect(resolveHostKind()).toBe('web')
    expect(resolveHostKind('future-host')).toBe('web')
  })

  it('creates a capability-safe web adapter', async () => {
    const adapter = await createHostAdapter({ kind: 'web', webLabel: 'Static Web' })
    expect(adapter).toMatchObject({ id: 'web', label: 'Static Web' })
    expect(adapter.capabilities).toEqual({
      desktopShell: false,
      nativeFilesystem: false,
      environmentDiscovery: false,
      processManagement: false,
      nativeGit: false,
      fileAssociations: false,
      autoUpdate: false,
    })
    await expect(adapter.getPlatformInfo()).resolves.toEqual({ os: 'browser', arch: 'unknown', family: 'web' })
  })

  it('loads the desktop adapter without claiming future native capabilities', async () => {
    const adapter = await createHostAdapter({ kind: 'desktop', webLabel: 'Local Web' })
    expect(adapter).toMatchObject({ id: 'desktop', label: 'Desktop' })
    expect(adapter.capabilities.desktopShell).toBe(true)
    expect(adapter.capabilities.nativeFilesystem).toBe(false)
    expect(adapter.capabilities.environmentDiscovery).toBe(false)
    expect(adapter.capabilities.processManagement).toBe(false)
  })

  it('installs the adapter used by product surfaces', async () => {
    const adapter = await createHostAdapter({ kind: 'web', webLabel: 'Self-hosted Web' })
    installHostAdapter(adapter)
    expect(getHostAdapter()).toBe(adapter)
  })
})
