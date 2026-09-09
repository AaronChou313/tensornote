import { describe, expect, it } from 'vitest'
import { createBinderExperimentTarget } from './binder'

describe('Binder experiment target', () => {
  it('pins the launch URL to the resolved commit and notebook', () => {
    const session = { descriptor: { type: 'github', revision: 'a'.repeat(40), config: { owner: 'acme', repo: 'course' } }, environmentFiles: [{ path: 'requirements.txt', exists: true }] } as never
    const experiment = { manifestPath: 'labs/tensornote.experiment.yaml', manifest: { experiment: { workingDirectory: '.' }, steps: { demo: { runner: 'notebook', file: 'demo.ipynb' } } } } as never
    const target = createBinderExperimentTarget(session, experiment)
    expect(target?.configured).toBe(true)
    expect(target?.url).toContain(`/acme/course/${'a'.repeat(40)}`)
    expect(decodeURIComponent(target!.url)).toContain('lab/tree/labs/demo.ipynb')
  })

  it('does not create moving or local launch links', () => {
    expect(createBinderExperimentTarget({ descriptor: { type: 'github', revision: 'main', config: { owner: 'a', repo: 'b' } } } as never, {} as never)).toBeNull()
  })
})
