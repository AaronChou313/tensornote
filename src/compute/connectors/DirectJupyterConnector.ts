import type { ComputeConnector, ComputeConnectionLease, DiagnosticCheck } from '../types'
import { connectorEvent, requireHttpsForRemote } from './http'

export class DirectJupyterConnector implements ComputeConnector {
  readonly id = 'direct'
  readonly kind = 'direct' as const
  readonly label = 'Generic Jupyter Server'

  async connect(request: Parameters<ComputeConnector['connect']>[0]): Promise<ComputeConnectionLease> {
    request.onEvent(connectorEvent(this.kind, 'checking', '正在检查 Jupyter Server 地址…'))
    requireHttpsForRemote(request.profile.serverUrl)
    const connection = {
      serverUrl: request.profile.serverUrl,
      token: request.credential,
      kernelName: request.profile.kernelName,
    }
    request.onEvent(connectorEvent(this.kind, 'ready', 'Jupyter 连接配置已就绪。', 100))
    return {
      connector: this.kind,
      connection,
      ownership: 'external',
      persistence: 'persistent',
      release: async () => undefined,
    }
  }

  async diagnose(request: Parameters<ComputeConnector['diagnose']>[0]) {
    const checks: DiagnosticCheck[] = []
    try {
      requireHttpsForRemote(request.profile.serverUrl)
      checks.push({ id: 'lifecycle', label: 'Connection mode', status: 'pass', detail: '直接连接现有 Jupyter；TensorNote 只管理自己创建的 Kernel。' })
      checks.push({ id: 'persistence', label: 'Data ownership', status: 'pass', detail: 'Server 生命周期与文件持久性由 Jupyter 管理者负责。' })
      return {
        checks,
        connection: {
          serverUrl: request.profile.serverUrl,
          token: request.credential,
          kernelName: request.profile.kernelName,
        },
      }
    } catch (reason) {
      checks.push({ id: 'browser', label: 'Secure endpoint', status: 'fail', detail: reason instanceof Error ? reason.message : 'Server URL 无效。' })
      return { checks }
    }
  }
}
