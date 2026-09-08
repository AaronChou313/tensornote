import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseExperimentManifest } from './schema'

const minimal = readFileSync('fixtures/experiments/minimal/tensornote.experiment.yaml', 'utf8')

describe('experiment manifest v1', () => {
  it('parses the published minimal fixture', () => {
    const result = parseExperimentManifest(minimal)
    expect(result.diagnostics).toEqual([])
    expect(result.manifest?.experiment.id).toBe('hello-project')
    expect(result.manifest?.steps.hello.runner).toBe('python')
  })

  it('rejects path traversal before normalization', () => {
    const source = readFileSync('fixtures/experiments/invalid/path-escape.yaml', 'utf8')
    const result = parseExperimentManifest(source)
    expect(result.readOnly).toBe(true)
    expect(result.diagnostics.some((item) => item.code === 'path')).toBe(true)
  })

  it('rejects cyclic environment inheritance and step graphs', () => {
    const source = minimal
      .replace("files: [requirements.txt]", "extends: second\n    files: [requirements.txt]\n  second:\n    python: '3.11'\n    extends: default\n    files: []")
      .replace('file: hello.py', 'file: hello.py\n    dependsOn: [hello]')
    const result = parseExperimentManifest(source)
    expect(result.diagnostics.map((item) => item.code)).toEqual(expect.arrayContaining(['environment-cycle', 'step-cycle']))
  })

  it('downgrades a future schema to read-only without interpreting fields', () => {
    const result = parseExperimentManifest('schemaVersion: 2\nexperiment: {}')
    expect(result).toMatchObject({ sourceVersion: 2, readOnly: true })
    expect(result.manifest).toBeUndefined()
    expect(result.diagnostics[0].code).toBe('future-schema')
  })
})
