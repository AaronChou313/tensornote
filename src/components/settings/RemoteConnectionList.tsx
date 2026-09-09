import { CheckCircle, Cloud, Gear, Plus } from '@phosphor-icons/react'
import type { ComputeProfile } from '../../compute/types'
import type { KernelStatus } from '../../types'
import { computeConnectorKind } from '../../compute/connectors'
import { Button } from '../ui/Button'

const labels = { direct: 'Generic Jupyter', jupyterhub: 'JupyterHub', binderhub: 'BinderHub' } as const

export function RemoteConnectionList({ profiles, activeProfileId, kernelStatus, onSelect, onAdd, onEdit }: {
  profiles: ComputeProfile[]
  activeProfileId: string | null
  kernelStatus: KernelStatus
  onSelect: (id: string) => void
  onAdd: () => void
  onEdit: (id: string) => void
}) {
  return <section className="remote-connection-list" aria-label="远程计算连接">
    <header><div><strong>远程连接</strong><small>选择一个已保存的计算入口；凭证只保存在当前会话。</small></div><Button size="sm" onClick={onAdd}><Plus size={14} />添加远程连接</Button></header>
    <div>{profiles.map((profile) => { const active = profile.id === activeProfileId; const connector = computeConnectorKind(profile.connector) as keyof typeof labels; return <article key={profile.id} className={active ? 'is-active' : ''}><button onClick={() => onSelect(profile.id)}><span><Cloud size={17} /></span><span><strong>{profile.name}</strong><small>{labels[connector] ?? connector} · {profile.serverUrl || '尚未配置地址'}</small></span><em>{active ? <><CheckCircle size={13} weight="fill" />{kernelStatus === 'offline' ? '当前连接' : '正在使用'}</> : '未使用'}</em></button><Button variant="ghost" size="sm" onClick={() => onEdit(profile.id)} aria-label={`编辑 ${profile.name}`}><Gear size={15} /></Button></article> })}</div>
  </section>
}
