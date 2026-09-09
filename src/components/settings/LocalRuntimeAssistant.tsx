import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowClockwise, CheckCircle, CircleNotch, Flask, FolderOpen, Play, Stop, TerminalWindow, Trash, WarningCircle } from '@phosphor-icons/react'
import type { EnvironmentPlan, EnvironmentPlanRequest, OwnedJupyterServer, RuntimeDiscovery, RuntimeLogLine, RuntimeOperation } from '../../host/types'
import { getHostAdapter } from '../../host/runtime'
import { useComputeStore } from '../../store/useComputeStore'
import { useWorkspaceStore } from '../../store/useWorkspaceStore'
import { Button } from '../ui/Button'

const emptyDiscovery: RuntimeDiscovery = { tools: [], environments: [], kernels: [], servers: [], warnings: [] }
const pythonVersions = ['3.10', '3.11', '3.12', '3.13', '3.14']
const errorMessage = (reason: unknown) => {
  const message = reason instanceof Error ? reason.message : String(reason)
  return message.includes("reading 'invoke'") || message.includes('not available outside Tauri')
    ? '本地环境管理仅在安装后的 TensorNote Desktop 中可用。'
    : message
}
const managerLabel = (manager: string) => manager === 'conda' ? 'Conda' : manager === 'venv' ? 'Python venv' : manager === 'uv' ? 'uv' : '系统 Python'

export default function LocalRuntimeAssistant() {
  const adapter = getHostAdapter()
  const session = useWorkspaceStore((state) => state.session)
  const upsertProfile = useComputeStore((state) => state.upsertOwnedRuntimeProfile)
  const removeOwnedProfile = useComputeStore((state) => state.removeOwnedRuntimeProfile)
  const workspaceId = session?.descriptor.config?.provider === 'native-local' ? session.descriptor.config.workspaceId : undefined
  const [discovery, setDiscovery] = useState(emptyDiscovery)
  const [discovering, setDiscovering] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [request, setRequest] = useState<EnvironmentPlanRequest>({ manager: 'uv', name: 'TensorNote Python 3.11', pythonVersion: '3.11' })
  const [plan, setPlan] = useState<EnvironmentPlan | null>(null)
  const [confirmation, setConfirmation] = useState('')
  const [operation, setOperation] = useState<RuntimeOperation | null>(null)
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState('')
  const [servers, setServers] = useState<OwnedJupyterServer[]>([])
  const [logs, setLogs] = useState<Record<string, RuntimeLogLine[]>>({})

  const discover = useCallback(async () => {
    if (!adapter.discoverLocalRuntime || !adapter.listOwnedJupyter) return
    setDiscovering(true)
    setMessage(null)
    try {
      const [next, owned] = await Promise.all([adapter.discoverLocalRuntime(workspaceId), adapter.listOwnedJupyter()])
      setDiscovery(next)
      setServers(owned)
      setSelectedEnvironmentId((current) => next.environments.some((item) => item.id === current && item.jupyterInstalled) ? current : next.environments.find((item) => item.jupyterInstalled)?.id || '')
      setRequest((current) => {
        const available = current.manager === 'venv' ? next.environments.length > 0 : next.tools.some((tool) => tool.kind === current.manager)
        if (available) return current
        const manager: EnvironmentPlanRequest['manager'] = next.tools.some((tool) => tool.kind === 'uv') ? 'uv' : next.tools.some((tool) => tool.kind === 'conda') ? 'conda' : 'venv'
        const base = next.environments[0]
        return { ...current, manager, ...(manager === 'venv' && base ? { baseEnvironmentId: base.id, pythonVersion: base.pythonVersion.split('.').slice(0, 2).join('.') } : {}) }
      })
    } catch (reason) { setMessage(errorMessage(reason)) } finally { setDiscovering(false) }
  }, [adapter, workspaceId])

  useEffect(() => { const timer = window.setTimeout(() => { void discover() }, 0); return () => window.clearTimeout(timer) }, [discover])
  useEffect(() => {
    if (!operation || operation.state !== 'running' || !adapter.getLocalRuntimeOperation) return
    const timer = window.setInterval(() => void adapter.getLocalRuntimeOperation!(operation.id).then((next) => {
      setOperation(next)
      if (next.state !== 'running') {
        if (next.state === 'completed' && next.environmentId) setSelectedEnvironmentId(next.environmentId)
        void discover()
      }
    }).catch((reason) => setMessage(errorMessage(reason))), 700)
    return () => window.clearInterval(timer)
  }, [adapter, discover, operation])

  const managerDiagnostics = useMemo(() => (['uv', 'conda', 'venv'] as const).map((kind) => {
    const diagnostic = discovery.managerDiagnostics?.find((item) => item.kind === kind)
    if (diagnostic) return diagnostic
    const available = kind === 'venv' ? discovery.environments.length > 0 : discovery.tools.some((tool) => tool.kind === kind)
    return { kind, status: available ? 'available' as const : 'missing' as const, detail: kind === 'venv' ? `${discovery.environments.length} 个基础 Python 可用` : `${available ? '已找到' : '未检测到'} ${managerLabel(kind)}` }
  }), [discovery])
  const selectedEnvironment = discovery.environments.find((item) => item.id === selectedEnvironmentId)

  const selectManager = (manager: EnvironmentPlanRequest['manager']) => {
    const base = discovery.environments[0]
    setRequest((current) => ({ ...current, manager, ...(manager === 'venv' && base ? { baseEnvironmentId: base.id, pythonVersion: base.pythonVersion.split('.').slice(0, 2).join('.') } : {}) }))
    setPlan(null)
  }
  const selectTool = async (kind: 'uv' | 'conda') => {
    if (!adapter.selectLocalRuntimeTool) return
    try { if (await adapter.selectLocalRuntimeTool(kind)) await discover() } catch (reason) { setMessage(errorMessage(reason)) }
  }
  const createPlan = async () => {
    if (!adapter.planLocalEnvironment) return
    try { setPlan(await adapter.planLocalEnvironment({ ...request, baseEnvironmentId: request.manager === 'venv' ? request.baseEnvironmentId : undefined })); setConfirmation(''); setMessage(null) } catch (reason) { setMessage(errorMessage(reason)) }
  }
  const applyPlan = async () => {
    if (!plan || !adapter.applyLocalEnvironment) return
    try { setOperation(await adapter.applyLocalEnvironment(plan.id, confirmation)); setPlan(null); setConfirmation('') } catch (reason) { setMessage(errorMessage(reason)) }
  }
  const startServer = async () => {
    if (!selectedEnvironment || !adapter.startOwnedJupyter) return
    try {
      const launch = await adapter.startOwnedJupyter(selectedEnvironment.id, workspaceId, window.location.origin)
      const kernelName = launch.server.kernelName || selectedEnvironment.kernelName || discovery.kernels.find((kernel) => kernel.environmentId === launch.server.environmentId)?.name || 'python3'
      upsertProfile({ serverId: launch.server.id, environmentName: launch.server.environmentName, serverUrl: launch.server.url, kernelName, token: launch.token })
      setServers((current) => [launch.server, ...current.filter((item) => item.id !== launch.server.id)])
      setMessage(`已启动 ${launch.server.environmentName}，并切换到对应计算环境。`)
    } catch (reason) { setMessage(errorMessage(reason)) }
  }
  const stopServer = async (serverId: string) => {
    if (!adapter.stopOwnedJupyter) return
    try { await adapter.stopOwnedJupyter(serverId); removeOwnedProfile(serverId); setServers((current) => current.filter((server) => server.id !== serverId)); setMessage('Jupyter Server 已停止。') } catch (reason) { setMessage(errorMessage(reason)) }
  }
  const removeEnvironment = async (environmentId: string, name: string, location?: string) => {
    if (!adapter.removeLocalEnvironment || !window.confirm(`删除 TensorNote 环境“${name}”？\n\n位置：${location || '应用数据目录'}\n已安装的包会被删除。`)) return
    try { await adapter.removeLocalEnvironment(environmentId, `DELETE ${name}`); await discover(); setMessage(`已删除 ${name}。`) } catch (reason) { setMessage(errorMessage(reason)) }
  }

  return <section className="local-runtime-assistant" aria-label="便捷连接">
    <header><div><span><TerminalWindow size={18} /></span><div><strong>选择环境并启动</strong><small>TensorNote 仅管理自己启动的本地 Jupyter Server</small></div></div><Button variant="ghost" size="sm" onClick={() => void discover()} disabled={discovering}>{discovering ? <CircleNotch size={15} className="spin" /> : <ArrowClockwise size={15} />}重新检测</Button></header>
    {message && <p className="local-runtime-message" role="status">{message}</p>}
    {discovery.warnings.length > 0 && <details className="local-runtime-warnings"><summary><WarningCircle size={14} />{discovery.warnings.length} 项检测提示</summary>{discovery.warnings.map((warning) => <p key={warning}>{warning}</p>)}</details>}
    <div className="local-runtime-environment-list" role="radiogroup" aria-label="Python 环境">{discovery.environments.map((environment) => { const running = servers.some((server) => server.environmentId === environment.id); return <button key={environment.id} role="radio" aria-checked={selectedEnvironmentId === environment.id} className={selectedEnvironmentId === environment.id ? 'is-selected' : ''} onClick={() => setSelectedEnvironmentId(environment.id)}><span className="local-runtime-environment-list__icon"><Flask size={17} /></span><span><strong>{environment.name}</strong><small>{managerLabel(environment.manager)} · Python {environment.pythonVersion}</small><code title={environment.pythonPath}>{environment.pythonPath || environment.location || '路径信息不可用'}</code></span><em data-status={running ? 'running' : environment.jupyterInstalled ? 'ready' : 'missing'}>{running ? '运行中' : environment.jupyterInstalled ? '可启动' : '缺少 Jupyter'}</em></button> })}{!discovering && discovery.environments.length === 0 && <div className="local-runtime-empty"><WarningCircle size={18} /><span><strong>没有找到 Python 环境</strong><small>可先检查下方管理器，然后新建独立环境。</small></span></div>}</div>
    <div className="local-runtime-launch"><div><strong>{selectedEnvironment?.jupyterInstalled ? `使用 ${selectedEnvironment.name}` : '选择可启动的环境'}</strong><small>{selectedEnvironment?.jupyterInstalled ? 'Server 仅绑定 127.0.0.1；Token 只保留在当前应用会话。' : '缺少 Jupyter 的外部环境暂时不能直接启动。'}</small></div><Button size="sm" onClick={() => void startServer()} disabled={!selectedEnvironment?.jupyterInstalled || servers.some((server) => server.environmentId === selectedEnvironmentId)}><Play size={14} weight="fill" />启动并连接</Button></div>
    {servers.length > 0 && <div className="local-runtime-servers">{servers.map((server) => <article key={server.id}><header><span><CheckCircle size={16} weight="fill" /></span><div><strong>{server.environmentName}</strong><small>{server.url} · 由 TensorNote 管理</small></div></header><div><Button variant="ghost" size="sm" onClick={() => void adapter.getOwnedJupyterLogs?.(server.id).then((next) => setLogs((current) => ({ ...current, [server.id]: next })))}>日志</Button><Button variant="danger" size="sm" onClick={() => void stopServer(server.id)}><Stop size={13} weight="fill" />停止</Button></div>{logs[server.id] && <pre>{logs[server.id].map((line) => `[${line.stream}] ${line.text}`).join('\n') || '暂无日志'}</pre>}</article>)}</div>}
    <details className="local-runtime-create"><summary>新建独立环境</summary><p>Conda 与 uv 可以获取所选 Python；venv 只能使用电脑中已有的同版本 Python。</p><div className="local-runtime-managers">{managerDiagnostics.map((diagnostic) => <div key={diagnostic.kind} className={request.manager === diagnostic.kind ? 'is-selected' : ''}><button disabled={diagnostic.status !== 'available'} onClick={() => selectManager(diagnostic.kind)}><span>{diagnostic.status === 'available' ? <CheckCircle size={15} weight="fill" /> : <WarningCircle size={15} />}</span><span><strong>{managerLabel(diagnostic.kind)}</strong><small>{diagnostic.detail}</small></span></button>{diagnostic.status !== 'available' && diagnostic.kind !== 'venv' && <button className="local-runtime-tool-picker" onClick={() => void selectTool(diagnostic.kind as 'uv' | 'conda')}>选择文件</button>}</div>)}</div>
      {discovery.managedEnvironmentRoot && <div className="local-runtime-location"><FolderOpen size={15} /><span><strong>环境将创建在应用数据目录</strong><code>{discovery.managedEnvironmentRoot}/环境名称</code></span></div>}
      <div className="local-runtime-form"><label><span>环境名称</span><input value={request.name} maxLength={40} onChange={(event) => setRequest((current) => ({ ...current, name: event.target.value }))} /></label><label><span>Python 版本</span><select value={request.pythonVersion} disabled={request.manager === 'venv'} onChange={(event) => setRequest((current) => ({ ...current, pythonVersion: event.target.value }))}>{pythonVersions.map((version) => <option key={version}>{version}</option>)}</select><small>{request.manager === 'venv' ? '由基础 Python 决定' : '由管理器创建或获取'}</small></label>{request.manager === 'venv' && <label className="is-wide"><span>基础 Python</span><select value={request.baseEnvironmentId || ''} onChange={(event) => { const base = discovery.environments.find((item) => item.id === event.target.value); setRequest((current) => ({ ...current, baseEnvironmentId: event.target.value, ...(base ? { pythonVersion: base.pythonVersion.split('.').slice(0, 2).join('.') } : {}) })) }}><option value="">选择基础 Python</option>{discovery.environments.map((environment) => <option key={environment.id} value={environment.id}>{environment.name} · {environment.pythonVersion} · {environment.pythonPath}</option>)}</select></label>}</div><Button size="sm" onClick={() => void createPlan()} disabled={!request.name.trim() || (request.manager === 'venv' && !request.baseEnvironmentId)}>预览创建计划</Button></details>
    {plan && <div className="local-runtime-plan"><header><div><small>创建前确认</small><strong>{plan.name} · Python {plan.pythonVersion}</strong></div><span>{managerLabel(plan.manager)}</span></header><p className="local-runtime-plan__target"><FolderOpen size={14} />目标位置 <code>{plan.targetPath || plan.targetLabel}</code></p><ol>{plan.steps.map((step) => <li key={step}>{step}</li>)}</ol><label><span>输入 <code>{plan.confirmation}</code></span><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label><div><Button size="sm" onClick={() => void applyPlan()} disabled={confirmation !== plan.confirmation}>确认并创建</Button><Button variant="ghost" size="sm" onClick={() => setPlan(null)}>取消</Button></div></div>}
    {operation && <div className="local-runtime-operation" data-state={operation.state}><header><strong>{operation.state === 'running' ? '正在准备环境' : operation.state === 'completed' ? '环境已就绪' : '环境未创建'}</strong><span>{operation.progress}%</span></header><progress max={100} value={operation.progress} /><pre>{operation.logs.map((line) => `[${line.stream}] ${line.text}`).join('\n') || '等待输出…'}</pre>{operation.state === 'running' && <Button variant="danger" size="sm" onClick={() => void adapter.cancelLocalRuntimeOperation?.(operation.id).then(setOperation)}>取消并清理</Button>}</div>}
    {discovery.environments.some((item) => item.managed) && <details className="local-runtime-cleanup"><summary>管理 TensorNote 环境</summary>{discovery.environments.filter((item) => item.managed).map((environment) => <div key={environment.id}><span><strong>{environment.name}</strong><small>{environment.location}</small></span><Button variant="danger" size="sm" disabled={servers.some((server) => server.environmentId === environment.id)} onClick={() => void removeEnvironment(environment.id, environment.name, environment.location)}><Trash size={13} />删除</Button></div>)}</details>}
  </section>
}
