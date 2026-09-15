import type { WorkspaceSourceType } from './types'

export type RemoteProviderKind = 'github' | 'gitlab' | 'gitee'

export interface RemoteRepositoryLocation {
  provider: RemoteProviderKind
  project: string
  repositoryUrl: string
  ref?: string
  revision?: string
}

const HOSTS: Record<RemoteProviderKind, string> = {
  github: 'github.com',
  gitlab: 'gitlab.com',
  gitee: 'gitee.com',
}

export function remoteRepositoryUrl(provider: RemoteProviderKind, project: string) {
  return `https://${HOSTS[provider]}/${project}`
}

export const REMOTE_PROVIDER_LABELS: Record<RemoteProviderKind, string> = {
  github: 'GitHub',
  gitlab: 'GitLab',
  gitee: 'Gitee',
}

export function isRemoteWorkspaceSource(type: WorkspaceSourceType): type is RemoteProviderKind {
  return type === 'github' || type === 'gitlab' || type === 'gitee'
}

export function detectRemoteProvider(value: string): RemoteProviderKind | null {
  try {
    const url = new URL(value.trim())
    return (Object.entries(HOSTS).find(([, host]) => url.protocol === 'https:' && url.hostname.toLowerCase() === host)?.[0] as RemoteProviderKind | undefined) ?? null
  } catch {
    return null
  }
}

export function parseRemoteRepositoryUrl(value: string, expectedProvider?: RemoteProviderKind): RemoteRepositoryLocation {
  let url: URL
  try {
    url = new URL(value.trim())
  } catch {
    throw new Error('请输入完整的公开仓库 HTTPS URL')
  }
  if (url.protocol !== 'https:') throw new Error('仓库地址必须使用 HTTPS')
  const provider = detectRemoteProvider(url.toString())
  if (!provider) throw new Error('仅支持 github.com、gitlab.com 和 gitee.com 的公开仓库')
  if (expectedProvider && provider !== expectedProvider) throw new Error(`该地址属于 ${REMOTE_PROVIDER_LABELS[provider]}，与当前选择的来源不一致`)
  if (url.search || url.hash || url.username || url.password || url.port) throw new Error('请输入仓库首页地址，不要包含参数、锚点或凭据')
  const parts = url.pathname.replace(/^\/+|\/+$/g, '').replace(/\.git$/i, '').split('/').filter(Boolean)
  const validLength = provider === 'gitlab' ? parts.length >= 2 : parts.length === 2
  if (!validLength || parts.some((part) => part === '.' || part === '..')) throw new Error('仓库地址格式不正确')
  const project = parts.join('/')
  return { provider, project, repositoryUrl: remoteRepositoryUrl(provider, project) }
}

export function formatWorkspaceSource(type: WorkspaceSourceType) {
  if (type === 'local') return '本地'
  if (isRemoteWorkspaceSource(type)) return REMOTE_PROVIDER_LABELS[type]
  return '知识库'
}
