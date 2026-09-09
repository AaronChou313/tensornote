import { ArrowClockwise, CheckCircle, Cloud, Desktop, WarningCircle } from '@phosphor-icons/react'
import type { ComputeCapabilities } from '../../compute/runtimeSettings'
import type { RuntimeDiscovery } from '../../host/types'
import type { KernelStatus } from '../../types'
import { Button } from '../ui/Button'

export function ComputeOverview({ capabilities, platformLabel, discovery, discovering, activeComputeName, kernelStatus, onRediscover }: {
  capabilities: ComputeCapabilities
  platformLabel: string
  discovery?: RuntimeDiscovery
  discovering: boolean
  activeComputeName: string
  kernelStatus: KernelStatus
  onRediscover?: () => void
}) {
  const connected = kernelStatus !== 'offline'
  const warningCount = discovery?.warnings.length ?? 0
  return (
    <section className="compute-overview" aria-label="当前计算状态">
      <header>
        <span className="compute-overview__platform">{capabilities.environmentDiscovery ? <Desktop size={16} /> : <Cloud size={16} />}{platformLabel}</span>
        {capabilities.environmentDiscovery && onRediscover && <Button variant="ghost" size="sm" onClick={onRediscover} disabled={discovering}><ArrowClockwise size={14} className={discovering ? 'is-spinning' : ''} />{discovering ? '正在检测' : '重新检测'}</Button>}
      </header>
      <div className="compute-overview__facts">
        {capabilities.environmentDiscovery ? <>
          <div><span>Python 环境</span><strong>{discovering && !discovery ? '…' : discovery?.environments.length ?? 0}</strong><small>{discovering ? '正在扫描本机' : '已发现'}</small></div>
          <div><span>Jupyter Kernel</span><strong>{discovering && !discovery ? '…' : discovery?.kernels.length ?? 0}</strong><small>{warningCount ? `${warningCount} 条检测提示` : '已关联环境'}</small></div>
        </> : capabilities.manualLocalJupyter
          ? <div><span>本机 Python 环境</span><strong className="is-text">不可直接检测</strong><small>浏览器通过已启动的 Jupyter 运行</small></div>
          : <div><span>计算位置</span><strong className="is-text">远程计算</strong><small>在线版不读取本机运行时</small></div>}
        <div className="compute-overview__current"><span>当前计算</span><strong className="is-text">{activeComputeName}</strong><small data-status={connected ? 'connected' : 'offline'}>{connected ? <CheckCircle size={13} weight="fill" /> : <WarningCircle size={13} />}{connected ? '已连接' : '未连接'}</small></div>
      </div>
    </section>
  )
}
