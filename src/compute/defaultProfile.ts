import type { HostKind } from '../host/types'
import { computeProfileTemplates, type ComputeProfile } from './types'

export function initialComputeProfile(host: HostKind): ComputeProfile {
  if (host === 'web') {
    return { id: 'remote-jupyter', name: 'My Jupyter', kind: 'jupyter', serverUrl: '', kernelName: 'python3', scope: 'note', description: '填写你自己的 HTTPS Jupyter 服务地址', runtimeLocation: 'remote' }
  }
  return { id: 'local-python', ...computeProfileTemplates[0] }
}
