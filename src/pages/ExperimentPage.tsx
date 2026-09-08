import { ArrowLeft, CheckCircle, Clock, Cpu, FileCode, Flask, FolderOpen, Gauge, HardDrives, Play, ShieldCheck, WarningCircle } from '@phosphor-icons/react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { deploymentAdapter } from '../deployment/config'
import { describeExperimentCapability } from '../experiments/capabilities'
import type { IndexedExperiment } from '../experiments/types'
import { getHostAdapter } from '../host/runtime'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import { resolveWorkspaceExecutionPolicy } from '../workspace/executionPolicy'

const tabs = ['environment', 'steps', 'files', 'run', 'artifacts'] as const
type ExperimentTab = typeof tabs[number]
const tabLabels: Record<ExperimentTab, string> = { environment: '环境', steps: '步骤', files: '文件', run: '运行', artifacts: '产物' }
const difficultyLabels = { basic: '基础', medium: '进阶', heavy: '重型' } as const

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
      {!manifest ? <div className="experiment-empty experiment-empty--compact"><WarningCircle size={22} /><strong>无法解析 Manifest</strong><p>修复诊断后刷新 Workspace，TensorNote 会重新索引。</p></div> : tab === 'environment' ? <div className="experiment-environments">{Object.entries(manifest.environments).map(([id, environment]) => <article key={id} className={id === preset?.environment ? 'is-selected' : ''}><header><div><small>{id === preset?.environment ? '当前预设' : '可用环境'}</small><strong>{id}</strong></div><span>Python {environment.python || '未指定'}</span></header>{environment.extends && <p>继承 <code>{environment.extends}</code></p>}<ul>{environment.files.map((file) => <li key={file}><FileCode size={14} />{file}</li>)}</ul></article>)}</div>
      : tab === 'steps' ? <ol className="experiment-steps">{(preset?.steps ?? []).map((id, index) => { const step = manifest.steps[id]; return <li key={id}><span>{index + 1}</span><div><small>{step.runner}</small><strong>{step.title}</strong><code>{step.file ?? step.module}</code>{step.dependsOn.length > 0 && <p>依赖：{step.dependsOn.join('、')}</p>}</div></li> })}</ol>
      : tab === 'files' ? <div className="experiment-files"><article><small>Manifest</small><strong>{experiment.manifestPath}</strong></article>{Object.entries(manifest.steps).map(([id, step]) => <article key={id}><small>{step.runner}</small><strong>{step.file ?? step.module}</strong><span>{step.title}</span></article>)}</div>
      : tab === 'run' ? <div className="experiment-run-preview"><Play size={25} /><strong>{capability.title}</strong><p>{capability.detail}</p><button disabled><Play size={15} />运行功能将在下一阶段提供</button><small>环境变更和脚本执行始终需要明确确认。</small></div>
      : <div className="experiment-artifacts">{Object.keys(manifest.artifacts).length ? Object.entries(manifest.artifacts).map(([id, artifact]) => <article key={id}><span><FolderOpen size={18} /></span><div><strong>{artifact.title}</strong><small>{artifact.kind} · {artifact.path}</small></div></article>) : <div className="experiment-empty experiment-empty--compact"><CheckCircle size={22} /><strong>未声明产物</strong><p>此实验不会在完成后收集特定文件。</p></div>}</div>}
    </section>
    <footer className="experiment-source"><span>来源笔记</span><Link to={`/notes/${encodeURIComponent(experiment.noteId)}`}>{session.documentById.get(experiment.noteId)?.frontmatter.title ?? experiment.notePath}</Link></footer>
  </div></main>
}
