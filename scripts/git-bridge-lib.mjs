import { execFile } from 'node:child_process'
import { basename, resolve, sep } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const maxOutput = 2 * 1024 * 1024

function changeKind(indexStatus, worktreeStatus) {
  const statuses = `${indexStatus}${worktreeStatus}`
  if (statuses.includes('U') || statuses === 'AA' || statuses === 'DD') return 'conflicted'
  if (statuses.includes('R')) return 'renamed'
  if (statuses.includes('C')) return 'copied'
  if (statuses.includes('D')) return 'deleted'
  if (statuses.includes('A')) return 'added'
  return 'modified'
}

export function parsePorcelainV2(source) {
  const records = source.split('\0')
  const changes = []
  let branch = ''
  let head = ''
  let upstream
  let ahead = 0
  let behind = 0

  for (let index = 0; index < records.length; index += 1) {
    const record = records[index]
    if (!record) continue
    if (record.startsWith('# branch.oid ')) head = record.slice(13)
    else if (record.startsWith('# branch.head ')) branch = record.slice(14)
    else if (record.startsWith('# branch.upstream ')) upstream = record.slice(18)
    else if (record.startsWith('# branch.ab ')) {
      const match = record.match(/^# branch\.ab \+(\d+) -(\d+)$/)
      if (match) {
        ahead = Number(match[1])
        behind = Number(match[2])
      }
    } else if (record.startsWith('? ')) {
      changes.push({
        path: record.slice(2),
        indexStatus: '?',
        worktreeStatus: '?',
        staged: false,
        unstaged: true,
        kind: 'untracked',
      })
    } else if (record.startsWith('1 ')) {
      const match = record.match(/^1 ([^ ]{2}) (?:[^ ]+ ){6}(.+)$/)
      if (!match) continue
      const [indexStatus, worktreeStatus] = match[1]
      changes.push({
        path: match[2],
        indexStatus,
        worktreeStatus,
        staged: indexStatus !== '.',
        unstaged: worktreeStatus !== '.',
        kind: changeKind(indexStatus, worktreeStatus),
      })
    } else if (record.startsWith('2 ')) {
      const match = record.match(/^2 ([^ ]{2}) (?:[^ ]+ ){7}(.+)$/)
      if (!match) continue
      const [indexStatus, worktreeStatus] = match[1]
      const originalPath = records[index + 1]
      index += 1
      changes.push({
        path: match[2],
        originalPath,
        indexStatus,
        worktreeStatus,
        staged: indexStatus !== '.',
        unstaged: worktreeStatus !== '.',
        kind: changeKind(indexStatus, worktreeStatus),
      })
    } else if (record.startsWith('u ')) {
      const match = record.match(/^u ([^ ]{2}) (?:[^ ]+ ){8}(.+)$/)
      if (!match) continue
      const [indexStatus, worktreeStatus] = match[1]
      changes.push({
        path: match[2],
        indexStatus,
        worktreeStatus,
        staged: indexStatus !== '.',
        unstaged: worktreeStatus !== '.',
        kind: 'conflicted',
      })
    }
  }

  return {
    branch: branch === '(detached)' ? head.slice(0, 12) : branch,
    head,
    upstream,
    ahead,
    behind,
    detached: branch === '(detached)',
    clean: changes.length === 0,
    changes,
  }
}

export function parseHistory(source) {
  return source.split('\x1e').filter(Boolean).map((record) => {
    const [hash, shortHash, author, authoredAt, subject] = record.replace(/^\n/, '').split('\x1f')
    return { hash, shortHash, author, authoredAt, subject }
  }).filter((entry) => entry.hash && entry.subject)
}

export function validateRepositoryPaths(paths) {
  if (!Array.isArray(paths) || paths.length === 0 || paths.length > 200) throw new Error('至少选择一个有效文件')
  return paths.map((path) => {
    if (typeof path !== 'string' || !path || path.includes('\0') || path.startsWith('/') || path.startsWith('\\')) throw new Error('Git 路径无效')
    const segments = path.replaceAll('\\', '/').split('/')
    if (segments.some((segment) => segment === '..' || segment === '')) throw new Error('Git 路径不能越过 Workspace 根目录')
    return segments.join('/')
  })
}

export class GitCommandError extends Error {
  constructor(message, details = '') {
    super(message)
    this.name = 'GitCommandError'
    this.details = details
  }
}

export function createGitService(workspaceRoot) {
  const root = resolve(workspaceRoot)
  const run = async (args, options = {}) => {
    try {
      const result = await execFileAsync('git', args, {
        cwd: root,
        encoding: 'utf8',
        maxBuffer: maxOutput,
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
        ...options,
      })
      return result.stdout
    } catch (reason) {
      const stderr = typeof reason?.stderr === 'string' ? reason.stderr.trim() : ''
      throw new GitCommandError(stderr || 'Git 命令执行失败', stderr)
    }
  }

  const assertRepository = async () => {
    const topLevel = (await run(['rev-parse', '--show-toplevel'])).trim()
    const resolvedTopLevel = resolve(topLevel)
    if (resolvedTopLevel !== root) throw new Error(`配置目录不是仓库根目录：${root}`)
    return resolvedTopLevel
  }

  const status = async () => parsePorcelainV2(await run(['status', '--porcelain=v2', '--branch', '--untracked-files=all', '-z']))

  return {
    root,
    workspaceName: basename(root),
    assertRepository,
    status,
    async history(limit = 40) {
      const safeLimit = Math.min(Math.max(Number(limit) || 40, 1), 100)
      const hasHead = await run(['rev-parse', '--verify', 'HEAD']).then(() => true).catch(() => false)
      if (!hasHead) return []
      const output = await run(['log', `--max-count=${safeLimit}`, '--date=iso-strict', '--pretty=format:%H%x1f%h%x1f%an%x1f%aI%x1f%s%x1e'])
      return parseHistory(output)
    },
    async diff(path, staged = false) {
      const [safePath] = validateRepositoryPaths([path])
      const args = ['diff', '--no-ext-diff', '--no-textconv', '--no-color', '--unified=3']
      if (staged) args.push('--cached')
      args.push('--', safePath)
      return run(args)
    },
    async stage(paths, staged) {
      const safePaths = validateRepositoryPaths(paths)
      if (staged) await run(['add', '--all', '--', ...safePaths])
      else {
        try {
          await run(['restore', '--staged', '--', ...safePaths])
        } catch (reason) {
          const hasHead = await run(['rev-parse', '--verify', 'HEAD']).then(() => true).catch(() => false)
          if (hasHead) throw reason
          await run(['rm', '--cached', '-r', '--ignore-unmatch', '--', ...safePaths])
        }
      }
      return status()
    },
    async commit(message) {
      const normalized = typeof message === 'string' ? message.trim() : ''
      if (!normalized || normalized.length > 200 || normalized.includes('\0') || normalized.includes('\n')) {
        throw new Error('提交说明必须为 1–200 个字符的单行文本')
      }
      const current = await status()
      if (!current.changes.some((change) => change.staged)) throw new Error('没有已暂存的改动')
      const disabledHooksPath = process.platform === 'win32' ? 'NUL' : '/dev/null'
      await run(['-c', `core.hooksPath=${disabledHooksPath}`, '-c', 'commit.gpgSign=false', 'commit', '-m', normalized])
      return status()
    },
  }
}

export function isPathInside(root, candidate) {
  const normalizedRoot = resolve(root)
  const normalizedCandidate = resolve(candidate)
  return normalizedCandidate === normalizedRoot || normalizedCandidate.startsWith(`${normalizedRoot}${sep}`)
}
