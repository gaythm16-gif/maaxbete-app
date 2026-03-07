/**
 * Placeholder image (SVG data URI) pour les cartes jeux en mode démo.
 * Évite les requêtes réseau et s'affiche comme une vraie vignette.
 */
const COLORS = [
  ['#1a5f2a', '#2d8b4a'],
  ['#6b2d5c', '#9b4d8a'],
  ['#0d3d56', '#1a6b8a'],
  ['#8b4513', '#c45a1a'],
  ['#2c5282', '#2b6cb0'],
  ['#744210', '#b7791f'],
  ['#553c9a', '#805ad5'],
  ['#9c4221', '#dd6b20'],
  ['#276749', '#38a169'],
  ['#702459', '#b83280'],
];

function hash(s) {
  let h = 0;
  for (let i = 0; i < (s || '').length; i++) h = (h << 5) - h + s.charCodeAt(i) | 0;
  return Math.abs(h);
}

/**
 * Retourne une image SVG (data URI) pour un jeu démo : dégradé + initiale du nom.
 */
export function getDemoGameImage(id, name) {
  const n = hash(id || name || '') % COLORS.length;
  const [c1, c2] = COLORS[n];
  const letter = (name || '?').charAt(0).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 280" width="200" height="280">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${c1}"/>
        <stop offset="100%" style="stop-color:${c2}"/>
      </linearGradient>
    </defs>
    <rect width="200" height="280" fill="url(#g)"/>
    <circle cx="100" cy="100" r="36" fill="rgba(255,255,255,0.2)"/>
    <text x="100" y="112" font-family="Arial,sans-serif" font-size="42" font-weight="bold" fill="rgba(255,255,255,0.95)" text-anchor="middle">${letter}</text>
    <text x="100" y="260" font-family="Arial,sans-serif" font-size="11" fill="rgba(255,255,255,0.7)" text-anchor="middle">🎰</text>
  </svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}
