import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowClockwise,
  CheckCircle,
  CircleNotch,
  Flask,
  Play,
  Stop,
  TerminalWindow,
  WarningCircle,
} from '@phosphor-icons/react'
import type {
  EnvironmentPlan,
  EnvironmentPlanRequest,
  OwnedJupyterServer,
  RuntimeDiscovery,
  RuntimeLogLine,
  RuntimeOperation,
} from '../../host/types'
import { getHostAdapter } from '../../host/runtime'
import { useComputeStore } from '../../store/useComputeStore'
import { useWorkspaceStore } from '../../store/useWorkspaceStore'
import { Button } from '../ui/Button'

const emptyDiscovery: RuntimeDiscovery = {
  tools: [],
  environments: [],
  kernels: [],
  servers: [],
  warnings: [],
}

function errorMessage(reason: unknown) {
  return reason instanceof Error ? reason.message : String(reason)
}

export default function LocalRuntimeAssistant() {
  const adapter = getHostAdapter()
  const session = useWorkspaceStore((state) => state.session)
  const upsertProfile = useComputeStore((state) => state.upsertOwnedRuntimeProfile)
  const removeOwnedProfile = useComputeStore((state) => state.removeOwnedRuntimeProfile)
  const workspaceId = session?.descriptor.config?.provider === 'native-local'
    ? session.descriptor.config.workspaceId
    : undefined
  const [discovery, setDiscovery] = useState(emptyDiscovery)
  const [discovering, setDiscovering] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [request, setRequest] = useState<EnvironmentPlanRequest>({
    manager: 'uv',
    name: 'TensorNote Base',
    pythonVersion: '3.12',
  })
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
      const [next, owned] = await Promise.all([
        adapter.discoverLocalRuntime(workspaceId),
        adapter.listOwnedJupyter(),
      ])
      setDiscovery(next)
      setServers(owned)
      setSelectedEnvironmentId((current) => current || next.environments.find((item) => item.jupyterInstalled)?.id || '')
      setRequest((current) => !next.tools.some((tool) => tool.kind === current.manager) && current.manager !== 'venv'
        ? { ...current, manager: next.tools.some((tool) => tool.kind === 'uv') ? 'uv' : 'venv' }
        : current)
    } catch (reason) {
      setMessage(errorMessage(reason))
    } finally {
      setDiscovering(false)
    }
  }, [adapter, workspaceId])

  useEffect(() => {
    const timer = window.setTimeout(() => { void discover() }, 0)
    return () => window.clearTimeout(timer)
  }, [discover])

  useEffect(() => {
    if (!operation || operation.state !== 'running' || !adapter.getLocalRuntimeOperation) return
    const timer = window.setInterval(() => {
      void adapter.getLocalRuntimeOperation!(operation.id).then((next) => {
        setOperation(next)
        if (next.state !== 'running') void discover()
      }).catch((reason) => setMessage(errorMessage(reason)))
    }, 700)
    return () => window.clearInterval(timer)
  }, [adapter, discover, operation])

  const availableManagers = useMemo(() => {
    const values: EnvironmentPlanRequest['manager'][] = ['venv']
    if (discovery.tools.some((tool) => tool.kind === 'uv')) values.unshift('uv')
    if (discovery.tools.some((tool) => tool.kind === 'conda')) values.push('conda')
    return values
  }, [discovery.tools])

  const createPlan = async () => {
    if (!adapter.planLocalEnvironment) return
    setMessage(null)
    try {
      const next = await adapter.planLocalEnvironment({
        ...request,
        baseEnvironmentId: request.manager === 'venv'
          ? request.baseEnvironmentId || discovery.environments[0]?.id
          : undefined,
      })
      setPlan(next)
      setConfirmation('')
    } catch (reason) {
      setMessage(errorMessage(reason))
    }
  }

  const applyPlan = async () => {
    if (!plan || !adapter.applyLocalEnvironment) return
    setMessage(null)
    try {
      setOperation(await adapter.applyLocalEnvironment(plan.id, confirmation))
      setPlan(null)
      setConfirmation('')
    } catch (reason) {
      setMessage(errorMessage(reason))
    }
  }

  const cancelOperation = async () => {
    if (!operation || !adapter.cancelLocalRuntimeOperation) return
    try { setOperation(await adapter.cancelLocalRuntimeOperation(operation.id)) }
    catch (reason) { setMessage(errorMessage(reason)) }
  }

  const startServer = async () => {
    if (!selectedEnvironmentId || !adapter.startOwnedJupyter) return
    setMessage(null)
    try {
      const launch = await adapter.startOwnedJupyter(selectedEnvironmentId, workspaceId, window.location.origin)
      const environment = discovery.environments.find((item) => item.id === launch.server.environmentId)
      const kernelName = launch.server.kernelName
        || environment?.kernelName
        || discovery.kernels.find((kernel) => kernel.environmentId === launch.server.environmentId)?.name
        || 'python3'
      upsertProfile({
        serverId: launch.server.id,
        environmentName: launch.server.environmentName,
        serverUrl: launch.server.url,
        kernelName,
        token: launch.token,
      })
      setServers((current) => [launch.server, ...current.filter((item) => item.id !== launch.server.id)])
      setMessage('Jupyter Server 已启动，并已切换到自动生成的 Compute Profile。')
    } catch (reason) {
      setMessage(errorMessage(reason))
    }
  }

  const refreshLogs = async (serverId: string) => {
    if (!adapter.getOwnedJupyterLogs) return
    try {
      const next = await adapter.getOwnedJupyterLogs(serverId)
      setLogs((current) => ({ ...current, [serverId]: next }))
    }
    catch (reason) { setMessage(errorMessage(reason)) }
  }

  const stopServer = async (serverId: string) => {
    if (!adapter.stopOwnedJupyter) return
    try {
      await adapter.stopOwnedJupyter(serverId)
      removeOwnedProfile(serverId)
      setServers((current) => current.filter((server) => server.id !== serverId))
      setMessage('TensorNote 启动的 Jupyter Server 已停止。')
    } catch (reason) {
      setMessage(errorMessage(reason))
    }
  }

  if (!adapter.capabilities.environmentDiscovery) return null

  return <section className="local-runtime-assistant" aria-label="本地运行时助手">
    <header>
      <div><span><TerminalWindow size={17} /></span><div><strong>本地运行时助手</strong><small>检测环境、创建最小环境并管理 TensorNote 自己启动的 Jupyter</small></div></div>
      <Button variant="ghost" size="sm" onClick={() => void discover()} disabled={discovering}>
        {discovering ? <CircleNotch size={15} className="spin" /> : <ArrowClockwise size={15} />}重新检测
      </Button>
    </header>

    {message && <p className="local-runtime-message" role="status">{message}</p>}
    {discovery.warnings.length > 0 && <details className="local-runtime-warnings"><summary><WarningCircle size={14} />{discovery.warnings.length} 项检测提示</summary>{discovery.warnings.map((warning) => <p key={warning}>{warning}</p>)}</details>}

    <div className="local-runtime-summary">
      <div><small>工具</small><strong>{discovery.tools.length}</strong><span>{discovery.tools.map((tool) => tool.name).join(' · ') || '等待检测'}</span></div>
      <div><small>Python</small><strong>{discovery.environments.length}</strong><span>{discovery.environments.filter((item) => item.jupyterInstalled).length} 个可运行 Jupyter</span></div>
      <div><small>Kernel</small><strong>{discovery.kernels.length}</strong><span>{servers.length} 个由 TensorNote 管理的 Server</span></div>
    </div>

    <details className="local-runtime-create">
      <summary>创建 TensorNote Managed Environment</summary>
      <p>仅安装 Jupyter Server、ipykernel、NumPy、Matplotlib 与 Pillow。PyTorch、Transformers 等大型框架由你按项目需要另行安装。</p>
      <div className="local-runtime-form">
        <label><span>管理器</span><select value={request.manager} onChange={(event) => setRequest((current) => ({ ...current, manager: event.target.value as EnvironmentPlanRequest['manager'] }))}>{availableManagers.map((manager) => <option key={manager} value={manager}>{manager}</option>)}</select></label>
        <label><span>环境名称</span><input value={request.name} maxLength={40} onChange={(event) => setRequest((current) => ({ ...current, name: event.target.value }))} /></label>
        <label><span>Python</span><select value={request.pythonVersion} onChange={(event) => setRequest((current) => ({ ...current, pythonVersion: event.target.value }))}>{['3.10', '3.11', '3.12', '3.13', '3.14'].map((version) => <option key={version}>{version}</option>)}</select></label>
        {request.manager === 'venv' && <label><span>基础 Python</span><select value={request.baseEnvironmentId || ''} onChange={(event) => setRequest((current) => ({ ...current, baseEnvironmentId: event.target.value }))}>{discovery.environments.map((environment) => <option key={environment.id} value={environment.id}>{environment.name} · {environment.pythonVersion}</option>)}</select></label>}
      </div>
      <Button size="sm" onClick={() => void createPlan()} disabled={!request.name.trim() || (request.manager === 'venv' && discovery.environments.length === 0)}>生成执行计划</Button>
    </details>

    {plan && <div className="local-runtime-plan">
      <header><div><small>待确认计划</small><strong>{plan.name} · Python {plan.pythonVersion}</strong></div><span>{plan.manager}</span></header>
      <ol>{plan.steps.map((step) => <li key={step}>{step}</li>)}</ol>
      <label><span>输入 <code>{plan.confirmation}</code> 才会执行</span><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
      <div><Button size="sm" onClick={() => void applyPlan()} disabled={confirmation !== plan.confirmation}>确认并创建</Button><Button variant="ghost" size="sm" onClick={() => setPlan(null)}>取消</Button></div>
    </div>}

    {operation && <div className="local-runtime-operation" data-state={operation.state}>
      <header><strong>{operation.state === 'running' ? '正在准备环境' : operation.state === 'completed' ? '环境已就绪' : '环境未创建'}</strong><span>{operation.progress}%</span></header>
      <progress max={100} value={operation.progress} />
      <pre>{operation.logs.map((line) => `[${line.stream}] ${line.text}`).join('\n') || '等待输出…'}</pre>
      {operation.state === 'running' && <Button variant="danger" size="sm" onClick={() => void cancelOperation()}>取消并清理</Button>}
    </div>}

    <div className="local-runtime-launch">
      <header><div><strong>启动 Jupyter Server</strong><small>仅绑定 127.0.0.1；Token 只保存在当前应用会话，退出 TensorNote 时自动停止。</small></div></header>
      <div><select value={selectedEnvironmentId} onChange={(event) => setSelectedEnvironmentId(event.target.value)}><option value="">选择已安装 Jupyter 的 Python</option>{discovery.environments.filter((item) => item.jupyterInstalled).map((environment) => <option key={environment.id} value={environment.id}>{environment.name} · {environment.pythonVersion}{environment.managed ? ' · Managed' : ''}</option>)}</select><Button size="sm" onClick={() => void startServer()} disabled={!selectedEnvironmentId}><Play size={14} weight="fill" />启动并使用</Button></div>
    </div>

    {servers.length > 0 && <div className="local-runtime-servers">{servers.map((server) => <article key={server.id}>
      <header><span><Flask size={16} /></span><div><strong>{server.environmentName}</strong><small>{server.url} · {server.status}</small></div><CheckCircle size={16} weight="fill" /></header>
      <div><Button variant="ghost" size="sm" onClick={() => void refreshLogs(server.id)}>查看日志</Button><Button variant="danger" size="sm" onClick={() => void stopServer(server.id)}><Stop size={13} weight="fill" />停止</Button></div>
      {logs[server.id] && <pre>{logs[server.id].map((line) => `[${line.stream}] ${line.text}`).join('\n') || '暂无日志'}</pre>}
    </article>)}</div>}
  </section>
}
