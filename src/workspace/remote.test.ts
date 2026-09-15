import { describe, expect, it } from 'vitest'
import { detectRemoteProvider, formatWorkspaceSource, parseRemoteRepositoryUrl } from './remote'

describe('remote repository URLs', () => {
  it.each([
    ['https://github.com/foo/bar', 'github', 'foo/bar'],
    ['https://github.com/foo/bar.git', 'github', 'foo/bar'],
    ['https://gitlab.com/foo/bar', 'gitlab', 'foo/bar'],
    ['https://gitlab.com/foo/group/bar.git/', 'gitlab', 'foo/group/bar'],
    ['https://gitee.com/foo/bar.git', 'gitee', 'foo/bar'],
  ] as const)('parses %s', (url, provider, project) => expect(parseRemoteRepositoryUrl(url)).toMatchObject({ provider, project }))

  it.each(['http://github.com/foo/bar', 'https://example.com/foo/bar', 'javascript:alert(1)', '', 'https://github.com/foo'])('rejects %s', (url) => expect(() => parseRemoteRepositoryUrl(url)).toThrow())
  it('detects providers and catches an explicit mismatch', () => {
    expect(detectRemoteProvider('https://gitee.com/a/b')).toBe('gitee')
    expect(() => parseRemoteRepositoryUrl('https://gitlab.com/a/b', 'github')).toThrow('与当前选择的来源不一致')
    expect(formatWorkspaceSource('local')).toBe('本地')
  })
})
