import { describe, expect, it } from 'vitest'
import { createGitHubPublicationTargets, createGitHubReaderUrl, createRemoteOpenPath, createRemoteReaderUrl, isPinnedGitHubRevision, parseRemoteRoute, parseTensorNoteDeepLink } from './links'

const revision = '0123456789abcdef0123456789abcdef01234567'

describe('publication links', () => {
  it('creates reproducible Web, repository, archive, fork, badge, and Desktop targets', () => {
    const targets = createGitHubPublicationTargets('https://example.github.io/tensornote/', { owner: 'demo', repo: 'course', revision, noteId: 'start here' })

    expect(targets.webUrl).toBe(`https://example.github.io/tensornote/#/open/github/demo/course?ref=${revision}&note=start+here`)
    expect(targets.desktopUrl).toBe(`tensornote://open/github/demo/course?ref=${revision}&note=start+here`)
    expect(targets.repositoryUrl).toBe('https://github.com/demo/course')
    expect(targets.forkUrl).toBe('https://github.com/demo/course/fork')
    expect(targets.downloadUrl).toBe(`https://github.com/demo/course/archive/${revision}.zip`)
    expect(targets.badgeMarkdown).toContain(targets.webUrl)
    expect(targets.compatibilityBadgeMarkdown).toContain('TensorNote%20Workspace-v1')
    expect(targets.compatibilityBadgeMarkdown).toContain('/v2.1.0/docs/PLATFORM_CONTRACTS.md')
  })

  it('requires a complete immutable commit revision', () => {
    expect(isPinnedGitHubRevision(revision)).toBe(true)
    expect(isPinnedGitHubRevision('main')).toBe(false)
    expect(() => createGitHubPublicationTargets('https://example.com', { owner: 'demo', repo: 'course', revision: 'main' })).toThrow('full Git commit')
    expect(() => createGitHubPublicationTargets('https://example.com', { owner: '..', repo: 'course', revision })).toThrow('Invalid GitHub repository')
    expect(() => createGitHubPublicationTargets('https://example.com', { owner: 'demo', repo: 'x'.repeat(101), revision })).toThrow('Invalid GitHub repository')
  })

  it('parses only the bounded TensorNote GitHub deep-link format', () => {
    expect(parseTensorNoteDeepLink(`tensornote://open/github/demo/course?ref=${revision}&note=intro`)).toEqual({ owner: 'demo', repo: 'course', revision, noteId: 'intro' })
    expect(parseTensorNoteDeepLink('tensornote://open/local/tmp?ref=main')).toBeNull()
    expect(parseTensorNoteDeepLink(`https://open/github/demo/course?ref=${revision}`)).toBeNull()
    expect(parseTensorNoteDeepLink(`tensornote://open/github/demo/course?ref=${revision}&note=${'x'.repeat(513)}`)).toBeNull()
  })
})

it('creates a default-branch reader link without carrying page credentials or state', () => {
  expect(createGitHubReaderUrl('https://example.org/tensornote/?token=private#/notes/old', 'demo', 'course')).toBe('https://example.org/tensornote/#/open/github/demo/course')
  expect(() => createGitHubReaderUrl('https://example.org', '..', 'course')).toThrow()
  expect(() => createGitHubReaderUrl('https://example.org', 'demo', 'course/other')).toThrow()
})

it('creates and parses generic remote reader links', () => {
  const source = { provider: 'gitlab' as const, project: 'group/sub/project', repositoryUrl: 'https://gitlab.com/group/sub/project', ref: 'main', revision: 'd'.repeat(40), noteId: 'self attention' }
  const moving = createRemoteReaderUrl('https://example.org/tensornote/', source)
  expect(moving).toContain('provider=gitlab')
  expect(moving).toContain('note=self+attention')
  expect(moving).not.toContain('revision=')
  const pinned = createRemoteOpenPath(source, true)
  expect(pinned).toContain(`revision=${'d'.repeat(40)}`)
  expect(parseRemoteRoute(new URLSearchParams(pinned.split('?')[1]))).toMatchObject({ provider: 'gitlab', project: 'group/sub/project', ref: 'main', revision: 'd'.repeat(40) })
  expect(parseRemoteRoute(new URLSearchParams('provider=gitee&project=owner/repo&revision=main'))).toBeNull()
  expect(parseRemoteRoute(new URLSearchParams('provider=github&project=owner/%2E%2E'))).toBeNull()
})
