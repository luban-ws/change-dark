import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './index.css'
import './i18n'

const rootEl = document.getElementById('root')
if (!rootEl) {
  throw new Error('Missing #root')
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
