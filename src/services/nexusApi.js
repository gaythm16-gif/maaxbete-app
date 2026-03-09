/**
 * Client API Casino : appelle /api/casino (proxy en dev, backend Render en prod).
 * URL : getCasinoApiBase() uniquement — appel à l’exécution pour éviter tout nom de variable non défini.
 */
import { getCasinoApiBase } from '../config/api.js';
import { DEMO_CASINO_GAMES } from '../data/casinoGames';
import { getDemoGameImage } from '../utils/demoGameImage';

function getBase() {
  return getCasinoApiBase();
}

/** IP publiques du serveur (proxy) — à ajouter dans la whitelist. Retourne { ip, ipv6 }. */
export async function getMyIp() {
  try {
    const res = await fetch(`${getBase()}/my-ip`);
    const raw = await res.json().catch(() => ({}));
    if (!raw.ok) return { ip: null, ipv6: null };
    return { ip: raw.ip || null, ipv6: raw.ipv6 || null };
  } catch {
    return { ip: null, ipv6: null };
  }
}

export async function getProviders() {
  try {
    const res = await fetch(`${getBase()}/providers`);
    const raw = await res.json().catch(() => ({}));
    if (res.ok && raw.ok && Array.isArray(raw.providers) && raw.providers.length > 0) {
      return { ok: true, providers: raw.providers };
    }
    return {
      ok: false,
      error: raw.error || `HTTP ${res.status}`,
      providers: [],
      ipWhitelistHint: raw.ipWhitelistHint,
      apiUrl: raw.apiUrl,
      hint: raw.hint,
    };
  } catch (err) {
    return { ok: false, error: err.message || 'Réseau', providers: [], hint: 'Démarrez le proxy : npm run proxy' };
  }
}

export async function getGameList(providerCode) {
  const q = providerCode ? `?provider=${encodeURIComponent(providerCode)}` : '';
  try {
    const res = await fetch(`${getBase()}/games${q}`);
    const raw = await res.json().catch(() => ({}));
    if (res.ok && raw.ok && Array.isArray(raw.games) && raw.games.length > 0) {
      return { ok: true, games: raw.games, isDemo: !!raw.isDemo };
    }
    const demoGames = DEMO_CASINO_GAMES.map((g) => ({
      id: g.id,
      code: g.id,
      name: g.name,
      image: g.image || getDemoGameImage(g.id, g.name),
      provider: g.provider || '',
      tag: g.tag || null,
      isNew: !!g.isNew,
      dropsWins: !!g.dropsWins,
    }));
    return {
      ok: true,
      games: demoGames,
      isDemo: true,
      error: raw.error || (res.ok ? raw.error : `HTTP ${res.status}`),
      ipWhitelistHint: raw.ipWhitelistHint,
      apiUrl: raw.apiUrl,
      hint: raw.hint,
    };
  } catch (err) {
    const demoGames = DEMO_CASINO_GAMES.map((g) => ({
      id: g.id,
      code: g.id,
      name: g.name,
      image: g.image || getDemoGameImage(g.id, g.name),
      provider: g.provider || '',
      tag: g.tag || null,
      isNew: !!g.isNew,
      dropsWins: !!g.dropsWins,
    }));
    return {
      ok: true,
      games: demoGames,
      isDemo: true,
      error: err.message,
      hint: 'Démarrez le proxy : npm run proxy',
    };
  }
}

export async function launchGame({ providerCode, gameCode, userCode, lang = 'en', balance, currency }) {
  try {
    const res = await fetch(`${getBase()}/launch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider_code: providerCode,
        game_code: gameCode,
        user_code: userCode || 'guest',
        lang,
        balance: balance != null ? Number(balance) : undefined,
        currency: currency || 'TND',
      }),
    });
    const raw = await res.json().catch(() => ({}));
    if (res.ok && raw.ok && raw.launch_url) {
      return { ok: true, url: raw.launch_url };
    }
    return {
      ok: false,
      error: raw.error || raw.detail || `HTTP ${res.status}`,
      url: null,
      ipWhitelistHint: raw.ipWhitelistHint,
      hint: raw.hint,
    };
  } catch (err) {
    return { ok: false, error: err.message || 'Réseau', url: null };
  }
}

/** Récupérer le solde casino du joueur (côté serveur). */
export async function getCasinoBalance(userLogin) {
  if (!userLogin) return { ok: false, balance: null };
  try {
    const res = await fetch(`${getBase()}/balance?user=${encodeURIComponent(userLogin)}`);
    const raw = await res.json().catch(() => ({}));
    if (raw.ok) return { ok: true, balance: raw.balance, currency: raw.currency };
    return { ok: false, balance: null };
  } catch {
    return { ok: false, balance: null };
  }
}

/** Synchroniser le solde du joueur vers le serveur (avant lancement de jeu). */
export async function syncCasinoBalance(userLogin, balance, currency = 'TND') {
  if (!userLogin) return { ok: false };
  try {
    const res = await fetch(`${getBase()}/balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: userLogin, balance: Number(balance) || 0, currency }),
    });
    const raw = await res.json().catch(() => ({}));
    return { ok: !!raw.ok };
  } catch {
    return { ok: false };
  }
}

/** Déposer le solde du joueur côté Nexus (Transfer API) avant lancement — pour que le jeu affiche le crédit. */
export async function depositToNexus(userLogin, amount, currency = 'TND') {
  if (!userLogin || !amount) return { ok: false };
  try {
    const res = await fetch(`${getBase()}/nexus-deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: userLogin, amount: Number(amount) || 0, currency }),
    });
    const raw = await res.json().catch(() => ({}));
    return { ok: !!raw.ok };
  } catch {
    return { ok: false };
  }
}
