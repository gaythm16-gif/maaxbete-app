/**
 * URL de base du backend (Render).
 * - En dev : vide → requêtes vers /api (proxy Vite vers localhost:3001).
 * - En prod (Vercel) : VITE_API_URL au build, ou fallback si déployé sur notre domaine.
 * Une seule source de vérité pour éviter toute variable non définie (ex. API_BASE).
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
