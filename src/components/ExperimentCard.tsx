import { ArrowRight, Flask, WarningCircle } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { parseExperimentReference } from '../experiments/referenceParser'
import { useWorkspaceStore } from '../store/useWorkspaceStore'

const difficultyLabel = { basic: '基础', medium: '进阶', heavy: '重型' } as const

export function ExperimentCard({ source, noteId }: { source: string; noteId?: string }) {
  const experiments = useWorkspaceStore((state) => state.session?.experiments ?? [])
  const reference = parseExperimentReference(source)
  const candidates = experiments.filter((item) => item.noteId === noteId)
  const experiment = candidates.find((item) => item.requestedPreset === reference.preset && (item.manifestPath.endsWith(reference.manifest.replace(/^\.\//, '')) || item.manifestPath === reference.manifest))
    ?? candidates.find((item) => item.requestedPreset === reference.preset)
  if (!reference.manifest) return <aside className="experiment-card experiment-card--error"><WarningCircle size={20} /><div><strong>实验引用无效</strong><p>请在 Fence 中声明 manifest。</p></div></aside>
  if (!experiment?.manifest) return <aside className="experiment-card experiment-card--error"><WarningCircle size={20} /><div><strong>无法载入实验</strong><p>{experiment?.diagnostics[0]?.message ?? `未找到 ${reference.manifest}`}</p></div></aside>
  const manifest = experiment.manifest
  const presetId = experiment.requestedPreset ?? manifest.defaultPreset
  const preset = manifest.presets[presetId]
  const hasErrors = experiment.diagnostics.some((item) => item.severity === 'error')
  return <Link className="experiment-card" to={`/experiments/${encodeURIComponent(experiment.key)}`}>
    <span className="experiment-card__icon"><Flask size={21} /></span>
    <span className="experiment-card__content"><small>Project experiment · {difficultyLabel[manifest.experiment.difficulty]}</small><strong>{manifest.experiment.title}</strong><span>{preset?.title ?? presetId} · {preset?.steps.length ?? 0} 个步骤{manifest.experiment.estimatedMinutes ? ` · 约 ${manifest.experiment.estimatedMinutes} 分钟` : ''}</span></span>
    <span className={`experiment-card__status ${hasErrors ? 'is-error' : ''}`}>{hasErrors ? '需修复' : experiment.readOnly ? '只读' : '已索引'}</span>
    <span className="experiment-card__action">打开实验 <ArrowRight size={14} /></span>
  </Link>
}
