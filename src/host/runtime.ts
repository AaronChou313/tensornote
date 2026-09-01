import { WebHostAdapter } from './WebHostAdapter'
import type { HostAdapter, HostKind } from './types'

let activeHostAdapter: HostAdapter = new WebHostAdapter('Web')

export function resolveHostKind(value?: string): HostKind {
  return value === 'desktop' ? 'desktop' : 'web'
}

export async function createHostAdapter(input: { kind?: string; webLabel: string }): Promise<HostAdapter> {
  if (resolveHostKind(input.kind) === 'desktop') {
    const { TauriHostAdapter } = await import('./TauriHostAdapter')
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
