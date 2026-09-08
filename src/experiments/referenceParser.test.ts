import { describe, expect, it } from 'vitest'
import { extractExperimentReferences, parseExperimentReference } from './referenceParser'

describe('experiment reference parser', () => {
  it('extracts declarative references without treating other fences as experiments', () => {
    const source = '```python\nprint(1)\n```\n\n```tensornote-experiment\nmanifest: ./code/tensornote.experiment.yaml\npreset: smoke\n```'
    expect(extractExperimentReferences(source)).toEqual([{ manifest: './code/tensornote.experiment.yaml', preset: 'smoke', sourceOffset: 24 }])
  })

  it('returns an invalid empty reference for deterministic diagnostics', () => {
    expect(extractExperimentReferences('```tensornote-experiment\n: bad\n```')[0]).toMatchObject({ manifest: '' })
  })

  it('parses the body used by a rendered Experiment Card', () => {
    expect(parseExperimentReference('manifest: ./实验/tensornote.experiment.yaml\npreset: cpu-smoke')).toMatchObject({ manifest: './实验/tensornote.experiment.yaml', preset: 'cpu-smoke', sourceOffset: 0 })
  })
})
