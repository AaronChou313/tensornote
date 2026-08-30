import { createContext, useContext, useSyncExternalStore } from 'react'
import type { ExtensionRuntime } from './ExtensionRuntime'

export const ExtensionRuntimeContext = createContext<ExtensionRuntime | null>(null)
const emptySnapshot = { views: [], sidebarItems: [], markdownProcessors: [], editorExtensions: [], settings: [], statusBarItems: [], workspaceProviders: [], computeProviders: [] }
const subscribeNever = () => () => undefined
const zeroRevision = () => 0

export function useExtensionRuntime() {
  const runtime = useContext(ExtensionRuntimeContext)
  if (!runtime) throw new Error('ExtensionRuntimeContext is missing')
  return runtime
}

export function useExtensionSnapshot() {
  const runtime = useContext(ExtensionRuntimeContext)
  useSyncExternalStore(runtime?.subscribe ?? subscribeNever, runtime?.getRevision ?? zeroRevision, runtime?.getRevision ?? zeroRevision)
  return runtime?.snapshot() ?? emptySnapshot
}

export function useExtensionRecords() {
  const runtime = useExtensionRuntime()
  useSyncExternalStore(runtime.subscribe, runtime.getRevision, runtime.getRevision)
  return runtime.list()
}

export function useActiveExtensionView() {
  const runtime = useExtensionRuntime()
  useSyncExternalStore(runtime.subscribe, runtime.getRevision, runtime.getRevision)
  return runtime.getActiveView()
}
