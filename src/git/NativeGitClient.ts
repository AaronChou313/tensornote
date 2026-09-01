import type { GitBridgeHealth, GitClient, GitDiff, GitHistoryEntry, GitStatus } from './types'

async function invokeNative<T>(command: string, args: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core')
  try {
    return await invoke<T>(command, args)
  } catch (reason) {
    throw new Error(reason instanceof Error ? reason.message : String(reason))
  }
}

export class NativeGitClient implements GitClient {
  constructor(readonly workspaceId: string) {}

  private args(extra: Record<string, unknown> = {}) {
    return { workspaceId: this.workspaceId, ...extra }
  }

  health() {
    return invokeNative<GitBridgeHealth>('native_git_health', this.args())
  }

  status() {
    return invokeNative<GitStatus>('native_git_status', this.args())
  }

  history(limit = 40) {
    return invokeNative<GitHistoryEntry[]>('native_git_history', this.args({ limit }))
  }

  diff(path: string, staged: boolean) {
    return invokeNative<GitDiff>('native_git_diff', this.args({ path, staged }))
  }

  stage(paths: string[], staged: boolean) {
    return invokeNative<GitStatus>('native_git_stage', this.args({ paths, staged }))
  }

  commit(message: string) {
    return invokeNative<GitStatus>('native_git_commit', this.args({ message }))
  }
}
