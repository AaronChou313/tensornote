export function normalizeWorkspacePath(path: string) {
  const parts: string[] = []
  for (const part of path.replace(/\\/g, '/').split('/')) {
    if (!part || part === '.') continue
    if (part === '..') parts.pop()
    else parts.push(part)
  }
  return parts.join('/')
}

export function dirname(path: string) {
  const normalized = normalizeWorkspacePath(path)
  return normalized.split('/').slice(0, -1).join('/')
}

export function basename(path: string) {
  return normalizeWorkspacePath(path).split('/').pop() ?? ''
}

export function joinWorkspacePath(...parts: string[]) {
  return normalizeWorkspacePath(parts.filter(Boolean).join('/'))
}

export function resolveWorkspacePath(fromDocument: string, target: string) {
  if (/^(?:[a-z]+:|\/\/|#)/i.test(target)) return target
  return joinWorkspacePath(dirname(fromDocument), decodeURIComponent(target))
}
