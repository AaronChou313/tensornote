import { describe, expect, it } from 'vitest'
import type { ExperimentManifest } from './types'
import { resolveExperimentEnvironmentFiles } from './environment'

const manifest = { environments: { base: { python: '3.11', files: ['requirements-base.txt'] }, training: { python: '3.11', extends: 'base', files: ['requirements-training.txt'] } } } as unknown as ExperimentManifest

describe('experiment environment files', () => {
  it('resolves inherited dependency files relative to the manifest', () => {
    expect(resolveExperimentEnvironmentFiles(manifest, '课程/代码/tensornote.experiment.yaml', 'training')).toEqual(['课程/代码/requirements-base.txt', '课程/代码/requirements-training.txt'])
  })
})
