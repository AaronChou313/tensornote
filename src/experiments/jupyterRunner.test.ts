import { describe, expect, it } from 'vitest'
import { jupyterStepCode, jupyterSupported, jupyterWorkspaceProbe } from './jupyterRunner'

describe('Jupyter experiment wrappers', () => {
  const step = { id: 'smoke', title: 'Smoke', runner: 'python', file: 'train.py', args: ['--name', 'hello world'], outputs: [] }
  it('builds a path probe without shell commands', () => {
    expect(jupyterWorkspaceProbe('/srv/repo', 'labs', [step])).toContain('TENSORNOTE_PATH_OK')
  })
  it('preserves argv boundaries', () => {
    const code = jupyterStepCode('/srv/repo', 'labs', step)
    expect(code).toContain('["--name","hello world"]')
    expect(code).toContain('runpy.run_path')
  })
  it('keeps torchrun outside the Jupyter subset', () => {
    expect(jupyterSupported({ ...step, runner: 'torchrun' })).toBe(false)
  })
})
