import { describe, expect, it } from 'vitest'
import { formatComputeDiagnosticReport } from './compatibility'
import type { ComputeProfile } from './types'

describe('compute diagnostic report', () => {
  it('includes compatibility context without URL credentials or query secrets', () => {
    const profile: ComputeProfile = {
      id: 'remote',
      name: 'Remote',
      kind: 'jupyter',
      serverUrl: 'https://user:password@example.org/base/?token=secret#fragment',
      kernelName: 'python3',
      scope: 'workspace',
      connector: { kind: 'jupyterhub', serverName: 'tensornote' },
    }
    const report = formatComputeDiagnosticReport(profile, [{ id: 'server', label: 'Server', status: 'pass', detail: 'Reachable' }], 'https://reader.example.org')
    expect(report).toContain('Connector: jupyterhub')
    expect(report).toContain('Server: https://example.org/base/')
    expect(report).not.toContain('password')
    expect(report).not.toContain('secret')
  })
})
