export interface GitHubPublicationSource {
  owner: string
  repo: string
  revision: string
  noteId?: string
}

export interface PublicationTargets {
  webUrl: string
  desktopUrl: string
  repositoryUrl: string
  forkUrl: string
  downloadUrl: string
  badgeMarkdown: string
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
