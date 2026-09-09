import { describe, expect, it } from 'vitest'
import type { ExperimentManifest } from './types'
import { isExperimentRequirementsFile, resolveExperimentEnvironmentFiles } from './environment'

const manifest = { environments: { base: { python: '3.11', files: ['requirements-base.txt'] }, training: { python: '3.11', extends: 'base', files: ['requirements-training.txt'] } } } as unknown as ExperimentManifest

describe('experiment environment files', () => {
  it('resolves inherited dependency files relative to the manifest', () => {
    expect(resolveExperimentEnvironmentFiles(manifest, '课程/代码/tensornote.experiment.yaml', 'training')).toEqual(['课程/代码/requirements-base.txt', '课程/代码/requirements-training.txt'])
  })

  it('accepts only requirements text files for direct installation', () => {
    expect(isExperimentRequirementsFile('chapter/requirements.txt')).toBe(true)
    expect(isExperimentRequirementsFile('chapter/requirements-gpu.TXT')).toBe(true)
    expect(isExperimentRequirementsFile('chapter/environment.yml')).toBe(false)
    expect(isExperimentRequirementsFile('chapter/pyproject.toml')).toBe(false)
  })
})
