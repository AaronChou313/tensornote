import { lazy, Suspense, useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { SearchDialog } from './SearchDialog'
import { useAppStore } from '../store/useAppStore'
import { JupyterSettingsDialog } from './JupyterSettingsDialog'

const LabDrawer = lazy(() => import('./LabDrawer').then((module) => ({ default: module.LabDrawer })))

export function AppShell() {
  const theme = useAppStore((state) => state.theme)
  const setSearchOpen = useAppStore((state) => state.setSearchOpen)
  const setActiveLabId = useAppStore((state) => state.setActiveLabId)
  const kernelStatus = useAppStore((state) => state.kernelStatus)
  const location = useLocation()
  const previousPath = useRef(location.pathname)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setSearchOpen])

  useEffect(() => {
    if (previousPath.current !== location.pathname) {
      setActiveLabId(null)
      if (kernelStatus !== 'offline') {
        void import('../jupyter/JupyterClient').then(({ jupyterClient }) => jupyterClient.shutdown())
      }
      previousPath.current = location.pathname
    }
  }, [kernelStatus, location.pathname, setActiveLabId])

  return (
    <div className="min-h-[100dvh] bg-[var(--surface)] text-[var(--ink)]">
      <Sidebar />
      <div className="min-w-0 lg:pl-[264px]">
        <TopBar />
        <Outlet />
      </div>
      <SearchDialog />
      <Suspense fallback={null}><LabDrawer /></Suspense>
      <JupyterSettingsDialog />
    </div>
  )
}
