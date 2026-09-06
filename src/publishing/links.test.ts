import { describe, expect, it } from 'vitest'
import { createGitHubPublicationTargets, isPinnedGitHubRevision, parseTensorNoteDeepLink } from './links'

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
    expect(targets.compatibilityBadgeMarkdown).toContain('/v1.6.1/docs/PLATFORM_CONTRACTS.md')
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
