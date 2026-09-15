import type { RemoteRepositoryLocation } from '../remote'
import { GiteeWorkspaceProvider } from './GiteeWorkspaceProvider'
import { GitHubWorkspaceProvider } from './GitHubWorkspaceProvider'
import { GitLabWorkspaceProvider } from './GitLabWorkspaceProvider'

export function createRemoteWorkspaceProvider(location: RemoteRepositoryLocation) {
  const ref = location.revision || location.ref
  if (location.provider === 'github') {
    const [owner, repo] = location.project.split('/')
    return new GitHubWorkspaceProvider(owner, repo, ref)
  }
  if (location.provider === 'gitlab') return new GitLabWorkspaceProvider(location.project, ref)
  return new GiteeWorkspaceProvider(location.project, ref)
}
