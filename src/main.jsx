import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// Unter /demo läuft weiterhin die Demo ohne Datenbank (Verkaufsvorführung),
// sonst die fertige App. Beide werden erst bei Bedarf geladen.
const isDemo = window.location.pathname.replace(/\/+$/, '') === '/demo'
const load = isDemo ? import('./App.jsx') : import('./fertig/App.jsx')

load.then(({ default: App }) => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
