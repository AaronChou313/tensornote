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

  it('loads the desktop adapter with bounded local runtime capabilities', async () => {
    const adapter = await createHostAdapter({
      kind: 'desktop',
      webLabel: 'Local Web',
      desktopAdapterLoader: () => import('./TauriHostAdapter'),
    })
    expect(adapter).toMatchObject({ id: 'desktop', label: 'Desktop' })
    expect(adapter.capabilities.desktopShell).toBe(true)
    expect(adapter.capabilities.nativeFilesystem).toBe(true)
    expect(adapter.capabilities.nativeGit).toBe(true)
    expect(adapter.capabilities.fileAssociations).toBe(true)
    expect(adapter.capabilities.environmentDiscovery).toBe(true)
    expect(adapter.capabilities.processManagement).toBe(true)
    expect(adapter.capabilities.autoUpdate).toBe(true)
    expect(adapter.discoverLocalRuntime).toBeTypeOf('function')
    expect(adapter.startOwnedJupyter).toBeTypeOf('function')
    expect(adapter.checkForUpdate).toBeTypeOf('function')
    expect(adapter.downloadAndInstallUpdate).toBeTypeOf('function')
  })

  it('fails closed when a Web build is asked to start as Desktop', async () => {
    await expect(createHostAdapter({ kind: 'desktop', webLabel: 'Static Web' })).rejects.toThrow(
      'Desktop host adapter is not included',
    )
  })

  it('installs the adapter used by product surfaces', async () => {
    const adapter = await createHostAdapter({ kind: 'web', webLabel: 'Self-hosted Web' })
    installHostAdapter(adapter)
    expect(getHostAdapter()).toBe(adapter)
  })
})
