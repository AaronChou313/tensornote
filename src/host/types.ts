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

export interface HostDirectorySelection {
  workspaceId: string
  name: string
  initialPath?: string
}

export interface HostAdapter {
  readonly id: HostKind
  readonly label: string
  readonly capabilities: HostCapabilities
  getPlatformInfo(): Promise<HostPlatformInfo>
  selectWorkspaceDirectory?(): Promise<HostDirectorySelection | null>
  restoreWorkspaceDirectory?(workspaceId: string): Promise<HostDirectorySelection>
  revealWorkspaceItem?(workspaceId: string, path?: string): Promise<void>
  takePendingWorkspaceOpen?(): Promise<HostDirectorySelection | null>
  onWorkspaceOpen?(listener: (selection: HostDirectorySelection) => void): Promise<() => void>
}
