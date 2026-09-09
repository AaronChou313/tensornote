import { useMemo, useState } from 'react'
import { CaretDown, Copy, Info } from '@phosphor-icons/react'
import { Button } from '../ui/Button'

export function LocalWebRuntimeGuide() {
  const [copied, setCopied] = useState(false)
  const command = useMemo(() => {
    const origin = typeof window === 'undefined' ? 'http://127.0.0.1:5173' : window.location.origin
    return `jupyter server --no-browser --ServerApp.allow_origin=${origin}`
  }, [])
  const copy = async () => {
    await navigator.clipboard.writeText(command)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }
  return <section className="settings-local-web-runtime" aria-label="本地浏览器连接 Jupyter">
    <div className="settings-local-web-runtime__summary"><span><Info size={17} /></span><div><strong>浏览器需要连接已运行的 Jupyter</strong><small>TensorNote Web 不能读取 Python 环境或启动本机进程。请在终端启动 Server，再填写下方连接。</small></div></div>
    <details>
      <summary><span>查看启动命令</span><CaretDown size={14} /></summary>
      <div><code>{command}</code><Button variant="secondary" size="sm" onClick={() => void copy()}><Copy size={14} />{copied ? '已复制' : '复制命令'}</Button></div>
      <p>在 Workspace 根目录运行。终端会显示 Server URL 与临时 Token；Token 只保存在当前浏览器会话。</p>
    </details>
  </section>
}
