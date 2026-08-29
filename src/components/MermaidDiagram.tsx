import { useEffect, useId, useState } from 'react'
import { useAppStore } from '../store/useAppStore'

export function MermaidDiagram({ chart }: { chart: string }) {
  const id = `mermaid-${useId().replace(/:/g, '')}`
  const theme = useAppStore((state) => state.theme)
  const [svg, setSvg] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void import('mermaid').then(({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: theme === 'dark' ? 'dark' : 'neutral',
        fontFamily: 'Avenir Next, PingFang SC, sans-serif',
        flowchart: { curve: 'basis', htmlLabels: false },
      })
      return mermaid.render(id, chart)
    })
      .then(({ svg: result }) => {
        if (!cancelled) {
          setSvg(result)
          setError(null)
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Mermaid 图示无法渲染')
      })
    return () => {
      cancelled = true
    }
  }, [chart, id, theme])

  if (error) return <div className="mermaid-error">{error}</div>
  if (!svg) return <div className="mermaid-loading" aria-label="图示加载中" />
  return <div className="mermaid-diagram" dangerouslySetInnerHTML={{ __html: svg }} />
}
