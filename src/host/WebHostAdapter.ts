import type { HostAdapter, HostCapabilities, HostPlatformInfo } from './types'

const webCapabilities: HostCapabilities = {
  desktopShell: false,
  nativeFilesystem: false,
  environmentDiscovery: false,
  processManagement: false,
  nativeGit: false,
  fileAssociations: false,
  autoUpdate: false,
}

export class WebHostAdapter implements HostAdapter {
  readonly id = 'web' as const
  readonly capabilities = webCapabilities

  constructor(readonly label: string) {}

  async getPlatformInfo(): Promise<HostPlatformInfo> {
    return { os: 'browser', arch: 'unknown', family: 'web' }
  }
}
