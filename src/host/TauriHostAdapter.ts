import type {
  EnvironmentPlan,
  EnvironmentPlanRequest,
  HostAdapter,
  HostCapabilities,
  HostDirectorySelection,
  HostPlatformInfo,
  JupyterServerLaunch,
  OwnedJupyterServer,
  RuntimeDiscovery,
  RuntimeLogLine,
  RuntimeOperation,
} from './types'

const desktopCapabilities: HostCapabilities = {
  desktopShell: true,
  nativeFilesystem: true,
  environmentDiscovery: true,
  processManagement: true,
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

  async discoverLocalRuntime(workspaceId?: string): Promise<RuntimeDiscovery> {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke<RuntimeDiscovery>('local_runtime_discover', { workspaceId })
  }

  async planLocalEnvironment(request: EnvironmentPlanRequest): Promise<EnvironmentPlan> {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke<EnvironmentPlan>('local_runtime_plan_environment', { request })
  }

  async applyLocalEnvironment(planId: string, confirmation: string): Promise<RuntimeOperation> {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke<RuntimeOperation>('local_runtime_apply_environment', { planId, confirmation })
  }

  async getLocalRuntimeOperation(operationId: string): Promise<RuntimeOperation> {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke<RuntimeOperation>('local_runtime_operation', { operationId })
  }

  async cancelLocalRuntimeOperation(operationId: string): Promise<RuntimeOperation> {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke<RuntimeOperation>('local_runtime_cancel_operation', { operationId })
  }

  async startOwnedJupyter(environmentId: string, workspaceId: string | undefined, origin: string): Promise<JupyterServerLaunch> {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke<JupyterServerLaunch>('local_runtime_start_jupyter', { environmentId, workspaceId, origin })
  }

  async listOwnedJupyter(): Promise<OwnedJupyterServer[]> {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke<OwnedJupyterServer[]>('local_runtime_owned_servers')
  }

  async getOwnedJupyterLogs(serverId: string): Promise<RuntimeLogLine[]> {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke<RuntimeLogLine[]>('local_runtime_server_logs', { serverId })
  }

  async stopOwnedJupyter(serverId: string): Promise<void> {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('local_runtime_stop_jupyter', { serverId })
  }
}
