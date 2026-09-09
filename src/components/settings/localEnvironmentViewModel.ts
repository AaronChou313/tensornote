import type { OwnedJupyterServer, PythonEnvironment, RuntimeKernel } from '../../host/types'

export type LocalEnvironmentStatus = 'current' | 'running' | 'ready' | 'missing-jupyter' | 'unavailable'

export interface LocalEnvironmentViewModel {
  environment: PythonEnvironment
  kernels: RuntimeKernel[]
  server?: OwnedJupyterServer
  status: LocalEnvironmentStatus
  statusLabel: string
  managerLabel: string
  path: string
}

export function localEnvironmentViewModels(input: {
  environments: PythonEnvironment[]
  kernels: RuntimeKernel[]
  servers: OwnedJupyterServer[]
  activeRuntimeServerId?: string
}): LocalEnvironmentViewModel[] {
  return input.environments.map((environment) => {
    const kernels = input.kernels.filter((kernel) => kernel.environmentId === environment.id)
    const server = input.servers.find((item) => item.environmentId === environment.id)
    const current = Boolean(server && input.activeRuntimeServerId && server.id === input.activeRuntimeServerId)
    const status: LocalEnvironmentStatus = current
      ? 'current'
      : server
        ? 'running'
        : environment.jupyterInstalled && environment.ipykernelInstalled
          ? 'ready'
          : environment.pythonPath || environment.location
            ? 'missing-jupyter'
            : 'unavailable'
    return {
      environment,
      kernels,
      server,
      status,
      statusLabel: current ? '正在使用' : server ? '运行中' : status === 'ready' ? 'Jupyter 就绪' : status === 'missing-jupyter' ? '缺少 Jupyter' : '不可用',
      managerLabel: environment.manager === 'conda' ? 'Conda' : environment.manager === 'venv' ? 'Python venv' : environment.manager === 'uv' ? 'uv' : '系统 Python',
      path: environment.pythonPath || environment.location || '路径信息不可用',
    }
  })
}
