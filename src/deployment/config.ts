import type { HostKind } from '../host/types'

export type WebDeploymentTarget = 'development' | 'static' | 'self-hosted'

export interface WebDeploymentConfig {
  target: WebDeploymentTarget
  router: 'browser' | 'hash'
  basePath: string
  pwa: boolean
}

export interface DeploymentAdapter {
  host: HostKind
  label: string
  web: WebDeploymentConfig
  publicReaderUrl: string
  publishedWorkspace?: { owner: string; repo: string; revision: string; noteId?: string }
}

interface DeploymentInput {
  /** Build target compatibility input. Product capability must never branch on it. */
  mode?: string
  host?: string
  basePath?: string
  pwa?: string
  publicReaderUrl?: string
  publishedOwner?: string
  publishedRepo?: string
  publishedRevision?: string
  publishedNote?: string
}

export function resolveDeploymentConfig(input: DeploymentInput = {}): DeploymentAdapter {
  const host: HostKind = input.host === 'desktop' || input.mode === 'desktop' ? 'desktop' : 'web'
  const target: WebDeploymentTarget = input.mode === 'static' ? 'static' : input.mode === 'self-hosted' ? 'self-hosted' : 'development'
  const publishedWorkspace = input.publishedOwner && input.publishedRepo && input.publishedRevision
    ? { owner: input.publishedOwner, repo: input.publishedRepo, revision: input.publishedRevision, ...(input.publishedNote ? { noteId: input.publishedNote } : {}) }
    : undefined
  return {
    host,
    label: host === 'desktop' ? 'TensorNote Desktop' : 'TensorNote Web',
    web: { target, router: target === 'static' || host === 'desktop' ? 'hash' : 'browser', basePath: input.basePath || '/', pwa: host === 'web' && input.pwa !== 'false' },
    publicReaderUrl: input.publicReaderUrl || 'https://aaronchou313.github.io/tensornote/',
    ...(publishedWorkspace ? { publishedWorkspace } : {}),
  }
}

export const deploymentAdapter = resolveDeploymentConfig({
  mode: import.meta.env.VITE_TENSORNOTE_DEPLOYMENT,
  host: import.meta.env.VITE_TENSORNOTE_HOST,
  basePath: import.meta.env.VITE_BASE_PATH,
  pwa: import.meta.env.VITE_TENSORNOTE_PWA,
  publicReaderUrl: import.meta.env.VITE_TENSORNOTE_PUBLIC_READER_URL,
  publishedOwner: import.meta.env.VITE_TENSORNOTE_PUBLISH_OWNER,
  publishedRepo: import.meta.env.VITE_TENSORNOTE_PUBLISH_REPO,
  publishedRevision: import.meta.env.VITE_TENSORNOTE_PUBLISH_REVISION,
  publishedNote: import.meta.env.VITE_TENSORNOTE_PUBLISH_NOTE,
})
