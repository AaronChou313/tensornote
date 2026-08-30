import type { CommandRegistry } from '../commands/CommandRegistry'
import type { WorkspaceProvider } from '../workspace/types'
import type {
  ComputeProviderContribution,
  ExtensionAPI,
  ExtensionContributionSnapshot,
  ExtensionManifest,
  ExtensionModule,
  ExtensionPermission,
  ExtensionRecord,
  ExtensionSource,
  ExtensionViewContribution,
  MarkdownProcessor,
  SidebarItemContribution,
  StatusBarItemContribution,
  WorkspaceProviderContribution,
  ExtensionSetting,
} from './types'
import { validateExtensionManifest } from './manifest'
import { TENSORNOTE_VERSION } from './constants'

interface ExtensionRuntimeHost {
  commandRegistry: CommandRegistry
  workspace: () => WorkspaceProvider | null
  hasPermission: (extensionId: string, permission: ExtensionPermission) => boolean
  getSetting: (extensionId: string, key: string) => boolean | string | undefined
  setSetting: (extensionId: string, key: string, value: boolean | string) => void
}

interface InternalRecord extends ExtensionRecord {
  module: ExtensionModule
  disposables: Set<() => void>
}

const emptyContributions = (): ExtensionContributionSnapshot => ({
  views: [], sidebarItems: [], markdownProcessors: [], editorExtensions: [], settings: [], statusBarItems: [], workspaceProviders: [], computeProviders: [],
})

export class ExtensionRuntime {
  private records = new Map<string, InternalRecord>()
  private contributions = emptyContributions()
  private listeners = new Set<() => void>()
  private revision = 0
  private activeView: (ExtensionViewContribution & { extensionId: string }) | null = null

  constructor(private readonly host: ExtensionRuntimeHost) {}

  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener) }
  getRevision = () => this.revision
  list = (): ExtensionRecord[] => [...this.records.values()].map(({ manifest, source, status, error }) => ({ manifest, source, status, error }))
  snapshot = () => this.contributions
  getActiveView = () => this.activeView

  async install(inputManifest: ExtensionManifest, module: ExtensionModule, source: ExtensionSource) {
    const manifest = validateExtensionManifest(inputManifest, TENSORNOTE_VERSION)
    if (this.records.has(manifest.id)) throw new Error(`扩展 ${manifest.id} 已安装`)
    const record: InternalRecord = { manifest, module, source, status: 'loaded', disposables: new Set() }
    this.records.set(manifest.id, record)
    try {
      await module.load?.()
    } catch (reason) {
      record.status = 'error'
      record.error = reason instanceof Error ? reason.message : '扩展加载失败'
      this.notify()
      throw reason
    }
    this.notify()
  }

  async activate(extensionId: string) {
    const record = this.requireRecord(extensionId)
    if (record.status === 'active') return
    record.error = undefined
    try {
      await record.module.activate(this.createApi(record))
      record.status = 'active'
    } catch (reason) {
      this.disposeContributions(record)
      record.status = 'error'
      record.error = reason instanceof Error ? reason.message : '扩展激活失败'
      this.notify()
      throw reason
    }
    this.notify()
  }

  async deactivate(extensionId: string) {
    const record = this.requireRecord(extensionId)
    if (record.status !== 'active' && record.status !== 'error') return
    try { await record.module.deactivate?.() } finally {
      this.disposeContributions(record)
      record.status = 'disabled'
      record.error = undefined
      if (this.activeView?.extensionId === extensionId) this.activeView = null
      this.notify()
    }
  }

  async uninstall(extensionId: string) {
    const record = this.requireRecord(extensionId)
    try {
      if (record.status === 'active' || record.status === 'error') await this.deactivate(extensionId)
    } finally {
      try { await record.module.dispose?.() } finally {
        this.disposeContributions(record)
        this.records.delete(extensionId)
        this.notify()
      }
    }
  }

  async disposeAll() {
    for (const id of [...this.records.keys()]) await this.uninstall(id)
  }

  closeActiveView() { this.activeView = null; this.notify() }

  private requireRecord(id: string) {
    const record = this.records.get(id)
    if (!record) throw new Error(`扩展 ${id} 未安装`)
    return record
  }

  private requirePermission(record: InternalRecord, permission: ExtensionPermission) {
    if (!record.manifest.permissions?.includes(permission)) throw new Error(`扩展未声明权限：${permission}`)
    if (!this.host.hasPermission(record.manifest.id, permission)) throw new Error(`扩展权限未授权：${permission}`)
  }

  private addContribution<K extends keyof ExtensionContributionSnapshot>(record: InternalRecord, key: K, contribution: ExtensionContributionSnapshot[K][number]) {
    const list = this.contributions[key] as Array<ExtensionContributionSnapshot[K][number]>
    list.push(contribution)
    const dispose = () => {
      const index = list.indexOf(contribution)
      if (index >= 0) list.splice(index, 1)
      record.disposables.delete(dispose)
      this.notify()
    }
    record.disposables.add(dispose)
    this.notify()
    return dispose
  }

  private createApi(record: InternalRecord): ExtensionAPI {
    const extensionId = record.manifest.id
    const own = <T extends { id: string }>(value: T) => {
      if (!value.id.startsWith(`${extensionId}.`)) throw new Error(`贡献 id 必须以 ${extensionId}. 开头`)
      return { ...value, extensionId }
    }
    return {
      extensionId,
      commands: { register: (command) => {
        const remove = this.host.commandRegistry.register(own(command))
        record.disposables.add(remove)
        return remove
      } },
      views: {
        register: (view) => this.addContribution(record, 'views', own(view)),
        open: (id) => {
          const view = this.contributions.views.find((item) => item.extensionId === extensionId && item.id === id)
          if (!view) throw new Error(`扩展 View 不存在：${id}`)
          this.activeView = view
          this.notify()
        },
      },
      sidebar: { register: (item: SidebarItemContribution) => this.addContribution(record, 'sidebarItems', own(item)) },
      markdown: { registerProcessor: (id: string, process: MarkdownProcessor) => this.addContribution(record, 'markdownProcessors', own({ id, process })) },
      editor: { registerExtension: (id, extension) => this.addContribution(record, 'editorExtensions', own({ id, extension })) },
      settings: {
        register: (setting: ExtensionSetting) => this.addContribution(record, 'settings', { ...setting, extensionId }),
        get: (key, fallback) => (this.host.getSetting(extensionId, key) ?? fallback) as typeof fallback,
        set: (key, value) => { this.host.setSetting(extensionId, key, value); this.notify() },
      },
      statusBar: { register: (item: StatusBarItemContribution) => this.addContribution(record, 'statusBarItems', own(item)) },
      workspace: {
        readText: async (path) => { this.requirePermission(record, 'workspace:read'); const provider = this.host.workspace(); if (!provider) throw new Error('没有打开的 Workspace'); return provider.readText(path) },
        list: async (path) => { this.requirePermission(record, 'workspace:read'); const provider = this.host.workspace(); if (!provider) throw new Error('没有打开的 Workspace'); return provider.list(path) },
        writeText: async (path, content) => { this.requirePermission(record, 'workspace:write'); const provider = this.host.workspace(); if (!provider?.writeText) throw new Error('当前 Workspace 不可写'); await provider.writeText(path, content) },
        registerProvider: (provider: WorkspaceProviderContribution) => { this.requirePermission(record, 'workspace:read'); return this.addContribution(record, 'workspaceProviders', own(provider)) },
      },
      network: { fetch: (input, init) => { this.requirePermission(record, 'network'); return fetch(input, init) } },
      compute: { registerProvider: (provider: ComputeProviderContribution) => { this.requirePermission(record, 'compute'); return this.addContribution(record, 'computeProviders', own(provider)) } },
      secrets: {
        get: (key) => { this.requirePermission(record, 'secret'); return sessionStorage.getItem(`tensornote:extension:${extensionId}:${key}`) },
        set: (key, value) => { this.requirePermission(record, 'secret'); sessionStorage.setItem(`tensornote:extension:${extensionId}:${key}`, value) },
        delete: (key) => { this.requirePermission(record, 'secret'); sessionStorage.removeItem(`tensornote:extension:${extensionId}:${key}`) },
      },
    }
  }

  private disposeContributions(record: InternalRecord) {
    for (const dispose of [...record.disposables]) dispose()
    record.disposables.clear()
  }

  private notify() { this.revision += 1; this.listeners.forEach((listener) => listener()) }
}
