import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { useAppStore } from './store/useAppStore'
import { GitHubOpenPage } from './pages/GitHubOpenPage'
import { HomePage } from './pages/HomePage'
import { NotePage } from './pages/NotePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { WorkspacePage } from './pages/WorkspacePage'
import { KnowledgePage } from './pages/KnowledgePage'
import { StructuredKnowledgePage } from './pages/StructuredKnowledgePage'

function RouteScrollReset() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])

  return null
}

export function App() {
  const theme = useAppStore((state) => state.theme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  return (
    <>
      <RouteScrollReset />
      <Routes>
        <Route index element={<HomePage />} />
        <Route path="open/github/:owner/:repo" element={<GitHubOpenPage />} />
        <Route element={<AppShell />}>
          <Route path="workspace" element={<WorkspacePage />} />
          <Route path="knowledge" element={<KnowledgePage />} />
          <Route path="database" element={<StructuredKnowledgePage />} />
          <Route path="notes/:noteId" element={<NotePage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  )
}
