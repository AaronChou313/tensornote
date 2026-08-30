// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { buildCrashReport } from './RecoveryBoundary'

describe('crash recovery report', () => {
  it('captures actionable diagnostics without document content', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-30T12:00:00.000Z'))
    const report = buildCrashReport(new Error('render failed'), 'at NotePage')

    expect(report).toMatchObject({ version: 1, message: 'render failed', componentStack: 'at NotePage', occurredAt: '2026-08-30T12:00:00.000Z' })
    expect(JSON.stringify(report)).not.toContain('Markdown source')
    vi.useRealTimers()
  })
})
