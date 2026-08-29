import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { SearchDialog } from './SearchDialog'
import { useAppStore } from '../store/useAppStore'
import { LabDrawer } from './LabDrawer'
import { JupyterSettingsDialog } from './JupyterSettingsDialog'
import { jupyterClient } from '../jupyter/JupyterClient'

export function AppShell() {
  const theme = useAppStore((state) => state.theme)
  const setSearchOpen = useAppStore((state) => state.setSearchOpen)
  const setActiveLabId = useAppStore((state) => state.setActiveLabId)
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
      void jupyterClient.shutdown()
      previousPath.current = location.pathname
    }
  }, [location.pathname, setActiveLabId])

  return (
    <div className="min-h-[100dvh] bg-[var(--surface)] text-[var(--ink)]">
      <Sidebar />
      <div className="min-w-0 lg:pl-[264px]">
        <TopBar />
        <Outlet />
      </div>
      <SearchDialog />
      <LabDrawer />
      <JupyterSettingsDialog />
    </div>
  )
}
