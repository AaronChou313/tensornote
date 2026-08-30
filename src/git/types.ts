export type GitChangeKind = 'modified' | 'added' | 'deleted' | 'renamed' | 'copied' | 'untracked' | 'conflicted'

export interface GitChange {
  path: string
  originalPath?: string
  indexStatus: string
  worktreeStatus: string
  staged: boolean
  unstaged: boolean
  kind: GitChangeKind
}

export interface GitStatus {
  branch: string
  head: string
  upstream?: string
  ahead: number
  behind: number
  detached: boolean
  clean: boolean
  changes: GitChange[]
}

export interface GitHistoryEntry {
  hash: string
  shortHash: string
  author: string
  authoredAt: string
  subject: string
}

export interface GitBridgeHealth {
  version: string
  workspaceName: string
  repositoryRoot: string
}

export interface GitDiff {
  path: string
  staged: boolean
  patch: string
}
