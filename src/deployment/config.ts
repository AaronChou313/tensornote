export type DeploymentMode = 'static' | 'local' | 'self-hosted' | 'desktop'

export interface DeploymentAdapter {
  mode: DeploymentMode
  label: string
  router: 'browser' | 'hash'
  pwa: boolean
  publicReaderUrl: string
  capabilities: {
    localDirectory: boolean
    gitBridge: boolean
    remoteWorkspace: boolean
    serverWorkspace: boolean
  }
  publishedWorkspace?: {
    owner: string
    repo: string
    revision: string
    noteId?: string
  }
}

export function resolveDeploymentConfig(input: { mode?: string; pwa?: string; publicReaderUrl?: string; publishedOwner?: string; publishedRepo?: string; publishedRevision?: string; publishedNote?: string } = {}): DeploymentAdapter {
  const mode: DeploymentMode = input.mode === 'static' || input.mode === 'self-hosted' || input.mode === 'desktop' ? input.mode : 'local'
  const desktop = mode === 'desktop'
  const publishedWorkspace = input.publishedOwner && input.publishedRepo && input.publishedRevision
    ? { owner: input.publishedOwner, repo: input.publishedRepo, revision: input.publishedRevision, ...(input.publishedNote ? { noteId: input.publishedNote } : {}) }
    : undefined
  return {
    mode,
    label: mode === 'static' ? 'Static Web' : mode === 'self-hosted' ? 'Self-hosted Web' : desktop ? 'Desktop' : 'Local Web',
    router: mode === 'static' || desktop ? 'hash' : 'browser',
    pwa: !desktop && input.pwa !== 'false',
    publicReaderUrl: input.publicReaderUrl || 'https://aaronchou313.github.io/tensornote/',
    capabilities: {
      localDirectory: !desktop,
      gitBridge: mode === 'local',
      remoteWorkspace: true,
      serverWorkspace: false,
    },
    ...(publishedWorkspace ? { publishedWorkspace } : {}),
  }
}

export const deploymentAdapter = resolveDeploymentConfig({
  mode: import.meta.env.VITE_TENSORNOTE_DEPLOYMENT,
  pwa: import.meta.env.VITE_TENSORNOTE_PWA,
  publicReaderUrl: import.meta.env.VITE_TENSORNOTE_PUBLIC_READER_URL,
  publishedOwner: import.meta.env.VITE_TENSORNOTE_PUBLISH_OWNER,
  publishedRepo: import.meta.env.VITE_TENSORNOTE_PUBLISH_REPO,
  publishedRevision: import.meta.env.VITE_TENSORNOTE_PUBLISH_REVISION,
  publishedNote: import.meta.env.VITE_TENSORNOTE_PUBLISH_NOTE,
})
