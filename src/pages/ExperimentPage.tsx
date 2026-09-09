import { ArrowLeft, CheckCircle, Clock, Cpu, FileCode, Flask, FolderOpen, Gauge, HardDrives, Play, ShieldCheck, WarningCircle } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { deploymentAdapter } from '../deployment/config'
import { describeExperimentCapability } from '../experiments/capabilities'
import type { IndexedExperiment } from '../experiments/types'
import type { EnvironmentPlan, ExperimentJob, ExperimentRunPlan, RuntimeDiscovery, RuntimeOperation } from '../host/types'
import { resolveExperimentEnvironmentFiles } from '../experiments/environment'
import { experimentWorkingDirectory, materializeExperimentSteps } from '../experiments/runPlan'
import { getHostAdapter } from '../host/runtime'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import { resolveWorkspaceExecutionPolicy } from '../workspace/executionPolicy'

const tabs = ['environment', 'steps', 'files', 'run', 'artifacts'] as const
type ExperimentTab = typeof tabs[number]
const tabLabels: Record<ExperimentTab, string> = { environment: '环境', steps: '步骤', files: '文件', run: '运行', artifacts: '产物' }
const difficultyLabels = { basic: '基础', medium: '进阶', heavy: '重型' } as const

function DesktopEnvironmentPreparation({ experiment, environmentId, enabled }: { experiment: IndexedExperiment; environmentId: string; enabled: boolean }) {
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
    const timer = window.setInterval(() => void adapter.getLocalRuntimeOperation!(operation.id).then(setOperation).catch((reason) => setMessage(String(reason))), 800)
    return () => window.clearInterval(timer)
  }, [adapter, operation])
  if (!adapter.capabilities.environmentDiscovery || !workspaceId) return <aside className="experiment-platform-note"><strong>环境准备需要桌面版的本地 Workspace</strong><p>Web 入口仍可检查依赖文件；后续阶段会提供 Jupyter 兼容子集。</p></aside>
  const inspect = async () => {
    setMessage(null)
    try { setDiscovery(await adapter.discoverLocalRuntime!(workspaceId)) } catch (reason) { setMessage(reason instanceof Error ? reason.message : String(reason)) }
  }
  const createPlan = async () => {
    if (!discovery || !adapter.planLocalEnvironment) return
    const manager = discovery.tools.some((tool) => tool.kind === 'uv') ? 'uv' : 'venv'
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
    {plan && <div className="experiment-install-plan"><strong>{plan.name} · Python {plan.pythonVersion}</strong><ol>{plan.steps.map((step) => <li key={step}>{step}</li>)}</ol>{plan.dependencies?.map((dependency) => <code key={dependency.path}>{dependency.path} · {dependency.sha256.slice(0, 12)}… · {dependency.size} B</code>)}<label>输入 <b>{plan.confirmation}</b><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label><button disabled={confirmation !== plan.confirmation} onClick={() => void apply()}>确认并准备环境</button></div>}
    {operation && <div className="experiment-install-operation"><strong>{operation.state} · {operation.progress}%</strong><progress max="100" value={operation.progress} /><pre>{operation.logs.map((line) => line.text).join('\n') || '等待输出…'}</pre>{operation.state === 'running' && <button onClick={() => void adapter.cancelLocalRuntimeOperation?.(operation.id).then(setOperation)}>取消并清理</button>}</div>}
    {message && <p role="alert" className="experiment-prep-error">{message}</p>}
  </aside>
}

function DesktopExperimentRunner({ experiment, presetId, enabled }: { experiment: IndexedExperiment; presetId: string; enabled: boolean }) {
  const session = useWorkspaceStore((state) => state.session)!
  const adapter = getHostAdapter()
  const [discovery, setDiscovery] = useState<RuntimeDiscovery | null>(null)
  const [environmentId, setEnvironmentId] = useState('')
  const [plan, setPlan] = useState<ExperimentRunPlan | null>(null)
  const [confirmation, setConfirmation] = useState('')
  const [job, setJob] = useState<ExperimentJob | null>(null)
  const [history, setHistory] = useState<ExperimentJob[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const workspaceId = session.descriptor.config?.provider === 'native-local' ? session.descriptor.config.workspaceId : undefined
  const manifest = experiment.manifest!
  useEffect(() => { if (workspaceId && adapter.discoverLocalRuntime) void adapter.discoverLocalRuntime(workspaceId).then((next) => { setDiscovery(next); setEnvironmentId((current) => current || next.environments.find((item) => item.managed)?.id || '') }); if (adapter.listExperimentJobs) void adapter.listExperimentJobs().then((items) => setHistory(items.filter((item) => item.experimentId === manifest.experiment.id))) }, [adapter, manifest.experiment.id, workspaceId])
  useEffect(() => {
    if (!job || job.state !== 'running' || !adapter.getExperimentJob) return
    const timer = window.setInterval(() => void adapter.getExperimentJob!(job.id).then(setJob).catch((reason) => setMessage(String(reason))), 600)
    return () => window.clearInterval(timer)
  }, [adapter, job])
  if (!adapter.planExperimentRun || !workspaceId) return <div className="experiment-run-preview"><Play size={25} /><strong>此平台不支持原生多脚本任务</strong><p>请使用桌面版打开本地 Workspace；Web 兼容步骤将在后续阶段通过 Jupyter 运行。</p></div>
  const prepare = async (fromStep = 0) => {
    setMessage(null)
    try { setPlan(await adapter.planExperimentRun!({ workspaceId, environmentId, experimentId: manifest.experiment.id, presetId, manifestPath: experiment.manifestPath, workingDirectory: experimentWorkingDirectory(manifest, experiment.manifestPath), steps: materializeExperimentSteps(manifest, presetId).slice(fromStep), ...(session.descriptor.revision ? { revision: session.descriptor.revision } : {}) })); setConfirmation('') }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : String(reason)) }
  }
  const start = async () => { if (!plan) return; try { setJob(await adapter.startExperimentJob!(plan.id, environmentId, confirmation)); setPlan(null) } catch (reason) { setMessage(reason instanceof Error ? reason.message : String(reason)) } }
  return <div className="experiment-runner"><header><div><small>Desktop runner</small><strong>运行 {manifest.presets[presetId]?.title ?? presetId}</strong></div><select value={environmentId} onChange={(event) => setEnvironmentId(event.target.value)}><option value="">选择 Managed Environment</option>{discovery?.environments.filter((item) => item.managed).map((item) => <option key={item.id} value={item.id}>{item.name} · Python {item.pythonVersion}</option>)}</select></header>
    {!job && !plan && <button disabled={!enabled || !environmentId} onClick={() => void prepare()}><ShieldCheck size={15} />预览运行计划</button>}
    {plan && <section className="experiment-run-plan"><strong>{plan.steps.length} 个步骤 · {plan.outputs.length} 个输出范围</strong>{plan.steps.map((step) => <p key={step.id}><code>{step.runner}</code>{step.title}<span>{[step.file ?? step.module, ...step.args].filter(Boolean).join(' ')}</span></p>)}<small>输入摘要：{plan.inputs.map((input) => `${input.path} ${input.sha256.slice(0, 8)}…`).join(' · ')}</small><label>输入 <b>{plan.confirmation}</b><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label><button disabled={confirmation !== plan.confirmation} onClick={() => void start()}><Play size={15} />确认并运行</button></section>}
    {job && <section className="experiment-job" data-state={job.state}><header><strong>{job.state}</strong><span>{new Date(job.startedAt).toLocaleTimeString()}</span></header><div>{job.steps.map((step) => <p key={step.id} data-state={step.state}><span />{step.title}<em>{step.state}</em></p>)}</div><pre>{job.logs.map((line) => `[${line.stream}] ${line.text}`).join('\n') || '等待日志…'}</pre>{job.state === 'running' && <button onClick={() => void adapter.cancelExperimentJob?.(job.id).then(setJob)}>取消任务</button>}{job.state !== 'running' && <><button onClick={() => { setJob(null); setConfirmation('') }}>重新运行全部</button>{job.state === 'failed' && <button onClick={() => { const index = Math.max(0, job.steps.findIndex((step) => step.state === 'failed')); setJob(null); void prepare(index) }}>重试失败步骤</button>}</>}</section>}
    {history.length > 0 && !job && !plan && <details className="experiment-job-history"><summary>本机运行历史 · {history.length}</summary>{history.slice(0, 8).map((item) => <button key={item.id} onClick={() => setJob(item)}><span>{item.state}</span>{new Date(item.startedAt).toLocaleString()}</button>)}<button onClick={() => void adapter.clearExperimentJobs?.().then(() => setHistory([]))}>清空已完成历史</button></details>}
    {message && <p className="experiment-prep-error" role="alert">{message}</p>}
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
  const setTab = (next: ExperimentTab) => setSearchParams(next === 'environment' ? {} : { tab: next }, { replace: true })

  return <main className="experiment-page"><div className="experiment-page__inner">
    <Link className="experiment-back" to="/experiments"><ArrowLeft size={14} />全部实验</Link>
    <header className="experiment-page__hero experiment-page__hero--detail"><div><span className="workspace-kicker">Project experiment</span><h1>{manifest?.experiment.title ?? '实验配置需要修复'}</h1><p>{manifest?.experiment.description ?? `引用：${experiment.manifestPath}`}</p></div><div className="experiment-badges"><span>{capability.platform}</span>{manifest && <span>{difficultyLabels[manifest.experiment.difficulty]}</span>}<span>{experiment.readOnly ? '只读' : 'Manifest v1'}</span></div></header>
    {manifest && <><ResourceSummary resources={manifest.resources} /><div className="experiment-context"><span><Clock size={15} />{manifest.experiment.estimatedMinutes ? `预计 ${manifest.experiment.estimatedMinutes} 分钟` : '未声明预计时长'}</span><span><FolderOpen size={15} />{experiment.manifestPath}</span><span><FileCode size={15} />预设：{preset?.title ?? presetId}</span></div></>}
    <section className={`experiment-readiness is-${capability.tone}`}><span>{capability.tone === 'danger' ? <WarningCircle size={20} /> : <ShieldCheck size={20} />}</span><div><strong>{capability.title}</strong><p>{capability.detail}</p></div></section>
    {experiment.diagnostics.length > 0 && <section className="experiment-diagnostics" aria-label="实验诊断"><strong>诊断</strong>{experiment.diagnostics.map((diagnostic, index) => <p key={`${diagnostic.code}:${index}`} className={`is-${diagnostic.severity}`}><WarningCircle size={14} />{diagnostic.message}{diagnostic.field ? <code>{diagnostic.field}</code> : null}</p>)}</section>}
    <nav className="experiment-tabs" aria-label="实验详情">{tabs.map((id) => <button key={id} className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined}>{tabLabels[id]}</button>)}</nav>
    <section className="experiment-tab-panel">
      {!manifest ? <div className="experiment-empty experiment-empty--compact"><WarningCircle size={22} /><strong>无法解析 Manifest</strong><p>修复诊断后刷新 Workspace，TensorNote 会重新索引。</p></div> : tab === 'environment' ? <><div className="experiment-environments">{Object.entries(manifest.environments).map(([id, environment]) => <article key={id} className={id === preset?.environment ? 'is-selected' : ''}><header><div><small>{id === preset?.environment ? '当前预设' : '可用环境'}</small><strong>{id}</strong></div><span>Python {environment.python || '未指定'}</span></header>{environment.extends && <p>继承 <code>{environment.extends}</code></p>}<ul>{environment.files.map((file) => <li key={file}><FileCode size={14} />{file}</li>)}</ul></article>)}</div>{preset && <DesktopEnvironmentPreparation experiment={experiment} environmentId={preset.environment} enabled={!experiment.readOnly && session.trusted && resolveWorkspaceExecutionPolicy(session, executionOverrides).enabled} />}</>
      : tab === 'steps' ? <ol className="experiment-steps">{(preset?.steps ?? []).map((id, index) => { const step = manifest.steps[id]; return <li key={id}><span>{index + 1}</span><div><small>{step.runner}</small><strong>{step.title}</strong><code>{step.file ?? step.module}</code>{step.dependsOn.length > 0 && <p>依赖：{step.dependsOn.join('、')}</p>}</div></li> })}</ol>
      : tab === 'files' ? <div className="experiment-files"><article><small>Manifest</small><strong>{experiment.manifestPath}</strong></article>{Object.entries(manifest.steps).map(([id, step]) => <article key={id}><small>{step.runner}</small><strong>{step.file ?? step.module}</strong><span>{step.title}</span></article>)}</div>
      : tab === 'run' ? <DesktopExperimentRunner experiment={experiment} presetId={presetId} enabled={!experiment.readOnly && session.trusted && resolveWorkspaceExecutionPolicy(session, executionOverrides).enabled} />
      : <div className="experiment-artifacts">{Object.keys(manifest.artifacts).length ? Object.entries(manifest.artifacts).map(([id, artifact]) => { const workspaceId = session.descriptor.config?.provider === 'native-local' ? session.descriptor.config.workspaceId : undefined; const artifactPath = `${experimentWorkingDirectory(manifest, experiment.manifestPath)}/${artifact.path}`.replace(/^\.\//, ''); return <article key={id}><span><FolderOpen size={18} /></span><div><strong>{artifact.title}</strong><small>{artifact.kind} · {artifact.path}</small></div>{workspaceId && getHostAdapter().revealWorkspaceItem && <button onClick={() => void getHostAdapter().revealWorkspaceItem!(workspaceId, artifactPath)}>在文件管理器中显示</button>}</article> }) : <div className="experiment-empty experiment-empty--compact"><CheckCircle size={22} /><strong>未声明产物</strong><p>此实验不会在完成后收集特定文件。</p></div>}</div>}
    </section>
    <footer className="experiment-source"><span>来源笔记</span><Link to={`/notes/${encodeURIComponent(experiment.noteId)}`}>{session.documentById.get(experiment.noteId)?.frontmatter.title ?? experiment.notePath}</Link></footer>
  </div></main>
}
