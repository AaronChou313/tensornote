import type { DeploymentMode } from '../deployment/config'
import { computeProfileTemplates, type ComputeProfile } from './types'

export function initialComputeProfile(mode: DeploymentMode): ComputeProfile {
  if (mode === 'static' || mode === 'self-hosted') {
    return { id: 'remote-jupyter', name: 'My Jupyter', kind: 'jupyter', serverUrl: '', kernelName: 'python3', scope: 'note', description: '填写你自己的 HTTPS Jupyter 服务地址' }
  }
  return { id: 'local-python', ...computeProfileTemplates[0] }
}
