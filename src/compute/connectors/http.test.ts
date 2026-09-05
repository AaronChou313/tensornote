import { describe, expect, it, vi } from 'vitest'
import { normalizeServiceUrl, readJsonEventStream, serviceUrl } from './http'

describe('remote compute HTTP helpers', () => {
  it('normalizes root and prefixed JupyterHub URLs', () => {
    expect(normalizeServiceUrl('https://hub.example.org/hub/').toString()).toBe('https://hub.example.org/')
    expect(serviceUrl('https://hub.example.org/prefix/', 'hub/api/user')).toBe('https://hub.example.org/prefix/hub/api/user')
  })

  it('parses chunked JSON event streams and ignores comments', async () => {
    const values: Array<{ phase: string }> = []
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(': heartbeat\n\ndata: {"phase":"build'))
        controller.enqueue(encoder.encode('ing"}\n\ndata: {"phase":"ready"}\n\n'))
        controller.close()
      },
    })
    await readJsonEventStream(new Response(stream), (value: { phase: string }) => values.push(value))
    expect(values).toEqual([{ phase: 'building' }, { phase: 'ready' }])
  })

  it('rejects failed event streams before reading', async () => {
    await expect(readJsonEventStream(new Response('', { status: 503 }), vi.fn())).rejects.toThrow('HTTP 503')
  })
})
