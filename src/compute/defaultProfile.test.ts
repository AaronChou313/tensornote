import { expect, it } from 'vitest'
import { initialComputeProfile } from './defaultProfile'
it('does not direct first-time online users to an inaccessible local or example server', () => {
  for (const mode of ['static', 'self-hosted'] as const) expect(initialComputeProfile(mode)).toMatchObject({ id: 'remote-jupyter', serverUrl: '', kernelName: 'python3' })
  for (const mode of ['local', 'desktop'] as const) expect(initialComputeProfile(mode)).toMatchObject({ id: 'local-python', serverUrl: 'http://127.0.0.1:8888' })
})
