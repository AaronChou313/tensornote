import type { HostAdapter, HostCapabilities, HostPlatformInfo } from './types'

const desktopCapabilities: HostCapabilities = {
  desktopShell: true,
  nativeFilesystem: false,
  environmentDiscovery: false,
  processManagement: false,
  nativeGit: false,
  fileAssociations: false,
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
}
