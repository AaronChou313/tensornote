// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { ComputeCapabilities } from '../../compute/runtimeSettings'
import { ComputeOverview } from './ComputeOverview'

const localWeb: ComputeCapabilities = { localRuntime: true, remoteRuntime: true, environmentDiscovery: false, environmentManagement: false, ownedJupyterServer: false, manualLocalJupyter: true, remoteJupyter: true, jupyterHub: true, binderHub: true }

afterEach(cleanup)

describe('ComputeOverview', () => {
  it('does not report zero local environments in Local Web', () => {
    render(<ComputeOverview capabilities={localWeb} platformLabel="Local Web" discovering={false} activeComputeName="Local Jupyter" kernelStatus="offline" />)
    expect(screen.getByText('不可直接检测')).toBeTruthy()
    expect(screen.queryByText('0')).toBeNull()
  })

  it('shows Desktop environment and kernel counts', () => {
    render(<ComputeOverview capabilities={{ ...localWeb, environmentDiscovery: true, environmentManagement: true, ownedJupyterServer: true }} platformLabel="Desktop" discovering={false} activeComputeName="TensorNote Python 3.12" kernelStatus="idle" discovery={{ tools: [], environments: [{ id: 'py', name: 'Python', manager: 'uv', pythonVersion: '3.12.7', jupyterInstalled: true, ipykernelInstalled: true, managed: true }], kernels: [{ name: 'python3', displayName: 'Python 3', language: 'python', environmentId: 'py' }], servers: [], warnings: [] }} />)
    expect(screen.getByText('TensorNote Python 3.12')).toBeTruthy()
    expect(screen.getAllByText('1')).toHaveLength(2)
    expect(screen.getByText('已连接')).toBeTruthy()
  })

  it('describes Online as remote-only', () => {
    render(<ComputeOverview capabilities={{ ...localWeb, localRuntime: false, manualLocalJupyter: false }} platformLabel="Static Web" discovering={false} activeComputeName="Remote Server" kernelStatus="offline" />)
    expect(screen.getByText('远程计算')).toBeTruthy()
    expect(screen.queryByText('Python 环境')).toBeNull()
  })
})
