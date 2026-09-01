import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import 'katex/dist/katex.min.css'
import './styles.css'
import { App } from './App'
import { RecoveryBoundary } from './recovery/RecoveryBoundary'
import { deploymentAdapter } from './deployment/config'
import { registerServiceWorker } from './deployment/registerServiceWorker'
import { createHostAdapter, installHostAdapter } from './host/runtime'

const Router = deploymentAdapter.router === 'hash' ? HashRouter : BrowserRouter

async function bootstrap() {
  const hostAdapter = await createHostAdapter({
    kind: import.meta.env.VITE_TENSORNOTE_HOST,
    webLabel: deploymentAdapter.label,
  })
  installHostAdapter(hostAdapter)

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <RecoveryBoundary>
        <Router>
          <App />
        </Router>
      </RecoveryBoundary>
    </StrictMode>,
  )

  registerServiceWorker()
}

void bootstrap()
