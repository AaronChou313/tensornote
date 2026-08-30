import { describe, expect, it, vi } from 'vitest'
import { ComputeRuntime, computeScopeKey } from './ComputeRuntime'
import type { ComputeProfile, ComputeProvider, ComputeSession } from './types'

const profile: ComputeProfile = {
  id: 'local-python',
  name: 'Local Python',
  kind: 'jupyter',
  serverUrl: 'http://127.0.0.1:8888',
  kernelName: 'tensornote',
  scope: 'note',
}

function providerHarness() {
  const sessions: Array<ComputeSession & { shutdown: ReturnType<typeof vi.fn> }> = []
  const provider: ComputeProvider = {
    id: 'mock',
    kind: 'jupyter',
    label: 'Mock',
    onStatus: vi.fn(),
    connect: vi.fn(async () => undefined),
    disconnect: vi.fn(async () => undefined),
    listKernels: vi.fn(async () => []),
    diagnose: vi.fn(async () => []),
    createSession: vi.fn(async () => {
      const session = {
        id: `session-${sessions.length + 1}`,
        status: 'idle' as const,
        execute: vi.fn(async () => undefined),
        interrupt: vi.fn(async () => undefined),
        restart: vi.fn(async () => undefined),
        shutdown: vi.fn(async () => undefined),
      }
      sessions.push(session)
      return session
    }),
  }
  return { provider, sessions }
}

const handlers = { onOutput: vi.fn(), onExecutionCount: vi.fn() }

describe('ComputeRuntime', () => {
  it('keys note, workspace, and manual sessions predictably', () => {
    expect(computeScopeKey(profile, { workspaceId: 'demo', noteId: 'intro' })).toBe('note:demo:intro')
    expect(computeScopeKey({ ...profile, scope: 'workspace' }, { workspaceId: 'demo', noteId: 'intro' })).toBe('workspace:demo')
    expect(computeScopeKey({ ...profile, scope: 'manual' }, { workspaceId: 'demo', noteId: 'intro' })).toBe('manual:demo')
  })

  it('reuses a note session until the note changes', async () => {
    const harness = providerHarness()
    const runtime = new ComputeRuntime(() => harness.provider)
    const first = { workspaceId: 'demo', noteId: 'intro' }

    await runtime.execute(profile, 'token', first, '1 + 1', handlers)
    await runtime.execute(profile, 'token', first, '2 + 2', handlers)
    expect(harness.provider.createSession).toHaveBeenCalledTimes(1)

    await runtime.handleContextChange(profile, { workspaceId: 'demo', noteId: 'next' })
    expect(harness.sessions[0].shutdown).toHaveBeenCalledTimes(1)
    expect(runtime.connected).toBe(false)
  })

  it('keeps workspace and manual sessions alive across note navigation', async () => {
    for (const scope of ['workspace', 'manual'] as const) {
      const harness = providerHarness()
      const runtime = new ComputeRuntime(() => harness.provider)
      const scopedProfile = { ...profile, scope }
      await runtime.execute(scopedProfile, '', { workspaceId: 'demo', noteId: 'one' }, '1', handlers)
      await runtime.handleContextChange(scopedProfile, { workspaceId: 'demo', noteId: 'two' })

      expect(runtime.connected).toBe(true)
      expect(harness.sessions[0].shutdown).not.toHaveBeenCalled()
      await runtime.shutdown()
    }
  })

  it('shuts down when the active profile connection changes', async () => {
    const harness = providerHarness()
    const runtime = new ComputeRuntime(() => harness.provider)
    const context = { workspaceId: 'demo', noteId: 'intro' }
    await runtime.execute(profile, '', context, '1', handlers)

    await runtime.handleContextChange({ ...profile, kernelName: 'python3' }, context)
    expect(harness.sessions[0].shutdown).toHaveBeenCalledTimes(1)
    expect(runtime.connected).toBe(false)
  })
})
