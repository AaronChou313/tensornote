import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAppStore } from './store/useAppStore'
import { HomePage } from './pages/HomePage'
import { DesktopWorkspaceOpenBridge } from './host/DesktopWorkspaceOpenBridge'
import { DesktopDeepLinkBridge } from './host/DesktopDeepLinkBridge'
import { deploymentAdapter } from './deployment/config'
import { createGitHubOpenPath, isPinnedGitHubRevision } from './publishing/links'

const AppShell = lazy(() => import('./components/AppShell').then((module) => ({ default: module.AppShell })))
const GitHubOpenPage = lazy(() => import('./pages/GitHubOpenPage').then((module) => ({ default: module.GitHubOpenPage })))
const NotePage = lazy(() => import('./pages/NotePage').then((module) => ({ default: module.NotePage })))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })))
const WorkspacePage = lazy(() => import('./pages/WorkspacePage').then((module) => ({ default: module.WorkspacePage })))
const KnowledgePage = lazy(() => import('./pages/KnowledgePage').then((module) => ({ default: module.KnowledgePage })))
const StructuredKnowledgePage = lazy(() => import('./pages/StructuredKnowledgePage').then((module) => ({ default: module.StructuredKnowledgePage })))
const GitWorkspacePage = lazy(() => import('./pages/GitWorkspacePage').then((module) => ({ default: module.GitWorkspacePage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })))

function RouteFallback() {
  return <main className="route-status-page"><span className="workspace-spinner" /><p>正在载入工作区界面…</p></main>
}

function deferred(element: ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>
}

function RouteScrollReset() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])

  return null
}

export function App() {
  const theme = useAppStore((state) => state.theme)
  const published = deploymentAdapter.publishedWorkspace
  const publishedPath = published && isPinnedGitHubRevision(published.revision)
    ? createGitHubOpenPath(published)
    : null

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  return (
    <>
      <RouteScrollReset />
      <DesktopWorkspaceOpenBridge />
      <DesktopDeepLinkBridge />
      <Routes>
        <Route index element={publishedPath ? <Navigate to={publishedPath} replace /> : <HomePage />} />
        <Route path="open/github/:owner/:repo" element={deferred(<GitHubOpenPage />)} />
        <Route element={deferred(<AppShell />)}>
          <Route path="workspace" element={deferred(<WorkspacePage />)} />
          <Route path="knowledge" element={deferred(<KnowledgePage />)} />
          <Route path="database" element={deferred(<StructuredKnowledgePage />)} />
          <Route path="git" element={deferred(<GitWorkspacePage />)} />
          <Route path="settings" element={deferred(<SettingsPage />)} />
          <Route path="notes" element={deferred(<NotePage />)} />
          <Route path="notes/:noteId" element={deferred(<NotePage />)} />
        </Route>
        <Route path="*" element={deferred(<NotFoundPage />)} />
      </Routes>
    </>
  )
}
