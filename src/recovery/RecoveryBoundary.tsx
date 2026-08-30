import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ArrowClockwise, Bug, House, Copy } from '@phosphor-icons/react'
import { Button } from '../components/ui/Button'

export interface CrashReport {
  version: 1
  message: string
  stack?: string
  componentStack?: string
  path: string
  occurredAt: string
  userAgent: string
}

export function buildCrashReport(error: unknown, componentStack?: string): CrashReport {
  const actual = error instanceof Error ? error : new Error(String(error))
  return {
    version: 1,
    message: actual.message || 'Unknown render error',
    stack: actual.stack,
    componentStack: componentStack || undefined,
    path: window.location.pathname,
    occurredAt: new Date().toISOString(),
    userAgent: navigator.userAgent,
  }
}

interface RecoveryBoundaryState {
  report: CrashReport | null
  copied: boolean
}

export class RecoveryBoundary extends Component<{ children: ReactNode }, RecoveryBoundaryState> {
  state: RecoveryBoundaryState = { report: null, copied: false }

  static getDerivedStateFromError(error: unknown): Partial<RecoveryBoundaryState> {
    return { report: buildCrashReport(error) }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    const report = buildCrashReport(error, info.componentStack ?? undefined)
    this.setState({ report })
    try { sessionStorage.setItem('tensornote:last-crash', JSON.stringify(report)) } catch { /* Diagnostics remain visible in memory. */ }
  }

  private copy = async () => {
    if (!this.state.report) return
    try {
      await navigator.clipboard.writeText(JSON.stringify(this.state.report, null, 2))
      this.setState({ copied: true })
    } catch {
      this.setState({ copied: false })
    }
  }

  render() {
    if (!this.state.report) return this.props.children
    const home = import.meta.env.BASE_URL || '/'
    return <main className="crash-recovery" role="alert">
      <div className="crash-recovery__mark"><Bug size={28} weight="duotone" /></div>
      <p className="crash-recovery__kicker">Recovery mode</p>
      <h1>界面遇到了问题，内容文件没有被修改</h1>
      <p>TensorNote 已停止当前渲染，避免错误继续扩散。已保存的 Markdown 仍在原 Workspace；未保存草稿会在重新打开笔记时提供恢复。</p>
      <div className="crash-recovery__actions">
        <Button variant="primary" onClick={() => window.location.reload()}><ArrowClockwise size={16} />重新加载</Button>
        <Button variant="secondary" onClick={() => window.location.assign(home)}><House size={16} />返回启动页</Button>
        <Button variant="ghost" onClick={() => void this.copy()}><Copy size={16} />{this.state.copied ? '已复制' : '复制诊断'}</Button>
      </div>
      <details><summary>查看诊断信息</summary><pre>{JSON.stringify(this.state.report, null, 2)}</pre></details>
    </main>
  }
}
