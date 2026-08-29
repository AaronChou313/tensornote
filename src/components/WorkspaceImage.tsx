import { useEffect, useState } from 'react'

interface WorkspaceImageProps {
  src: string
  alt: string
  documentPath: string
  resolveAssetUrl?: (path: string) => Promise<string>
}

export function WorkspaceImage({ src, alt, documentPath, resolveAssetUrl }: WorkspaceImageProps) {
  const requestKey = `${documentPath}:${src}`
  const isDirectSource = /^(?:https?:|data:|blob:)/i.test(src)
  const [result, setResult] = useState<{ key: string; resolved: string; failed: boolean }>(() => ({
    key: requestKey,
    resolved: isDirectSource || !resolveAssetUrl ? src : '',
    failed: false,
  }))

  useEffect(() => {
    let cancelled = false
    if (!src || isDirectSource || !resolveAssetUrl) return
    void resolveAssetUrl(src)
      .then((url) => { if (!cancelled) setResult({ key: requestKey, resolved: url, failed: false }) })
      .catch(() => { if (!cancelled) setResult({ key: requestKey, resolved: '', failed: true }) })
    return () => { cancelled = true }
  }, [isDirectSource, requestKey, resolveAssetUrl, src])

  const resolved = isDirectSource || !resolveAssetUrl ? src : result.key === requestKey ? result.resolved : ''
  const failed = result.key === requestKey && result.failed
  if (failed) return <span className="workspace-image-error">无法加载图片：{src}</span>
  if (!resolved) return <span className="workspace-image-loading" aria-label={`正在加载图片 ${alt || src}`} />
  return <img src={resolved} alt={alt} onError={() => setResult({ key: requestKey, resolved: '', failed: true })} />
}
