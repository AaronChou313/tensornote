export type HostKind = 'web' | 'desktop'

export interface HostCapabilities {
  desktopShell: boolean
  nativeFilesystem: boolean
  environmentDiscovery: boolean
  processManagement: boolean
  nativeGit: boolean
  fileAssociations: boolean
  autoUpdate: boolean
}

export interface HostPlatformInfo {
  os: string
  arch: string
  family: string
}

export interface HostAdapter {
  readonly id: HostKind
  readonly label: string
  readonly capabilities: HostCapabilities
  getPlatformInfo(): Promise<HostPlatformInfo>
}
