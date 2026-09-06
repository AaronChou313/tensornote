import { WorkspaceNotFoundError, type WorkspaceProvider } from './types'

export async function ensureWorkspacePathMissing(provider: Pick<WorkspaceProvider, 'stat'>, path: string) {
  try {
    await provider.stat(path)
  } catch (reason) {
    // Keep compatibility with v1 providers that predate the optional typed error.
    if (reason instanceof WorkspaceNotFoundError || reason instanceof Error && /not found/i.test(reason.message)) return
    throw reason
  }
  throw new Error(`目标路径已存在：${path}`)
}
