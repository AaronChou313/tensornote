import { expect, it } from 'vitest'
import { initialComputeProfile } from './defaultProfile'

it('chooses compute defaults from the host', () => {
  expect(initialComputeProfile('web')).toMatchObject({ id: 'remote-jupyter', serverUrl: '', runtimeLocation: 'remote' })
  expect(initialComputeProfile('desktop')).toMatchObject({ id: 'local-python', serverUrl: 'http://127.0.0.1:8888' })
})
