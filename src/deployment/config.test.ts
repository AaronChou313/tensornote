import { describe, expect, it } from 'vitest'
import { resolveDeploymentConfig } from './config'

describe('deployment configuration', () => {
  it('models development as Web deployment metadata', () => {
    expect(resolveDeploymentConfig()).toMatchObject({ host: 'web', label: 'TensorNote Web', web: { target: 'development', router: 'browser', basePath: '/', pwa: true } })
  })

  it('keeps static and self-hosted as Web deployment choices', () => {
    expect(resolveDeploymentConfig({ mode: 'static', basePath: '/notes/' })).toMatchObject({ host: 'web', web: { target: 'static', router: 'hash', basePath: '/notes/' } })
    expect(resolveDeploymentConfig({ mode: 'self-hosted', pwa: 'false' })).toMatchObject({ host: 'web', web: { target: 'self-hosted', router: 'browser', pwa: false } })
  })

  it('models Desktop as a host without Web product capabilities', () => {
    expect(resolveDeploymentConfig({ mode: 'desktop' })).toMatchObject({ host: 'desktop', label: 'TensorNote Desktop', web: { router: 'hash', pwa: false } })
  })

  it('exposes complete repository-owned publication only', () => {
    expect(resolveDeploymentConfig({ publishedOwner: 'demo', publishedRepo: 'course', publishedRevision: '0123456789abcdef0123456789abcdef01234567', publishedNote: 'start' }).publishedWorkspace)
      .toEqual({ owner: 'demo', repo: 'course', revision: '0123456789abcdef0123456789abcdef01234567', noteId: 'start' })
    expect(resolveDeploymentConfig({ publishedOwner: 'demo' }).publishedWorkspace).toBeUndefined()
  })
})
