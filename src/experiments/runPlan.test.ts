import { describe, expect, it } from 'vitest'
import type { ExperimentManifest } from './types'
import { experimentWorkingDirectory, materializeExperimentSteps } from './runPlan'

const manifest = { parameters: { epochs: { default: 2 } }, presets: { smoke: { environment: 'base', title: 'Smoke', steps: ['train'], parameters: { epochs: 1 } } }, steps: { train: { title: 'Train', runner: 'python', file: 'train.py', args: ['--epochs', '${parameters.epochs}'], dependsOn: [], outputs: ['out'] } }, experiment: { workingDirectory: 'src' } } as unknown as ExperimentManifest
describe('experiment run plan', () => {
  it('materializes structured argv without shell strings', () => { expect(materializeExperimentSteps(manifest, 'smoke')[0].args).toEqual(['--epochs', '1']) })
  it('resolves the working directory beside the manifest', () => { expect(experimentWorkingDirectory(manifest, 'chapters/5/code/tensornote.experiment.yaml')).toBe('chapters/5/code/src') })
})
