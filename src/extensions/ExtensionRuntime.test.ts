import { describe, expect, it, vi } from 'vitest'
import { CommandRegistry } from '../commands/CommandRegistry'
import { ExtensionRuntime } from './ExtensionRuntime'
import type { ExtensionAPI, ExtensionManifest, ExtensionPermission } from './types'

const manifest: ExtensionManifest = {
  id: 'demo.extension',
  name: 'Demo Extension',
  version: '1.0.0',
  minTensorNoteVersion: '0.6.0',
  permissions: ['workspace:read'],
}

function harness(granted: ExtensionPermission[] = []) {
  const commandRegistry = new CommandRegistry()
  const readText = vi.fn(async () => '# Note')
  const provider = { readText, list: vi.fn(async () => []) }
  const settings: Record<string, boolean | string> = {}
  const runtime = new ExtensionRuntime({
    commandRegistry,
    workspace: () => provider as never,
    hasPermission: (_id, permission) => granted.includes(permission),
    getSetting: (_id, key) => settings[key],
    setSetting: (_id, key, value) => { settings[key] = value },
  })
  return { runtime, commandRegistry, readText }
}

describe('ExtensionRuntime', () => {
  it('runs load, activate, deactivate, and dispose with owned contribution cleanup', async () => {
    const { runtime, commandRegistry } = harness()
    const lifecycle: string[] = []
    await runtime.install(manifest, {
      load: () => { lifecycle.push('load') },
      activate: (api) => {
        lifecycle.push('activate')
        api.commands.register({ id: 'demo.extension.hello', label: 'Hello', category: 'Extension', execute: () => undefined })
        api.views.register({ id: 'demo.extension.view', title: 'Demo', body: 'Hello' })
      },
      deactivate: () => { lifecycle.push('deactivate') },
      dispose: () => { lifecycle.push('dispose') },
    }, 'local')

    expect(runtime.list()[0].status).toBe('loaded')
    await runtime.activate(manifest.id)
    expect(commandRegistry.get('demo.extension.hello')).toBeDefined()
    expect(runtime.snapshot().views).toHaveLength(1)
    await runtime.deactivate(manifest.id)
    expect(commandRegistry.get('demo.extension.hello')).toBeUndefined()
    expect(runtime.snapshot().views).toHaveLength(0)
    await runtime.uninstall(manifest.id)
    expect(lifecycle).toEqual(['load', 'activate', 'deactivate', 'dispose'])
  })

  it('enforces declared and granted permissions at the API boundary', async () => {
    const denied = harness()
    let deniedApi: ExtensionAPI | undefined
    await denied.runtime.install(manifest, { activate: (api) => { deniedApi = api } }, 'local')
    await denied.runtime.activate(manifest.id)
    await expect(deniedApi?.workspace.readText('notes/demo.md')).rejects.toThrow('权限未授权')

    const allowed = harness(['workspace:read'])
    let allowedApi: ExtensionAPI | undefined
    await allowed.runtime.install(manifest, { activate: (api) => { allowedApi = api } }, 'local')
    await allowed.runtime.activate(manifest.id)
    await expect(allowedApi?.workspace.readText('notes/demo.md')).resolves.toBe('# Note')
    expect(allowed.readText).toHaveBeenCalledWith('notes/demo.md')
    expect(() => allowedApi?.network.fetch('https://example.com')).toThrow('未声明权限')
  })

  it('requires contribution ids to be namespaced by the extension id', async () => {
    const { runtime } = harness()
    await runtime.install(manifest, { activate: (api) => { api.views.register({ id: 'other.view', title: 'Bad', body: 'Bad' }) } }, 'local')
    await expect(runtime.activate(manifest.id)).rejects.toThrow('贡献 id 必须以 demo.extension. 开头')
    expect(runtime.list()[0].status).toBe('error')
    expect(runtime.snapshot().views).toHaveLength(0)
  })
})
