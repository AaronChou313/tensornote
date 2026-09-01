import type { HostAdapter, HostCapabilities, HostDirectorySelection, HostPlatformInfo } from './types'

const desktopCapabilities: HostCapabilities = {
  desktopShell: true,
  nativeFilesystem: true,
  environmentDiscovery: false,
  processManagement: false,
  nativeGit: true,
  fileAssociations: true,
  autoUpdate: false,
}

export class TauriHostAdapter implements HostAdapter {
  readonly id = 'desktop' as const
  readonly label = 'Desktop'
  readonly capabilities = desktopCapabilities

  async getPlatformInfo(): Promise<HostPlatformInfo> {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke<HostPlatformInfo>('platform_info')
  }

  async selectWorkspaceDirectory(): Promise<HostDirectorySelection | null> {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke<HostDirectorySelection | null>('select_native_workspace')
  }

  async restoreWorkspaceDirectory(workspaceId: string): Promise<HostDirectorySelection> {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke<HostDirectorySelection>('reopen_native_workspace', { workspaceId })
  }

  async revealWorkspaceItem(workspaceId: string, path?: string): Promise<void> {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('reveal_native_workspace', { workspaceId, path })
  }

  async takePendingWorkspaceOpen(): Promise<HostDirectorySelection | null> {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke<HostDirectorySelection | null>('take_pending_native_workspace')
  }

  async onWorkspaceOpen(listener: (selection: HostDirectorySelection) => void): Promise<() => void> {
    const { listen } = await import('@tauri-apps/api/event')
    return listen<HostDirectorySelection>('native-workspace-open', (event) => listener(event.payload))
  }
}
