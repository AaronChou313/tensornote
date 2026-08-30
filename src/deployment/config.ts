export type DeploymentMode = 'static' | 'local' | 'self-hosted'

export interface DeploymentAdapter {
  mode: DeploymentMode
  label: string
  router: 'browser' | 'hash'
  pwa: boolean
  capabilities: {
    localDirectory: boolean
    gitBridge: boolean
    remoteWorkspace: boolean
    serverWorkspace: boolean
  }
}

export function resolveDeploymentConfig(input: { mode?: string; pwa?: string } = {}): DeploymentAdapter {
  const mode: DeploymentMode = input.mode === 'static' || input.mode === 'self-hosted' ? input.mode : 'local'
  return {
    mode,
    label: mode === 'static' ? 'Static Web' : mode === 'self-hosted' ? 'Self-hosted Web' : 'Local Web',
    router: mode === 'static' ? 'hash' : 'browser',
    pwa: input.pwa !== 'false',
    capabilities: {
      localDirectory: true,
      gitBridge: mode === 'local',
      remoteWorkspace: true,
      serverWorkspace: false,
    },
  }
}

export const deploymentAdapter = resolveDeploymentConfig({
  mode: import.meta.env.VITE_TENSORNOTE_DEPLOYMENT,
  pwa: import.meta.env.VITE_TENSORNOTE_PWA,
})
