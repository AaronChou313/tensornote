import { FileX } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="route-status-page">
      <FileX size={30} weight="duotone" />
      <h1>这里没有可打开的文档</h1>
      <p>路径可能已变化，或当前 Workspace 中不存在这篇笔记。</p>
      <Link to="/">返回 Workspace 首页</Link>
    </main>
  )
}
