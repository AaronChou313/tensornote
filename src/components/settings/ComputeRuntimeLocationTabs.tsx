import { Cpu, TerminalWindow } from '@phosphor-icons/react'
import type { ComputeCapabilities, RuntimeLocation } from '../../compute/runtimeSettings'

export function ComputeRuntimeLocationTabs({ capabilities, value, onChange }: {
  capabilities: ComputeCapabilities
  value: RuntimeLocation
  onChange: (location: RuntimeLocation) => void
}) {
  return (
    <div className="settings-runtime-location" role="tablist" aria-label="运行位置">
      {capabilities.localRuntime && (
        <button role="tab" aria-selected={value === 'local'} className={value === 'local' ? 'is-active' : ''} onClick={() => onChange('local')}>
          <TerminalWindow size={18} />
          <span><strong>本地运行</strong><small>{capabilities.environmentManagement ? '在这台电脑上创建、启动或连接环境' : '连接这台电脑上已启动的 Jupyter'}</small></span>
        </button>
      )}
      {capabilities.remoteRuntime && (
        <button role="tab" aria-selected={value === 'remote'} className={value === 'remote' ? 'is-active' : ''} onClick={() => onChange('remote')}>
          <Cpu size={18} />
          <span><strong>远程运行</strong><small>连接远程机器、JupyterHub 或 Binder</small></span>
        </button>
      )}
    </div>
  )
}
