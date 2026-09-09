import { ArrowLeft, CheckCircle, Clock, Cpu, FileCode, Flask, FolderOpen, Gauge, HardDrives, Play, ShieldCheck, WarningCircle } from '@phosphor-icons/react'
import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { deploymentAdapter } from '../deployment/config'
import { computeRuntime } from '../compute/ComputeRuntime'
import { describeExperimentCapability } from '../experiments/capabilities'
import type { IndexedExperiment } from '../experiments/types'
import type { EnvironmentPlan, ExperimentJob, ExperimentRunPlan, RuntimeDiscovery, RuntimeOperation, SystemResourceSnapshot } from '../host/types'
import { resolveExperimentEnvironmentFiles } from '../experiments/environment'
import { experimentWorkingDirectory, materializeExperimentSteps } from '../experiments/runPlan'
import { jupyterStepCode, jupyterSupported, jupyterWorkspaceProbe } from '../experiments/jupyterRunner'
import { createBinderExperimentTarget } from '../experiments/binder'
import { getHostAdapter } from '../host/runtime'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import { activeComputeProfile, useComputeStore } from '../store/useComputeStore'
import { resolveWorkspaceExecutionPolicy } from '../workspace/executionPolicy'

const tabs = ['environment', 'steps', 'files', 'run', 'artifacts'] as const
type ExperimentTab = typeof tabs[number]
const tabLabels: Record<ExperimentTab, string> = { environment: '环境', steps: '步骤', files: '文件', run: '运行', artifacts: '产物' }
const difficultyLabels = { basic: '基础', medium: '进阶', heavy: '重型' } as const

function DesktopEnvironmentPreparation({ experiment, environmentId, enabled, onEnvironmentReady }: { experiment: IndexedExperiment; environmentId: string; enabled: boolean; onEnvironmentReady: (environmentId: string) => void }) {
  const session = useWorkspaceStore((state) => state.session)!
  const adapter = getHostAdapter()
  const [discovery, setDiscovery] = useState<RuntimeDiscovery | null>(null)
  const [plan, setPlan] = useState<EnvironmentPlan | null>(null)
  const [operation, setOperation] = useState<RuntimeOperation | null>(null)
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const manifest = experiment.manifest!
  const environment = manifest.environments[environmentId]
  const workspaceId = session.descriptor.config?.provider === 'native-local' ? session.descriptor.config.workspaceId : undefined
  useEffect(() => {
    if (!operation || operation.state !== 'running' || !adapter.getLocalRuntimeOperation) return
    const timer = window.setInterval(() => void adapter.getLocalRuntimeOperation!(operation.id).then((next) => { setOperation(next); if (next.state === 'completed' && next.environmentId) onEnvironmentReady(next.environmentId) }).catch((reason) => setMessage(String(reason))), 800)
    return () => window.clearInterval(timer)
  }, [adapter, onEnvironmentReady, operation])
  if (!adapter.capabilities.environmentDiscovery || !workspaceId) return <aside className="experiment-platform-note"><strong>环境准备需要桌面版的本地 Workspace</strong><p>Web 入口仍可检查依赖文件；后续阶段会提供 Jupyter 兼容子集。</p></aside>
  const inspect = async () => {
    setMessage(null)
    try { setDiscovery(await adapter.discoverLocalRuntime!(workspaceId)) } catch (reason) { setMessage(reason instanceof Error ? reason.message : String(reason)) }
  }
  const createPlan = async () => {
    if (!discovery || !adapter.planLocalEnvironment) return
    const manager = discovery.tools.some((tool) => tool.kind === 'uv') ? 'uv' : discovery.tools.some((tool) => tool.kind === 'conda') ? 'conda' : 'venv'
    const base = discovery.environments.find((item) => item.pythonVersion.startsWith(`${environment.python}.`)) ?? discovery.environments[0]
    try {
      setPlan(await adapter.planLocalEnvironment({ manager, name: `${manifest.experiment.id}-${environmentId}`, pythonVersion: environment.python, ...(manager === 'venv' ? { baseEnvironmentId: base?.id } : {}), workspaceId, dependencyFiles: resolveExperimentEnvironmentFiles(manifest, experiment.manifestPath, environmentId), manifestPath: experiment.manifestPath, manifestDigest: `${manifest.schemaVersion}:${manifest.experiment.id}:${environmentId}`, ...(session.descriptor.revision ? { revision: session.descriptor.revision } : {}) }))
      setConfirmation('')
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : String(reason)) }
  }
  const apply = async () => {
    if (!plan || !adapter.applyLocalEnvironment) return
    try { setOperation(await adapter.applyLocalEnvironment(plan.id, confirmation)); setPlan(null) } catch (reason) { setMessage(reason instanceof Error ? reason.message : String(reason)) }
  }
  return <aside className="experiment-environment-prep"><header><div><small>Desktop environment</small><strong>隔离环境检查与准备</strong></div><button onClick={() => void inspect()}>检查本机环境</button></header>
    <p>依赖会安装到 TensorNote 应用数据目录，不写入 Workspace。依赖文件内容变化、计划过期或 Revision 变化后必须重新确认。</p>
    {discovery && <div className="experiment-discovery"><span>{discovery.tools.length} 个工具</span><span>{discovery.environments.length} 个 Python</span><button disabled={!enabled || (!discovery.tools.some((tool) => tool.kind === 'uv') && discovery.environments.length === 0)} onClick={() => void createPlan()}>生成安装计划</button></div>}
    {plan && <div className="experiment-install-plan"><strong>{plan.name} · Python {plan.pythonVersion}</strong><p>创建位置：<code>{plan.targetPath || plan.targetLabel}</code></p><ol>{plan.steps.map((step) => <li key={step}>{step}</li>)}</ol>{plan.dependencies?.map((dependency) => <code key={dependency.path}>{dependency.path} · {dependency.sha256.slice(0, 12)}… · {dependency.size} B</code>)}<label>输入 <b>{plan.confirmation}</b><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label><button disabled={confirmation !== plan.confirmation} onClick={() => void apply()}>确认并准备环境</button></div>}
    {operation && <div className="experiment-install-operation"><strong>{operation.state} · {operation.progress}%</strong><progress max="100" value={operation.progress} /><pre>{operation.logs.map((line) => line.text).join('\n') || '等待输出…'}</pre>{operation.state === 'running' && <button onClick={() => void adapter.cancelLocalRuntimeOperation?.(operation.id).then(setOperation)}>取消并清理</button>}</div>}
    {message && <p role="alert" className="experiment-prep-error">{message}</p>}
  </aside>
}

function DesktopDependencyInstaller({ experiment, manifestEnvironmentId, enabled, environmentId, onEnvironmentChange }: { experiment: IndexedExperiment; manifestEnvironmentId: string; enabled: boolean; environmentId: string; onEnvironmentChange: (environmentId: string) => void }) {
  const session = useWorkspaceStore((state) => state.session)!
  const adapter = getHostAdapter()
  const workspaceId = session.descriptor.config?.provider === 'native-local' ? session.descriptor.config.workspaceId : undefined
  const [discovery, setDiscovery] = useState<RuntimeDiscovery | null>(null)
  const [plan, setPlan] = useState<EnvironmentPlan | null>(null)
  const [confirmation, setConfirmation] = useState('')
  const [operation, setOperation] = useState<RuntimeOperation | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const manifest = experiment.manifest!
  const declared = resolveExperimentEnvironmentFiles(manifest, experiment.manifestPath, manifestEnvironmentId).filter((path) => /^requirements[^/]*\.txt$/i.test(path.split('/').pop() ?? ''))
  const [selectedFiles, setSelectedFiles] = useState<string[]>(declared)
  const files = [...new Set([...declared, ...(experiment.detectedRequirementFiles ?? []).map((item) => item.path)])].map((path) => ({ path, declared: declared.includes(path), size: experiment.detectedRequirementFiles?.find((item) => item.path === path)?.size }))
  const environment = discovery?.environments.find((item) => item.id === environmentId)

  useEffect(() => {
    if (!workspaceId || !adapter.discoverLocalRuntime) return
    void adapter.discoverLocalRuntime(workspaceId).then((next) => {
      setDiscovery(next)
      if (!environmentId) onEnvironmentChange(next.environments.find((item) => item.managed)?.id || next.environments[0]?.id || '')
    }).catch((reason) => setMessage(reason instanceof Error ? reason.message : String(reason)))
  }, [adapter, environmentId, onEnvironmentChange, workspaceId])
  useEffect(() => {
    if (!operation || operation.state !== 'running' || !adapter.getLocalRuntimeOperation) return
    const timer = window.setInterval(() => void adapter.getLocalRuntimeOperation!(operation.id).then(setOperation).catch((reason) => setMessage(String(reason))), 700)
    return () => window.clearInterval(timer)
  }, [adapter, operation])

  if (!adapter.planEnvironmentDependencies || !workspaceId) return null
  const planDependencies = adapter.planEnvironmentDependencies
  const preview = async (paths: string[]) => {
    if (!environmentId || paths.length === 0) return
    try {
      setPlan(await planDependencies({ environmentId, workspaceId, dependencyFiles: paths, manifestPath: experiment.manifestPath, manifestDigest: `${manifest.schemaVersion}:${manifest.experiment.id}:${manifestEnvironmentId}`, ...(session.descriptor.revision ? { revision: session.descriptor.revision } : {}) }))
      setConfirmation(''); setMessage(null)
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : String(reason)) }
  }
  const apply = async () => {
    if (!plan || !adapter.applyLocalEnvironment) return
    try { setOperation(await adapter.applyLocalEnvironment(plan.id, confirmation)); setPlan(null); setConfirmation('') } catch (reason) { setMessage(reason instanceof Error ? reason.message : String(reason)) }
  }
  const toggle = (path: string) => setSelectedFiles((current) => current.includes(path) ? current.filter((item) => item !== path) : [...current, path])

  return <aside className="experiment-dependency-installer"><header><div><small>Requirements</small><strong>安装依赖到当前环境</strong></div><select value={environmentId} onChange={(event) => { onEnvironmentChange(event.target.value); setPlan(null) }}><option value="">选择 Python 环境</option>{discovery?.environments.map((item) => <option key={item.id} value={item.id}>{item.name} · Python {item.pythonVersion}{item.managed ? ' · TensorNote' : ' · 外部'}</option>)}</select></header>
    <p>每次安装都会绑定目标环境与文件摘要。未在 Manifest 声明的文件仅作为建议，不会自动加入。</p>
    {environment && !environment.managed && <div className="experiment-external-warning"><WarningCircle size={15} /><span><strong>这是外部环境</strong><small>安装会修改现有环境，TensorNote 无法自动回滚。</small></span></div>}
    <div className="experiment-requirement-list">{files.map((file) => <article key={file.path}><label><input type="checkbox" checked={selectedFiles.includes(file.path)} onChange={() => toggle(file.path)} /><span><strong>{file.path}</strong><small>{file.declared ? 'Manifest 已声明' : '在实验目录中检测到，未声明'}{file.size !== undefined ? ` · ${file.size} B` : ''}</small></span></label><button disabled={!enabled || !environmentId} onClick={() => void preview([file.path])}>安装到 {environment?.name ?? '所选环境'}</button></article>)}{files.length === 0 && <div className="experiment-empty experiment-empty--compact"><FileCode size={19} /><strong>没有 requirements 文件</strong><p>可在 Experiment Manifest 的 environment.files 中声明。</p></div>}</div>
    {files.length > 1 && <button className="experiment-install-selected" disabled={!enabled || !environmentId || selectedFiles.length === 0} onClick={() => void preview(selectedFiles)}>将所选 {selectedFiles.length} 个文件安装到 {environment?.name ?? '所选环境'}</button>}
    {plan && <div className="experiment-install-plan"><strong>{plan.name} · Python {plan.pythonVersion}</strong><p>目标：<code>{plan.targetPath || plan.targetLabel}</code></p>{plan.externalEnvironment && <p className="experiment-prep-error">外部环境会被直接修改，无法自动回滚。</p>}<ol>{plan.steps.map((step) => <li key={step}>{step}</li>)}</ol>{plan.dependencies?.map((dependency) => <code key={dependency.path}>{dependency.path} · {dependency.sha256.slice(0, 12)}…</code>)}<label>输入 <b>{plan.confirmation}</b><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label><button disabled={confirmation !== plan.confirmation} onClick={() => void apply()}>确认安装到 {plan.name}</button></div>}
    {operation && <div className="experiment-install-operation"><strong>{operation.state} · {operation.progress}%</strong><progress max="100" value={operation.progress} /><pre>{operation.logs.map((line) => line.text).join('\n') || '等待输出…'}</pre>{operation.state === 'running' && <button onClick={() => void adapter.cancelLocalRuntimeOperation?.(operation.id).then(setOperation)}>取消安装</button>}</div>}
    {message && <p role="alert" className="experiment-prep-error">{message}</p>}
  </aside>
}

function DesktopExperimentRunner({ experiment, presetId, enabled, environmentId, onEnvironmentChange }: { experiment: IndexedExperiment; presetId: string; enabled: boolean; environmentId: string; onEnvironmentChange: (environmentId: string) => void }) {
  const session = useWorkspaceStore((state) => state.session)!
  const adapter = getHostAdapter()
  const [discovery, setDiscovery] = useState<RuntimeDiscovery | null>(null)
  const [plan, setPlan] = useState<ExperimentRunPlan | null>(null)
  const [confirmation, setConfirmation] = useState('')
  const [job, setJob] = useState<ExperimentJob | null>(null)
  const [history, setHistory] = useState<ExperimentJob[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [resources, setResources] = useState<SystemResourceSnapshot | null>(null)
  const [resourceOverride, setResourceOverride] = useState(false)
  const [clock, setClock] = useState(Date.now)
  const workspaceId = session.descriptor.config?.provider === 'native-local' ? session.descriptor.config.workspaceId : undefined
  const manifest = experiment.manifest!
  useEffect(() => { if (workspaceId && adapter.discoverLocalRuntime) void adapter.discoverLocalRuntime(workspaceId).then((next) => { setDiscovery(next); if (!environmentId) onEnvironmentChange(next.environments.find((item) => item.managed)?.id || '') }); if (adapter.inspectSystemResources) void adapter.inspectSystemResources(workspaceId).then(setResources); if (adapter.listExperimentJobs) void adapter.listExperimentJobs().then((items) => setHistory(items.filter((item) => item.experimentId === manifest.experiment.id))) }, [adapter, environmentId, manifest.experiment.id, onEnvironmentChange, workspaceId])
  useEffect(() => {
    if (!job || job.state !== 'running' || !adapter.getExperimentJob) return
    const timer = window.setInterval(() => void adapter.getExperimentJob!(job.id).then(setJob).catch((reason) => setMessage(String(reason))), 600)
    return () => window.clearInterval(timer)
  }, [adapter, job])
  useEffect(() => { if (job?.state !== 'running') return; const timer = window.setInterval(() => setClock(Date.now()), 1000); return () => window.clearInterval(timer) }, [job?.state])
  if (!adapter.planExperimentRun || !workspaceId) return <div className="experiment-run-preview"><Play size={25} /><strong>此平台不支持原生多脚本任务</strong><p>请使用桌面版打开本地 Workspace；Web 兼容步骤将在后续阶段通过 Jupyter 运行。</p></div>
  const prepare = async (fromStep = 0) => {
    setMessage(null)
    try { setPlan(await adapter.planExperimentRun!({ workspaceId, environmentId, experimentId: manifest.experiment.id, presetId, manifestPath: experiment.manifestPath, workingDirectory: experimentWorkingDirectory(manifest, experiment.manifestPath), steps: materializeExperimentSteps(manifest, presetId).slice(fromStep), ...(session.descriptor.revision ? { revision: session.descriptor.revision } : {}) })); setConfirmation('') }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : String(reason)) }
  }
  const start = async () => { if (!plan) return; try { setJob(await adapter.startExperimentJob!(plan.id, environmentId, confirmation)); setPlan(null) } catch (reason) { setMessage(reason instanceof Error ? reason.message : String(reason)) } }
  const requestedGpu = Number((manifest.resources.gpu as Record<string, unknown> | undefined)?.count ?? 0)
  const shortages = resources ? [Number(manifest.resources.cpu ?? 0) > resources.cpuLogical ? `CPU 需要 ${String(manifest.resources.cpu)}，检测到 ${resources.cpuLogical}` : '', Number(manifest.resources.memoryGB ?? 0) > (resources.memoryTotalGB ?? Infinity) ? `内存需要 ${String(manifest.resources.memoryGB)} GB，检测到 ${resources.memoryTotalGB?.toFixed(1)} GB` : '', Number(manifest.resources.diskGB ?? 0) > (resources.diskAvailableGB ?? Infinity) ? `磁盘需要 ${String(manifest.resources.diskGB)} GB，可用 ${resources.diskAvailableGB?.toFixed(1)} GB` : '', requestedGpu > resources.gpuCount ? `GPU 需要 ${requestedGpu}，检测到 ${resources.gpuCount}` : ''].filter(Boolean) : []
  const elapsed = job ? Math.max(0, (job.finishedAt ?? clock) - job.startedAt) : 0
  return <div className="experiment-runner"><header><div><small>Desktop runner</small><strong>运行 {manifest.presets[presetId]?.title ?? presetId}</strong></div><select value={environmentId} onChange={(event) => onEnvironmentChange(event.target.value)}><option value="">选择 Python 环境</option>{discovery?.environments.map((item) => <option key={item.id} value={item.id}>{item.name} · Python {item.pythonVersion}{item.managed ? ' · TensorNote' : ''}</option>)}</select></header>
    {resources && <section className="experiment-resource-check"><strong>本机资源</strong><span>{resources.cpuLogical} CPU · {resources.memoryTotalGB?.toFixed(1) ?? '未知'} GB 内存 · {resources.diskAvailableGB?.toFixed(1) ?? '未知'} GB 可用磁盘 · {resources.gpuCount} GPU{resources.cudaVersion ? ` · CUDA ${resources.cudaVersion}` : ''}</span>{shortages.length > 0 && <label><input type="checkbox" checked={resourceOverride} onChange={(event) => setResourceOverride(event.target.checked)} />{shortages.join('；')}。仍要继续生成计划</label>}</section>}
    {!job && !plan && <button disabled={!enabled || !environmentId || (shortages.length > 0 && !resourceOverride)} onClick={() => void prepare()}><ShieldCheck size={15} />预览运行计划</button>}
    {plan && <section className="experiment-run-plan"><strong>{plan.steps.length} 个步骤 · {plan.outputs.length} 个输出范围</strong>{plan.steps.map((step) => <p key={step.id}><code>{step.runner}</code>{step.title}<span>{[step.file ?? step.module, ...step.args].filter(Boolean).join(' ')}</span></p>)}<small>输入摘要：{plan.inputs.map((input) => `${input.path} ${input.sha256.slice(0, 8)}…`).join(' · ')}</small><label>输入 <b>{plan.confirmation}</b><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label><button disabled={confirmation !== plan.confirmation} onClick={() => void start()}><Play size={15} />确认并运行</button></section>}
    {job && <section className="experiment-job" data-state={job.state}><header><strong>{job.state}</strong><span>已运行 {Math.floor(elapsed / 60000)}:{String(Math.floor(elapsed / 1000) % 60).padStart(2, '0')} · 长任务请保持系统唤醒</span></header><div>{job.steps.map((step) => <p key={step.id} data-state={step.state}><span />{step.title}<em>{step.state}</em></p>)}</div><pre>{job.logs.map((line) => `[${line.stream}] ${line.text}`).join('\n') || '等待日志…'}</pre>{(job.artifacts ?? []).map((artifact) => <button key={artifact.id} onClick={() => void adapter.revealExperimentArtifact?.(job.id, artifact.id)}><FolderOpen size={14} />查看 {artifact.title}</button>)}{job.state === 'running' && <button onClick={() => void adapter.cancelExperimentJob?.(job.id).then(setJob)}>取消任务</button>}{job.state !== 'running' && <><button onClick={() => { setJob(null); setConfirmation('') }}>重新运行全部</button>{job.state === 'failed' && <button onClick={() => { const index = Math.max(0, job.steps.findIndex((step) => step.state === 'failed')); setJob(null); void prepare(index) }}>重试失败步骤</button>}</>}</section>}
    {history.length > 0 && !job && !plan && <details className="experiment-job-history"><summary>本机运行历史 · {history.length}</summary>{history.slice(0, 8).map((item) => <button key={item.id} onClick={() => setJob(item)}><span>{item.state}</span>{new Date(item.startedAt).toLocaleString()}</button>)}<button onClick={() => void adapter.clearExperimentJobs?.().then(() => setHistory([]))}>清空已完成历史</button></details>}
    {message && <p className="experiment-prep-error" role="alert">{message}</p>}
  </div>
}

function JupyterExperimentRunner({ experiment, presetId, enabled }: { experiment: IndexedExperiment; presetId: string; enabled: boolean }) {
  const session = useWorkspaceStore((state) => state.session)!
  const profiles = useComputeStore((state) => state.profiles)
  const activeProfileId = useComputeStore((state) => state.activeProfileId)
  const tokens = useComputeStore((state) => state.tokens)
  const profile = activeComputeProfile({ profiles, activeProfileId })
  const manifest = experiment.manifest!
  const steps = materializeExperimentSteps(manifest, presetId)
  const unsupported = steps.filter((step) => !jupyterSupported(step))
  const [checked, setChecked] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [state, setState] = useState<'idle' | 'checking' | 'ready' | 'running' | 'completed' | 'failed'>('idle')
  const [logs, setLogs] = useState<string[]>([])
  const root = profile.workspacePath?.trim() || '.'
  const workingDirectory = experimentWorkingDirectory(manifest, experiment.manifestPath)
  const context = { workspaceId: session.descriptor.id, noteId: experiment.noteId, ...(session.descriptor.type === 'github' && session.descriptor.config?.repository && session.descriptor.revision ? { workspaceSource: { provider: 'github' as const, repository: session.descriptor.config.repository, revision: session.descriptor.revision } } : {}) }
  const execute = async (code: string) => {
    let failure = ''
    await computeRuntime.execute(profile, tokens[profile.id] ?? '', context, code, { onExecutionCount: () => undefined, onOutput: (output) => { const line = output.type === 'stream' ? output.text : output.type === 'error' ? `${output.name}: ${output.value}` : JSON.stringify(output.data); if (output.type === 'error') failure = line; setLogs((current) => [...current.slice(-300), line]) } })
    if (failure) throw new Error(failure)
  }
  const probe = async () => {
    setLogs([]); setState('checking'); setChecked(false)
    try { await execute(jupyterWorkspaceProbe(root, workingDirectory, steps)); setChecked(true); setState('ready') }
    catch (reason) { setLogs((current) => [...current, reason instanceof Error ? reason.message : String(reason)]); setState('failed') }
  }
  const run = async () => {
    setState('running')
    try { for (const step of steps) { setLogs((current) => [...current, `开始：${step.title}`]); await execute(jupyterStepCode(root, workingDirectory, step)) } setState('completed') }
    catch (reason) { setLogs((current) => [...current, reason instanceof Error ? reason.message : String(reason)]); setState('failed') }
  }
  return <div className="experiment-runner"><header><div><small>Jupyter runner</small><strong>{manifest.presets[presetId]?.title ?? presetId}</strong></div><span>{profile.name} · {profile.kernelName}</span></header>
    <section className="experiment-resource-check"><strong>Workspace 路径映射</strong><span>{root} / {workingDirectory}</span><small>此路径由 Jupyter Server 读取，与 Git Bridge 无关。</small></section>
    {unsupported.length > 0 ? <div className="experiment-run-preview"><WarningCircle size={22} /><strong>当前预设含 Jupyter 不支持的步骤</strong><p>{unsupported.map((step) => `${step.title}（${step.runner}）`).join('、')}。请选择兼容预设，或在桌面版运行。</p></div> : <><button disabled={!enabled || state === 'checking' || state === 'running'} onClick={() => void probe()}><ShieldCheck size={15} />检查路径并连接 Kernel</button>{checked && <label className="experiment-jupyter-confirm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />我已检查脚本、参数和输出范围，允许在此 Jupyter 环境运行</label>}<button disabled={!checked || !confirmed || state === 'running'} onClick={() => void run()}><Play size={15} />运行兼容步骤</button></>}
    {logs.length > 0 && <pre>{logs.join('\n')}</pre>}{state === 'running' && <button onClick={() => void computeRuntime.interrupt().then(() => setState('failed'))}>中断 Kernel</button>}<small>{state}</small>
  </div>
}

function ExperimentList({ experiments }: { experiments: IndexedExperiment[] }) {
  return <main className="experiment-page"><div className="experiment-page__inner"><header className="experiment-page__hero"><span className="workspace-kicker">Project experiments</span><h1>实验</h1><p>查看 Workspace 中声明的多文件项目、环境要求、执行步骤和产物。打开实验不会运行任何代码。</p></header>
    {experiments.length ? <div className="experiment-list">{experiments.map((item) => <Link key={item.key} to={`/experiments/${encodeURIComponent(item.key)}`}><span><Flask size={19} /></span><div><strong>{item.manifest?.experiment.title ?? item.manifestPath}</strong><small>{item.notePath} · {item.requestedPreset ?? item.manifest?.defaultPreset ?? '未指定预设'}</small></div><em>{item.diagnostics.some((diagnostic) => diagnostic.severity === 'error') ? '需修复' : item.readOnly ? '只读' : '可检查'}</em></Link>)}</div> : <section className="experiment-empty"><Flask size={24} /><strong>此 Workspace 还没有项目实验</strong><p>在笔记中加入 tensornote-experiment 引用后，实验会自动出现在这里。</p></section>}
  </div></main>
}

function ResourceSummary({ resources }: { resources: Record<string, unknown> }) {
  const gpu = resources.gpu && typeof resources.gpu === 'object' ? resources.gpu as Record<string, unknown> : undefined
  return <div className="experiment-metrics">
    <span><Cpu size={16} /><strong>{String(resources.cpu ?? '—')}</strong><small>CPU</small></span>
    <span><Gauge size={16} /><strong>{resources.memoryGB ? `${String(resources.memoryGB)} GB` : '—'}</strong><small>内存</small></span>
    <span><HardDrives size={16} /><strong>{resources.diskGB ? `${String(resources.diskGB)} GB` : '—'}</strong><small>磁盘</small></span>
    <span><Cpu size={16} /><strong>{gpu?.count ? String(gpu.count) : gpu?.optional ? '可选' : '—'}</strong><small>GPU</small></span>
  </div>
}

export function ExperimentPage() {
  const { experimentKey } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const session = useWorkspaceStore((state) => state.session)
  const executionOverrides = useWorkspaceStore((state) => state.executionOverrides)
  const [desktopEnvironmentSelection, setDesktopEnvironmentSelection] = useState({ experimentKey, environmentId: '' })
  const desktopEnvironmentId = desktopEnvironmentSelection.experimentKey === experimentKey ? desktopEnvironmentSelection.environmentId : ''
  const setDesktopEnvironmentId = useCallback((environmentId: string) => setDesktopEnvironmentSelection({ experimentKey, environmentId }), [experimentKey])
  if (!session) return <Navigate to="/" replace />
  if (!experimentKey) return <ExperimentList experiments={session.experiments} />
  const experiment = session.experiments.find((item) => item.key === experimentKey)
  if (!experiment) return <main className="experiment-page"><div className="experiment-page__inner"><section className="experiment-empty"><WarningCircle size={24} /><strong>找不到这个实验</strong><p>Workspace 可能已刷新，引用位置也可能发生变化。</p><Link to="/experiments">返回实验列表</Link></section></div></main>
  const manifest = experiment.manifest
  const requestedTab = searchParams.get('tab') as ExperimentTab | null
  const tab: ExperimentTab = requestedTab && tabs.includes(requestedTab) ? requestedTab : 'environment'
  const presetId = experiment.requestedPreset ?? manifest?.defaultPreset ?? ''
  const preset = manifest?.presets[presetId]
  const capability = describeExperimentCapability({ experiment, session, host: getHostAdapter().capabilities, deploymentMode: deploymentAdapter.mode, executionEnabled: resolveWorkspaceExecutionPolicy(session, executionOverrides).enabled })
  const binder = createBinderExperimentTarget(session, experiment)
  const setTab = (next: ExperimentTab) => setSearchParams(next === 'environment' ? {} : { tab: next }, { replace: true })

  return <main className="experiment-page"><div className="experiment-page__inner">
    <Link className="experiment-back" to="/experiments"><ArrowLeft size={14} />全部实验</Link>
    <header className="experiment-page__hero experiment-page__hero--detail"><div><span className="workspace-kicker">Project experiment</span><h1>{manifest?.experiment.title ?? '实验配置需要修复'}</h1><p>{manifest?.experiment.description ?? `引用：${experiment.manifestPath}`}</p></div><div className="experiment-badges"><span>{capability.platform}</span>{manifest && <span>{difficultyLabels[manifest.experiment.difficulty]}</span>}<span>{experiment.readOnly ? '只读' : 'Manifest v1'}</span></div></header>
    {manifest && <><ResourceSummary resources={manifest.resources} /><div className="experiment-context"><span><Clock size={15} />{manifest.experiment.estimatedMinutes ? `预计 ${manifest.experiment.estimatedMinutes} 分钟` : '未声明预计时长'}</span><span><FolderOpen size={15} />{experiment.manifestPath}</span><span><FileCode size={15} />预设：{preset?.title ?? presetId}</span></div></>}
    <section className={`experiment-readiness is-${capability.tone}`}><span>{capability.tone === 'danger' ? <WarningCircle size={20} /> : <ShieldCheck size={20} />}</span><div><strong>{capability.title}</strong><p>{capability.detail}</p></div></section>
    {binder && <section className={`experiment-binder ${binder.configured ? '' : 'is-unavailable'}`}><div><small>固定 Revision · {binder.revision.slice(0, 12)}</small><strong>在 Binder 临时环境中打开</strong><p>{binder.configured ? `将从 ${binder.repository} 构建临时环境${binder.notebook ? `并打开 ${binder.notebook}` : ''}。首次构建可能需要数分钟，资源有限且文件不会持久保存。` : `${binder.reason} 可继续阅读，或下载桌面版并克隆仓库。`}</p></div>{binder.configured && <a href={binder.url} target="_blank" rel="noreferrer">打开 Binder <ArrowLeft size={14} /></a>}</section>}
    {experiment.diagnostics.length > 0 && <section className="experiment-diagnostics" aria-label="实验诊断"><strong>诊断</strong>{experiment.diagnostics.map((diagnostic, index) => <p key={`${diagnostic.code}:${index}`} className={`is-${diagnostic.severity}`}><WarningCircle size={14} />{diagnostic.message}{diagnostic.field ? <code>{diagnostic.field}</code> : null}</p>)}</section>}
    <nav className="experiment-tabs" aria-label="实验详情">{tabs.map((id) => <button key={id} className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined}>{tabLabels[id]}</button>)}</nav>
    <section className="experiment-tab-panel">
      {!manifest ? <div className="experiment-empty experiment-empty--compact"><WarningCircle size={22} /><strong>无法解析 Manifest</strong><p>修复诊断后刷新 Workspace，TensorNote 会重新索引。</p></div> : tab === 'environment' ? <><div className="experiment-environments">{Object.entries(manifest.environments).map(([id, environment]) => <article key={id} className={id === preset?.environment ? 'is-selected' : ''}><header><div><small>{id === preset?.environment ? '当前预设' : '可用环境'}</small><strong>{id}</strong></div><span>Python {environment.python || '未指定'}</span></header>{environment.extends && <p>继承 <code>{environment.extends}</code></p>}<ul>{environment.files.map((file) => <li key={file}><FileCode size={14} />{file}</li>)}</ul></article>)}</div>{Object.keys(manifest.downloads ?? {}).length > 0 && <div className="experiment-downloads"><strong>模型与数据下载</strong>{Object.entries(manifest.downloads ?? {}).map(([id, item]) => <article key={id}><a href={item.url} target="_blank" rel="noreferrer">{item.title}</a><span>{item.sizeMB ? `${item.sizeMB} MB` : '大小未声明'} · 缓存 {item.cache}{item.license ? ` · ${item.license}` : ''}</span><code>{item.sha256 ? `SHA-256 ${item.sha256}` : '未声明校验和'}</code></article>)}</div>}{preset && <><DesktopEnvironmentPreparation experiment={experiment} environmentId={preset.environment} enabled={!experiment.readOnly && session.trusted && resolveWorkspaceExecutionPolicy(session, executionOverrides).enabled} onEnvironmentReady={setDesktopEnvironmentId} /><DesktopDependencyInstaller key={experiment.key} experiment={experiment} manifestEnvironmentId={preset.environment} enabled={!experiment.readOnly && session.trusted && resolveWorkspaceExecutionPolicy(session, executionOverrides).enabled} environmentId={desktopEnvironmentId} onEnvironmentChange={setDesktopEnvironmentId} /></>}</>
      : tab === 'steps' ? <ol className="experiment-steps">{(preset?.steps ?? []).map((id, index) => { const step = manifest.steps[id]; return <li key={id}><span>{index + 1}</span><div><small>{step.runner}</small><strong>{step.title}</strong><code>{step.file ?? step.module}</code>{step.dependsOn.length > 0 && <p>依赖：{step.dependsOn.join('、')}</p>}</div></li> })}</ol>
      : tab === 'files' ? <div className="experiment-files"><article><small>Manifest</small><strong>{experiment.manifestPath}</strong></article>{Object.entries(manifest.steps).map(([id, step]) => <article key={id}><small>{step.runner}</small><strong>{step.file ?? step.module}</strong><span>{step.title}</span></article>)}</div>
      : tab === 'run' ? getHostAdapter().capabilities.processManagement ? <DesktopExperimentRunner experiment={experiment} presetId={presetId} enabled={!experiment.readOnly && session.trusted && resolveWorkspaceExecutionPolicy(session, executionOverrides).enabled} environmentId={desktopEnvironmentId} onEnvironmentChange={setDesktopEnvironmentId} /> : <JupyterExperimentRunner experiment={experiment} presetId={presetId} enabled={!experiment.readOnly && session.trusted && resolveWorkspaceExecutionPolicy(session, executionOverrides).enabled} />
      : <div className="experiment-artifacts">{Object.keys(manifest.artifacts).length ? Object.entries(manifest.artifacts).map(([id, artifact]) => { const workspaceId = session.descriptor.config?.provider === 'native-local' ? session.descriptor.config.workspaceId : undefined; const artifactPath = `${experimentWorkingDirectory(manifest, experiment.manifestPath)}/${artifact.path}`.replace(/^\.\//, ''); return <article key={id}><span><FolderOpen size={18} /></span><div><strong>{artifact.title}</strong><small>{artifact.kind} · {artifact.path}</small></div>{workspaceId && getHostAdapter().revealWorkspaceItem && <button onClick={() => void getHostAdapter().revealWorkspaceItem!(workspaceId, artifactPath)}>在文件管理器中显示</button>}</article> }) : <div className="experiment-empty experiment-empty--compact"><CheckCircle size={22} /><strong>未声明产物</strong><p>此实验不会在完成后收集特定文件。</p></div>}</div>}
    </section>
    <footer className="experiment-source"><span>来源笔记</span><Link to={`/notes/${encodeURIComponent(experiment.noteId)}`}>{session.documentById.get(experiment.noteId)?.frontmatter.title ?? experiment.notePath}</Link></footer>
  </div></main>
}
