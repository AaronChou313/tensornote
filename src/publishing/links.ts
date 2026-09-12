export interface GitHubPublicationSource {
  owner: string
  repo: string
  revision: string
  noteId?: string
}

import { remoteRepositoryUrl, type RemoteRepositoryLocation } from '../workspace/remote'

export interface PublicationTargets {
  webUrl: string
  desktopUrl: string
  repositoryUrl: string
  forkUrl: string
  downloadUrl: string
  badgeMarkdown: string
  compatibilityBadgeMarkdown: string
}

const repositorySegment = /^[a-z0-9_.-]+$/i
const pinnedRevision = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i
const maximumRepositorySegmentLength = 100
const maximumNoteIdLength = 512

function isRepositorySegment(value: string) {
  return value.length <= maximumRepositorySegmentLength && value !== '.' && value !== '..' && repositorySegment.test(value)
}

function assertSource(source: GitHubPublicationSource) {
  if (!isRepositorySegment(source.owner) || !isRepositorySegment(source.repo)) throw new Error('Invalid GitHub repository')
  if (!pinnedRevision.test(source.revision)) throw new Error('A full Git commit revision is required')
  if (source.noteId && (source.noteId.length > maximumNoteIdLength || source.noteId.includes('\0'))) throw new Error('Invalid note identifier')
}

export function createGitHubOpenPath(source: GitHubPublicationSource) {
  assertSource(source)
  const params = new URLSearchParams({ ref: source.revision })
  if (source.noteId) params.set('note', source.noteId)
  return `/open/github/${encodeURIComponent(source.owner)}/${encodeURIComponent(source.repo)}?${params}`
}

export function isPinnedGitHubRevision(value?: string): value is string {
  return Boolean(value && pinnedRevision.test(value))
}

/** A moving reader link; opening still resolves a commit and requires revision trust. */
export function createGitHubReaderUrl(appUrl: string, owner: string, repo: string) {
  if (!isRepositorySegment(owner) || !isRepositorySegment(repo)) throw new Error('Invalid GitHub repository')
  const url = new URL(appUrl)
  url.search = ''
  url.hash = `/open/github/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
  return url.toString()
}

export function createRemoteOpenPath(source: RemoteRepositoryLocation & { noteId?: string }, pinRevision = false) {
  const params = new URLSearchParams({ provider: source.provider, project: source.project })
  if (source.ref) params.set('ref', source.ref)
  if (pinRevision && source.revision) params.set('revision', source.revision)
  if (source.noteId) params.set('note', source.noteId)
  return `/open/remote?${params.toString()}`
}

export function createRemoteReaderUrl(appUrl: string, source: RemoteRepositoryLocation & { noteId?: string }, pinRevision = false) {
  const url = new URL(appUrl)
  url.search = ''
  url.hash = createRemoteOpenPath(source, pinRevision)
  return url.toString()
}

export function parseRemoteRoute(params: URLSearchParams): RemoteRepositoryLocation | null {
  const provider = params.get('provider')
  const project = params.get('project')?.trim().replace(/^\/+|\/+$/g, '')
  if ((provider !== 'github' && provider !== 'gitlab' && provider !== 'gitee') || !project || project.length > 500 || project.includes('\\')) return null
  const segments = project.split('/').filter(Boolean)
  if ((provider === 'github' || provider === 'gitee') && segments.length !== 2) return null
  if (provider === 'gitlab' && segments.length < 2) return null
  if (segments.some((segment) => !isRepositorySegment(segment))) return null
  const ref = params.get('ref') || undefined
  const revision = params.get('revision') || undefined
  if (ref && (ref.length > 256 || [...ref].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127))) return null
  if (revision && !pinnedRevision.test(revision)) return null
  return { provider, project, repositoryUrl: remoteRepositoryUrl(provider, project), ...(ref ? { ref } : {}), ...(revision ? { revision } : {}) }
}

export function createGitHubPublicationTargets(appUrl: string, source: GitHubPublicationSource): PublicationTargets {
  assertSource(source)
  const base = new URL(appUrl)
  base.hash = createGitHubOpenPath(source)
  const repositoryUrl = `https://github.com/${encodeURIComponent(source.owner)}/${encodeURIComponent(source.repo)}`
  const webUrl = base.toString()
  const desktopParams = new URLSearchParams({ ref: source.revision })
  if (source.noteId) desktopParams.set('note', source.noteId)
  const desktopUrl = `tensornote://open/github/${encodeURIComponent(source.owner)}/${encodeURIComponent(source.repo)}?${desktopParams}`
  return {
    webUrl,
    desktopUrl,
    repositoryUrl,
    forkUrl: `${repositoryUrl}/fork`,
    downloadUrl: `${repositoryUrl}/archive/${encodeURIComponent(source.revision)}.zip`,
    badgeMarkdown: `[![Open in TensorNote](https://img.shields.io/badge/Open%20in-TensorNote-5a8f69?logo=markdown)](${webUrl})`,
    compatibilityBadgeMarkdown: `[![TensorNote Workspace v1](https://img.shields.io/badge/TensorNote%20Workspace-v1-5a8f69)](https://github.com/AaronChou313/tensornote/blob/v${TENSORNOTE_VERSION}/docs/PLATFORM_CONTRACTS.md)`,
  }
}

export function parseTensorNoteDeepLink(value: string): GitHubPublicationSource | null {
  try {
    const url = new URL(value)
    const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent)
    const revision = url.searchParams.get('ref') ?? ''
    if (url.protocol !== 'tensornote:' || url.hostname !== 'open' || parts[0] !== 'github' || parts.length !== 3) return null
    const source = { owner: parts[1], repo: parts[2], revision, ...(url.searchParams.get('note') ? { noteId: url.searchParams.get('note')! } : {}) }
    assertSource(source)
    return source
  } catch {
    return null
  }
}
import { TENSORNOTE_VERSION } from '../version'
