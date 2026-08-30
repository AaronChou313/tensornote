import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import 'katex/dist/katex.min.css'
import './styles.css'
import { App } from './App'
import { RecoveryBoundary } from './recovery/RecoveryBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RecoveryBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </RecoveryBoundary>
  </StrictMode>,
)
