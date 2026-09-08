import type { DeploymentMode } from '../deployment/config'
import type { HostCapabilities } from '../host/types'
import type { WorkspaceSession } from '../workspace/types'
import type { IndexedExperiment } from './types'

export type ExperimentAvailability = 'invalid' | 'read-only' | 'needs-trust' | 'execution-disabled' | 'preview'

export interface ExperimentCapabilitySummary {
  availability: ExperimentAvailability
  platform: string
  canInspect: boolean
  canRun: false
  tone: 'danger' | 'warning' | 'neutral' | 'success'
  title: string
  detail: string
}

export function describeExperimentCapability(input: {
  experiment: IndexedExperiment
  session: WorkspaceSession
  host: HostCapabilities
  deploymentMode: DeploymentMode
  executionEnabled: boolean
}): ExperimentCapabilitySummary {
  const { experiment, session, host, deploymentMode, executionEnabled } = input
  const platform = host.desktopShell ? 'Desktop' : deploymentMode === 'static' ? 'Online Web' : 'Local Web'
  if (!experiment.manifest || experiment.diagnostics.some((item) => item.severity === 'error')) return {
    availability: 'invalid', platform, canInspect: true, canRun: false, tone: 'danger',
    title: '实验配置需要修复', detail: '清单或引用未通过校验。修复下方诊断后才能准备运行。',
  }
  if (experiment.readOnly || session.compatibility.readOnly) return {
    availability: 'read-only', platform, canInspect: true, canRun: false, tone: 'warning',
    title: '当前以只读模式打开', detail: '可以检查环境、步骤与产物，但此 Workspace 不能执行实验。',
  }
  if (!session.trusted) return {
    availability: 'needs-trust', platform, canInspect: true, canRun: false, tone: 'warning',
    title: '需要信任当前 Revision', detail: 'TensorNote 不会在未信任的 GitHub Revision 中准备或运行代码。',
  }
  if (!executionEnabled) return {
    availability: 'execution-disabled', platform, canInspect: true, canRun: false, tone: 'neutral',
    title: 'Workspace 执行已关闭', detail: '在设置中允许执行后，仍会逐次展示安装与运行计划并请求确认。',
  }
  const detail = host.processManagement
    ? '桌面运行器将在下一阶段接入。当前版本可完整检查实验计划，不会创建环境或启动进程。'
    : deploymentMode === 'static'
      ? '在线版当前提供安全阅读；后续将支持兼容的远程 Jupyter 与固定 Revision 的 Binder。'
      : '本地 Web 后续可通过 Jupyter 运行兼容步骤；原生进程仍需要桌面版。'
  return { availability: 'preview', platform, canInspect: true, canRun: false, tone: 'success', title: '实验计划可检查', detail }
}
