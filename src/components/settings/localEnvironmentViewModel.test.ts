import { describe, expect, it } from 'vitest'
import type { PythonEnvironment } from '../../host/types'
import { localEnvironmentViewModels } from './localEnvironmentViewModel'

const environment = (patch: Partial<PythonEnvironment> = {}): PythonEnvironment => ({ id: 'env', name: 'Project', manager: 'conda', pythonVersion: '3.11.9', pythonPath: '/env/bin/python', jupyterInstalled: true, ipykernelInstalled: true, managed: false, ...patch })

describe('localEnvironmentViewModels', () => {
  it('groups kernels and marks the active owned server as current', () => {
    const [item] = localEnvironmentViewModels({ environments: [environment()], kernels: [{ name: 'python3', displayName: 'Python 3', language: 'python', environmentId: 'env' }], servers: [{ id: 'server', environmentId: 'env', environmentName: 'Project', kernelName: 'python3', url: 'http://127.0.0.1:8888', port: 8888, status: 'running', owned: true, startedAt: 1 }], activeRuntimeServerId: 'server' })
    expect(item).toMatchObject({ status: 'current', statusLabel: '正在使用', managerLabel: 'Conda', path: '/env/bin/python' })
    expect(item.kernels).toHaveLength(1)
  })

  it('distinguishes ready, missing support, and unavailable environments', () => {
    const items = localEnvironmentViewModels({ environments: [environment({ id: 'ready' }), environment({ id: 'missing', jupyterInstalled: false, ipykernelInstalled: false }), environment({ id: 'broken', pythonPath: undefined, location: undefined, jupyterInstalled: false, ipykernelInstalled: false })], kernels: [], servers: [] })
    expect(items.map((item) => item.status)).toEqual(['ready', 'missing-jupyter', 'unavailable'])
  })
})
