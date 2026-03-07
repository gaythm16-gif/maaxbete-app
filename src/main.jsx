import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const rootEl = document.getElementById('root')
if (!rootEl) {
  document.body.innerHTML = '<p style="padding:2rem;color:red;">Erreur: élément #root introuvable.</p>'
} else {
  try {
    const root = createRoot(rootEl)
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  } catch (err) {
    rootEl.innerHTML = '<div style="padding:2rem;color:#e0e0e0;background:#1a1a1e;min-height:100vh;font-family:system-ui,sans-serif;"><h1>Erreur au chargement</h1><p style="color:#e74c3c;">' + (err && err.message ? String(err.message) : 'Erreur inconnue') + '</p><p>Ouvre la console (F12) pour plus de détails.</p></div>'
    console.error(err)
  }
}
