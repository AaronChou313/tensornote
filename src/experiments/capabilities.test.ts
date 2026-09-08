import { describe, expect, it } from 'vitest'
import { describeExperimentCapability } from './capabilities'
import type { ExperimentManifest, IndexedExperiment } from './types'
import type { HostCapabilities } from '../host/types'
import type { WorkspaceSession } from '../workspace/types'

const host: HostCapabilities = { desktopShell: true, nativeFilesystem: true, environmentDiscovery: true, processManagement: true, nativeGit: true, fileAssociations: true, autoUpdate: true }
const manifest: ExperimentManifest = { schemaVersion: 1, experiment: { id: 'demo', title: 'Demo', workingDirectory: '.', difficulty: 'basic' }, environments: { base: { python: '3.11', files: [] } }, presets: { smoke: { title: 'Smoke', environment: 'base', steps: [], parameters: {} } }, defaultPreset: 'smoke', steps: {}, parameters: {}, resources: {}, artifacts: {} }
const experiment: IndexedExperiment = { key: 'note:1', noteId: 'note', notePath: 'note.md', manifestPath: 'tensornote.experiment.yaml', manifest, diagnostics: [], readOnly: false }
const session = { trusted: true, compatibility: { readOnly: false } } as WorkspaceSession

describe('experiment capability summary', () => {
  it('blocks invalid experiments before platform capability checks', () => {
    const result = describeExperimentCapability({ experiment: { ...experiment, manifest: undefined, diagnostics: [{ severity: 'error', code: 'bad', message: 'bad' }] }, session, host, deploymentMode: 'desktop', executionEnabled: true })
    expect(result).toMatchObject({ availability: 'invalid', canInspect: true, canRun: false })
  })

  it('keeps GitHub revisions gated by trust', () => {
    const result = describeExperimentCapability({ experiment, session: { ...session, trusted: false }, host, deploymentMode: 'desktop', executionEnabled: true })
    expect(result.availability).toBe('needs-trust')
  })

  it('describes online reading without claiming browser process support', () => {
    const result = describeExperimentCapability({ experiment, session, host: { ...host, desktopShell: false, processManagement: false }, deploymentMode: 'static', executionEnabled: true })
    expect(result).toMatchObject({ availability: 'preview', platform: 'Online Web', canRun: false })
    expect(result.detail).toContain('安全阅读')
  })
})
