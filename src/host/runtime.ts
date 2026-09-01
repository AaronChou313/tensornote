import { WebHostAdapter } from './WebHostAdapter'
import type { HostAdapter, HostKind } from './types'

type DesktopAdapterModule = typeof import('./TauriHostAdapter')

const packagedDesktopAdapterLoader: (() => Promise<DesktopAdapterModule>) | undefined =
  import.meta.env.VITE_TENSORNOTE_HOST === 'desktop'
    ? () => import('./TauriHostAdapter')
    : undefined

let activeHostAdapter: HostAdapter = new WebHostAdapter('Web')

export function resolveHostKind(value?: string): HostKind {
  return value === 'desktop' ? 'desktop' : 'web'
}

export async function createHostAdapter(input: {
  kind?: string
  webLabel: string
  desktopAdapterLoader?: () => Promise<DesktopAdapterModule>
}): Promise<HostAdapter> {
  if (resolveHostKind(input.kind) === 'desktop') {
    const loadDesktopAdapter = input.desktopAdapterLoader ?? packagedDesktopAdapterLoader
    if (!loadDesktopAdapter) throw new Error('Desktop host adapter is not included in this Web build')
    const { TauriHostAdapter } = await loadDesktopAdapter()
    return new TauriHostAdapter()
  }
  return new WebHostAdapter(input.webLabel)
}

export function installHostAdapter(adapter: HostAdapter) {
  activeHostAdapter = adapter
}

export function getHostAdapter() {
  return activeHostAdapter
}
