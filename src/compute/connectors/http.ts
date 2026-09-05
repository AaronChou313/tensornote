import type { ComputeConnectionEvent, ComputeConnectorKind } from '../types'

export function normalizeServiceUrl(value: string) {
  const parsed = new URL(value.trim())
  parsed.hash = ''
  parsed.search = ''
  parsed.pathname = `${parsed.pathname.replace(/\/+$/, '').replace(/\/hub$/, '')}/`
  return parsed
}

export function serviceUrl(base: string, path: string) {
  return new URL(path.replace(/^\/+/, ''), normalizeServiceUrl(base)).toString()
}

export function resolveServiceUrl(base: string, value: string) {
  return new URL(value, normalizeServiceUrl(base)).toString()
}

export function redactedMessage(reason: unknown, ...secrets: string[]) {
  let message = reason instanceof Error ? reason.message : String(reason)
  for (const secret of secrets) {
    if (secret) message = message.replaceAll(secret, '[redacted]')
  }
  return message
}

export function connectorEvent(
  connector: ComputeConnectorKind,
  phase: ComputeConnectionEvent['phase'],
  message: string,
  progress?: number,
): ComputeConnectionEvent {
  return { connector, phase, message, ...(progress === undefined ? {} : { progress }), occurredAt: Date.now() }
}

export async function readJsonEventStream<T>(response: Response, onEvent: (event: T) => void) {
  if (!response.ok) throw new Error(`Event stream returned HTTP ${response.status}`)
  if (!response.body) throw new Error('Event stream response has no readable body')
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const consume = (block: string) => {
    const data = block
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n')
    if (data) onEvent(JSON.parse(data) as T)
  }

  while (true) {
    const { value, done } = await reader.read()
    buffer += decoder.decode(value, { stream: !done })
    const blocks = buffer.split(/\r?\n\r?\n/)
    buffer = blocks.pop() ?? ''
    for (const block of blocks) consume(block)
    if (done) break
  }
  if (buffer.trim()) consume(buffer)
}

export function requireHttpsForRemote(value: string) {
  const parsed = new URL(value)
  const local = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname)
  if (parsed.protocol !== 'https:' && !local) throw new Error('远程 Compute 服务必须使用 HTTPS。')
  if (typeof location !== 'undefined' && location.protocol === 'https:' && parsed.protocol !== 'https:') {
    throw new Error('HTTPS TensorNote 页面不能连接 HTTP Compute 服务。')
  }
  return parsed
}
