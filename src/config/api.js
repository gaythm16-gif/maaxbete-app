/**
 * URL de base du backend (Render) — SEULE source pour le frontend.
 * Stack : React + Vite → utiliser import.meta.env.VITE_* (pas process.env).
 * Ne jamais utiliser de variable nommée API_BASE dans le frontend (elle n’existe que côté backend).
 */
function getBackendBaseUrl() {
  const fromEnv = import.meta.env.VITE_API_URL;
  if (fromEnv && typeof fromEnv === 'string' && fromEnv.trim()) {
    return fromEnv.trim().replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.hostname === 'maaxbete-app.vercel.app') {
    return 'https://maaxbete-backend.onrender.com';
  }
  return '';
}

export function getAppApiBase() {
  const base = getBackendBaseUrl();
  return base ? `${base}/api/app` : '/api/app';
}

export function getCasinoApiBase() {
  const base = getBackendBaseUrl();
  return base ? `${base}/api/casino` : '/api/casino';
}
