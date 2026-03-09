/**
 * Proxy vers l'API Casino (Nexus-style ou compatible).
 * Charge .env en premier pour que MySQL soit toujours utilisé si DB_* est configuré.
 */
import './loadEnv.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import express from 'express';
import { getWallet, setWallet, updateBalance } from './walletStore.js';
import * as db from './db.js';
import { testConnection, isConfigured, runSchemaIfNeeded } from './config/database.js';
import appRoutes from './appRoutes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const useDbWallet = db.isMySQL;

const app = express();
// Render fournit process.env.PORT ; en local utiliser PROXY_PORT ou 3001
const PORT = Number(process.env.PORT || process.env.PROXY_PORT || 3001);
const API_BASE = (process.env.CASINO_API_URL || 'https://api.nexusggr.com').replace(/\/$/, '');
const AGENT_CODE = process.env.CASINO_AGENT_CODE || process.env.CASINO_TOKEN || '';
const AGENT_TOKEN = process.env.CASINO_AGENT_CODE ? (process.env.CASINO_TOKEN || process.env.CASINO_SECRET) : (process.env.CASINO_SECRET || '');
// En production : FRONTEND_URL (Vercel) ; CASINO_SITE_ENDPOINT pour l'API casino (même URL frontend)
const FRONTEND_URL = (process.env.FRONTEND_URL || process.env.CASINO_SITE_ENDPOINT || '').replace(/\/$/, '');
const SITE_ENDPOINT = FRONTEND_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5178/').replace(/\/$/, '');
const GAME_LIST_PATH = process.env.CASINO_GAME_LIST_PATH || '/game/list';
const CALLBACK_URL = (process.env.CASINO_CALLBACK_URL || '').replace(/\/$/, '');
const BALANCE_IN_CENTS = process.env.CASINO_BALANCE_IN_CENTS === 'true' || process.env.CASINO_BALANCE_IN_CENTS === '1';
const isProduction = process.env.NODE_ENV === 'production';

// CORS : en production n'accepter que le frontend (Vercel) ; en dev autoriser l'origine ou *
const allowedOrigin = isProduction && FRONTEND_URL ? FRONTEND_URL : null;
app.use((req, res, next) => {
  const origin = allowedOrigin || req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // certains providers envoient form-urlencoded au callback

app.use('/api/app', appRoutes);

function baseHeaders() {
  const h = { 'Content-Type': 'application/json' };
  if (SITE_ENDPOINT) {
    h['Origin'] = SITE_ENDPOINT;
    h['Referer'] = SITE_ENDPOINT;
  }
  return h;
}

function withAgent(body) {
  return {
    agent_code: AGENT_CODE,
    agent_token: AGENT_TOKEN,
    ...body,
  };
}

async function callApi(body) {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: baseHeaders(),
    body: JSON.stringify(withAgent(body)),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

function apiError(res, status, message, detail) {
  const payload = { ok: false, error: message };
  if (detail) payload.detail = detail;
  if (status === 403 || status === 401) {
    payload.ipWhitelistHint = true;
    payload.apiUrl = API_BASE;
    payload.hint = "Vérifiez l'IP whitelist dans le panneau API et que l'URL API est correcte : " + API_BASE;
  }
  return res.status(status).json(payload);
}

/** Retourne l’IP publique (IPv4 et IPv6) avec laquelle le proxy appelle l’API — à ajouter dans la whitelist. */
app.get('/api/casino/my-ip', async (_req, res) => {
  try {
    const [r4, r6] = await Promise.all([
      fetch('https://api.ipify.org').then((r) => r.text()).then((t) => t.trim()).catch(() => null),
      fetch('https://api64.ipify.org').then((r) => r.text()).then((t) => t.trim()).catch(() => null),
    ]);
    return res.json({ ok: true, ip: r4 || null, ipv6: r6 || null });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

/** Sync / récupérer le solde casino du joueur (MySQL users.balance ou wallet.json). */
app.get('/api/casino/balance', async (req, res) => {
  const userLogin = (req.query.user || '').toString().trim();
  if (!userLogin) return res.status(400).json({ ok: false, error: 'user requis' });
  if (useDbWallet) {
    try {
      const u = await db.getUserByLogin(userLogin);
      if (!u) return res.status(404).json({ ok: false, error: 'Aucun solde enregistré' });
      return res.json({ ok: true, balance: Number(u.balance) || 0, currency: u.currency || 'TND' });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }
  const w = getWallet(userLogin);
  if (!w) return res.status(404).json({ ok: false, error: 'Aucun solde enregistré' });
  return res.json({ ok: true, balance: w.balance, currency: w.currency });
});

/** Enregistrer le solde du joueur (appelé par le front avant lancement ou par le callback API). */
app.post('/api/casino/balance', async (req, res) => {
  const { user, balance, currency } = req.body || {};
  const login = (user || '').toString().trim();
  if (!login) return res.status(400).json({ ok: false, error: 'user requis' });
  const bal = Number(balance) || 0;
  const cur = (currency || 'TND').toString().toUpperCase();
  if (useDbWallet) {
    try {
      const u = await db.getUserByLogin(login);
      if (!u) return res.status(404).json({ ok: false, error: 'Utilisateur introuvable' });
      await db.updateUser(u.id, { balance: bal, currency: cur });
      return res.json({ ok: true, balance: bal, currency: cur });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }
  setWallet(login, bal, cur);
  return res.json({ ok: true, balance: bal, currency: cur });
});

/** Appel API Nexus : Get Balance of Agent and User — pour afficher/synchroniser le solde côté Nexus. */
app.get('/api/casino/nexus-balance', async (req, res) => {
  if (!AGENT_CODE || !AGENT_TOKEN) return apiError(res, 500, 'Credentials manquants');
  const user = (req.query.user || '').toString().trim();
  if (!user) return res.status(400).json({ ok: false, error: 'user requis' });
  const methods = ['get_balance', 'balance', 'get_agent_user_balance', 'get_balance_of_agent_and_user', 'getBalance', 'getUserBalance'];
  for (const method of methods) {
    try {
      const { res: r, data } = await callApi({ method, user_code: user, user_id: user });
      if (!r.ok) continue;
      const bal = data.balance ?? data.user_balance ?? data.amount;
      const ok = data.status === 1 || data.status === 0 || data.ok === true;
      if (ok && (bal !== undefined || data.ok)) {
        return res.json({ ok: true, balance: Number(bal) || 0, currency: data.currency || 'TND' });
      }
    } catch (_) {
      continue;
    }
  }
  return res.status(502).json({ ok: false, error: 'Get Balance non disponible' });
});

/** Appel API Nexus : Deposit User Balance (Transfer API) — créditer le joueur côté Nexus avant lancement. */
app.post('/api/casino/nexus-deposit', async (req, res) => {
  if (!AGENT_CODE || !AGENT_TOKEN) return apiError(res, 500, 'Credentials manquants');
  const { user, amount, currency } = req.body || {};
  const login = (user || '').toString().trim();
  const amt = Number(amount) || 0;
  if (!login) return res.status(400).json({ ok: false, error: 'user requis' });
  if (amt <= 0) return res.status(400).json({ ok: false, error: 'amount invalide' });
  const createMethods = ['create_new_user', 'create_user', 'add_user'];
  const cur = (currency || 'TND').toString().toUpperCase();
  for (const method of createMethods) {
    try {
      const { res: r } = await callApi({
        method,
        user_code: login,
        user_id: login,
        currency: cur,
        currency_code: cur,
      });
      if (r.ok) break;
    } catch (_) {}
  }
  const methods = ['deposit_user_balance', 'deposit', 'transfer_deposit', 'create_deposit', 'depositUserBalance', 'user_deposit'];
  for (const method of methods) {
    try {
      const { res: r, data } = await callApi({
        method,
        user_code: login,
        user_id: login,
        amount: amt,
        balance: amt,
        currency: cur,
        currency_code: cur,
      });
      if (!r.ok) continue;
      if (data.status === 1 || data.status === 0 || data.ok) {
        if (useDbWallet) {
          try {
            const u = await db.getUserByLogin(login);
            if (u) await db.updateUser(u.id, { balance: amt, currency: cur });
          } catch (_) {}
        } else {
          setWallet(login, amt, cur);
        }
        return res.json({ ok: true, balance: amt });
      }
    } catch (_) {
      continue;
    }
  }
  if (isProduction) console.warn('[Casino] nexus-deposit: Deposit non disponible pour', login, '- le jeu peut s\'ouvrir avec solde 0 si le provider utilise un wallet callback. Définissez CASINO_CALLBACK_URL.');
  return res.status(502).json({ ok: false, error: 'Deposit non disponible (vérifier Transfer API)' });
});

/** Liste de clés possibles pour l'identifiant joueur (callback GET/POST). */
const USER_ID_KEYS = [
  'user_code', 'user_id', 'user', 'player_id', 'username',
  'userId', 'token', 'session_id', 'external_id', 'sub', 'uid', 'player',
];

/** Extrait le login utilisateur depuis query (GET) ou body (POST). Si valeur numérique, tente getUserById. */
async function resolveUserLoginFromParams(params) {
  let raw = '';
  for (const key of USER_ID_KEYS) {
    const v = params[key];
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      raw = String(v).trim();
      break;
    }
  }
  if (!raw) return null;
  if (useDbWallet) {
    const byLogin = await db.getUserByLogin(raw).catch(() => null);
    if (byLogin) return byLogin.login;
    const num = parseInt(raw, 10);
    if (!Number.isNaN(num)) {
      const byId = await db.getUserById(num).catch(() => null);
      if (byId) return byId.login;
    }
  }
  return raw;
}

/** Retourne le solde actuel du joueur (sans modifier). Utilisé par le callback get_balance. */
async function getCurrentBalance(userLogin) {
  if (useDbWallet) {
    try {
      const u = await db.getUserByLogin(userLogin);
      if (!u) return null;
      return Math.round(Number(u.balance) * 100) / 100;
    } catch (_) {
      return null;
    }
  }
  const w = getWallet(userLogin);
  return w ? Math.round(Number(w.balance) * 100) / 100 : null;
}

function formatBalanceForProvider(balance, currency = 'TND') {
  const b = Math.round(Number(balance) * 100) / 100;
  if (BALANCE_IN_CENTS) return Math.round(b * 100);
  return b;
}

/** Réponse JSON standard pour callback (Pragmatic attend balance en centimes entier + errorCode). */
function callbackSuccess(res, balance, currency = 'TND') {
  const out = typeof balance === 'number' ? formatBalanceForProvider(balance) : formatBalanceForProvider(Number(balance) || 0);
  return res.json({
    status: 1,
    balance: out,
    currency,
    error: 0,
    errorCode: 0,
  });
}
function callbackError(res, code, message, balance = 0) {
  return res.status(code).json({
    status: 0,
    error: message,
    balance: typeof balance === 'number' ? balance : 0,
    errorCode: 1,
  });
}

/** Log callback en production pour debug (voir logs Render). */
function logCallback(method, req, extra = {}) {
  if (!isProduction) return;
  const q = req.query && Object.keys(req.query).length ? req.query : undefined;
  const b = req.body && typeof req.body === 'object' && Object.keys(req.body).length ? req.body : undefined;
  console.log('[Casino Callback]', method, { query: q, body: b, ...extra });
}

/** Réponse balance pour GET callback (partagée). Pragmatic attend balance en centimes (entier) + errorCode. */
async function handleGetCallbackBalance(req, res) {
  logCallback('GET', req);
  const userLogin = await resolveUserLoginFromParams(req.query || {});
  if (!userLogin) return callbackError(res, 400, 'user manquant', 0);
  const balance = await getCurrentBalance(userLogin);
  if (balance === null) return callbackError(res, 400, 'user introuvable', 0);
  return callbackSuccess(res, balance, 'TND');
}

/** CORS preflight pour callback (certains providers envoient OPTIONS). */
app.options('/api/casino/callback', (_req, res) => res.sendStatus(204));
app.options('/api/casino/callback/balance', (_req, res) => res.sendStatus(204));
/** GET balance : certains providers appellent le callback en GET pour récupérer le solde. */
app.get('/api/casino/callback', handleGetCallbackBalance);
/** Certains providers utilisent Site Endpoint + /balance */
app.get('/api/casino/callback/balance', handleGetCallbackBalance);

/** Callback appelé par l'API casino pour mises/gains (débit/crédit du solde) et get_balance. */
app.post('/api/casino/callback', async (req, res) => {
  const body = req.body || {};
  logCallback('POST', req);
  const userLogin = await resolveUserLoginFromParams(body);
  if (!userLogin) return callbackError(res, 400, 'user manquant', 0);
  const type = (body.type || body.action || body.method || '').toString().toLowerCase();

  // get_balance / balance : lecture seule, ne pas modifier le solde (plusieurs noms possibles)
  const isBalanceOnly = [
    'get_balance', 'balance', 'balance_check', 'getbalance', 'check_balance',
  ].includes(type) || (body.method && String(body.method).toLowerCase() === 'getbalance');
  if (isBalanceOnly) {
    const balance = await getCurrentBalance(userLogin);
    if (balance === null) return callbackError(res, 400, 'user introuvable', 0);
    return callbackSuccess(res, balance, 'TND');
  }

  const amount = Number(body.amount ?? body.bet ?? body.win ?? body.delta ?? 0);
  let delta = 0;
  if (type === 'bet' || type === 'debit') delta = -Math.abs(amount);
  else if (type === 'win' || type === 'credit') delta = Math.abs(amount);
  else if (type === 'refund' || type === 'rollback') delta = Math.abs(amount);
  else delta = Number(body.delta) || 0;

  if (useDbWallet) {
    try {
      const u = await db.getUserByLogin(userLogin);
      if (!u) return callbackError(res, 400, 'user introuvable', 0);
      const current = Math.round(Number(u.balance) * 100) / 100;
      const newBalance = Math.max(0, Math.round((current + delta) * 100) / 100);
      await db.updateUser(u.id, { balance: newBalance });
      if (delta !== 0) {
        const txType = delta > 0 ? 'WIN' : 'BET';
        try {
          await db.addTransaction({
            id: `casino-${Date.now()}-${(body.transaction_id || body.call_id || '').toString().slice(0, 20)}`,
            type: txType,
            fromId: u.id,
            toId: u.id,
            amount: delta,
            note: `Casino callback ${type} ${Math.abs(amount)}`,
          });
        } catch (_) {}
      }
      return callbackSuccess(res, newBalance, (u && u.currency) || 'TND');
    } catch (e) {
      return res.status(500).json({ status: 0, error: e.message, errorCode: 1 });
    }
  }
  const newBalance = updateBalance(userLogin, delta);
  const w = getWallet(userLogin);
  return callbackSuccess(res, newBalance, (w && w.currency) || 'TND');
});

app.get('/api/casino/providers', async (_req, res) => {
  if (!AGENT_CODE || !AGENT_TOKEN) {
    return apiError(res, 500, 'CASINO_TOKEN ou CASINO_SECRET manquants dans .env');
  }
  try {
    const { res: r, data } = await callApi({ method: 'provider_list' });
    if (!r.ok) {
      return apiError(res, r.status || 502, data.msg || data.error || 'Erreur API', r.status === 403 || r.status === 401 ? 'IP non autorisée ou mauvais identifiants.' : null);
    }
    if (data.status !== 1 && data.status !== undefined) {
      return apiError(res, 502, data.msg || data.error || 'Provider list failed');
    }
    const providers = (data.providers || []).map((p) => ({
      code: p.code || p.provider_code || '',
      name: p.name || p.provider_name || p.code || '',
      status: p.status ?? 1,
    }));
    return res.json({ ok: true, providers });
  } catch (err) {
    return apiError(res, 502, err.message || 'Erreur réseau');
  }
});

app.get('/api/casino/games', async (req, res) => {
  if (!AGENT_CODE || !AGENT_TOKEN) {
    return apiError(res, 500, 'CASINO_TOKEN ou CASINO_SECRET manquants dans .env');
  }
  const provider = req.query.provider || '';
  const methodsToTry = ['game_list', 'get_games', 'games_list', 'list_games', 'get_game_list'];
  for (const method of methodsToTry) {
    try {
      const body = { method };
      if (provider) body.provider_code = provider;
      const { res: r, data } = await callApi(body);
      if (!r.ok) continue;
      const rawGames = data.games || data.data || data.list || (data.result && data.result.games) || (data.result && data.result.list) || [];
      if (Array.isArray(rawGames) && rawGames.length > 0) {
        const games = rawGames.map((g) => normalizeGame(g, provider)).filter(Boolean);
        if (games.length > 0) {
          return res.json({ ok: true, games, isDemo: false });
        }
      }
      if (data.status === 1 && Array.isArray(rawGames)) {
        const games = rawGames.map((g) => normalizeGame(g, provider)).filter(Boolean);
        return res.json({ ok: true, games: games.length ? games : [], isDemo: games.length === 0 });
      }
    } catch (_) {
      continue;
    }
  }
  try {
    const body = { method: 'game_list' };
    if (provider) body.provider_code = provider;
    const { res: r, data } = await callApi(body);
    if (!r.ok) {
      return apiError(res, r.status || 502, data.msg || data.error || 'Erreur API', r.status === 403 || r.status === 401 ? 'IP non autorisée ou mauvais identifiants.' : null);
    }
    const rawGames = data.games || data.data || data.list || [];
    const games = rawGames.map((g) => normalizeGame(g, provider)).filter(Boolean);
    return res.json({ ok: true, games, isDemo: games.length === 0, error: games.length === 0 ? (data.msg || data.error) : null });
  } catch (err) {
    return apiError(res, 502, err.message || 'Erreur réseau');
  }
});

function normalizeGame(g, fallbackProvider) {
  if (!g || typeof g !== 'object') return null;
  const id = g.id ?? g.game_code ?? g.gameCode ?? g.code ?? String(Math.random());
  let name = '';
  if (typeof g.game_name === 'string') name = g.game_name;
  else if (g.game_name && typeof g.game_name === 'object')
    name = g.game_name.en || g.game_name['en-US'] || Object.values(g.game_name)[0] || '';
  else name = g.name || g.title || '';
  const image = g.banner || g.image || g.icon || g.thumb || '';
  const provider = g.provider_code || g.provider || fallbackProvider || '';
  return {
    id: String(id),
    code: g.game_code || g.gameCode || g.code || String(id),
    name: String(name),
    image: String(image),
    provider: String(provider),
    tag: g.tag || null,
    isNew: !!g.is_new,
    dropsWins: !!g.drops_wins,
  };
}

app.post('/api/casino/launch', async (req, res) => {
  if (!AGENT_CODE || !AGENT_TOKEN) {
    return apiError(res, 500, 'CASINO_TOKEN ou CASINO_SECRET manquants dans .env');
  }
  let { provider_code, game_code, user_code, lang = 'en', balance, currency } = req.body || {};
  if (!provider_code || !game_code) {
    return res.status(400).json({ ok: false, error: 'provider_code et game_code requis' });
  }
  provider_code = String(provider_code).trim().toUpperCase();
  if (provider_code === 'PRAGMATIC PLAY') provider_code = 'PRAGMATIC';
  if (provider_code === "PLAY'N GO") provider_code = 'PLAYNGO';
  game_code = String(game_code).trim();
  const userLogin = user_code || 'guest';
  let balanceToSend = balance != null ? Number(balance) : 0;
  let currencyToSend = (currency || 'TND').toString().toUpperCase();
  if (balance == null && useDbWallet) {
    try {
      const u = await db.getUserByLogin(userLogin);
      if (u) {
        balanceToSend = Number(u.balance) || 0;
        currencyToSend = (u.currency || 'TND').toString().toUpperCase();
      }
    } catch (_) {}
  } else if (balance == null) {
    const wallet = getWallet(userLogin);
    if (wallet) {
      balanceToSend = wallet.balance;
      currencyToSend = (wallet.currency || 'TND').toString().toUpperCase();
    }
  }
  const methodsToTry = ['game_launch', 'launch', 'launch_game', 'open_game', 'start_game', 'get_launch_url', 'get_game_url', 'play', 'init_game', 'game_launch_url', 'launchGame'];
  const baseParams = { provider_code, game_code, user_code: userLogin, lang };
  const balanceParams = {
    balance: balanceToSend,
    currency: currencyToSend,
    credit_amount: balanceToSend,
    amount: balanceToSend,
    balance_amount: balanceToSend,
    initial_balance: balanceToSend,
    currency_code: currencyToSend,
    credit: balanceToSend,
    cb_amount: Math.round(balanceToSend * 100),
    cb_currency: currencyToSend,
    player_balance: balanceToSend,
    user_balance: balanceToSend,
  };
  if (CALLBACK_URL) {
    balanceParams.callback_url = CALLBACK_URL;
    balanceParams.return_url = CALLBACK_URL;
    balanceParams.home_url = CALLBACK_URL;
  }

  function addBalanceToUrl(url, bal, cur, userCode) {
    if (!url || typeof url !== 'string') return url;
    const sep = url.includes('?') ? '&' : '?';
    const params = [
      `balance=${encodeURIComponent(bal)}`,
      `currency=${encodeURIComponent(cur)}`,
      `credit=${encodeURIComponent(bal)}`,
      `amount=${encodeURIComponent(bal)}`,
      `cb_currency=${encodeURIComponent(cur)}`,
    ];
    if (userCode) {
      params.push(`user_code=${encodeURIComponent(userCode)}`);
      params.push(`user_id=${encodeURIComponent(userCode)}`);
    }
    return url + sep + params.join('&');
  }

  function extractLaunchUrl(data) {
    if (!data || typeof data !== 'object') return null;
    const u = data.launch_url || data.game_url || data.url || data.play_url || data.gameUrl || data.launchUrl;
    if (typeof u === 'string' && /^https?:\/\//i.test(u)) return u;
    const inner = data.data || data.result || data.response;
    if (inner && typeof inner === 'object') {
      const v = inner.launch_url || inner.game_url || inner.url || inner.play_url;
      if (typeof v === 'string' && /^https?:\/\//i.test(v)) return v;
    }
    return null;
  }

  function isSuccess(data) {
    if (!data) return false;
    if (data.status === 1 || data.status === '1') return true;
    if (data.status === 0 && extractLaunchUrl(data)) return true;
    if (data.success === true && extractLaunchUrl(data)) return true;
    if (data.ok === true && extractLaunchUrl(data)) return true;
    return false;
  }

  let lastApiError = null;

  function tryLaunch(body) {
    return callApi(body).then(({ res: r, data }) => {
      if (!r.ok) {
        lastApiError = data.msg || data.error || data.message || `HTTP ${r.status}`;
        return null;
      }
      const url = extractLaunchUrl(data);
      if (url && isSuccess(data)) return url;
      if (!data.msg?.toLowerCase().includes('invalid method') && !data.error?.toLowerCase().includes('invalid parameter')) {
        lastApiError = data.msg || data.error || data.message || null;
      }
      return null;
    }).catch((err) => {
      lastApiError = err.message || null;
      return null;
    });
  }

  for (const method of methodsToTry) {
    const url = await tryLaunch({ method, ...baseParams, ...balanceParams });
    if (url) {
      return res.json({ ok: true, launch_url: addBalanceToUrl(url, balanceToSend, currencyToSend, userLogin) });
    }
  }
  for (const method of methodsToTry) {
    const url = await tryLaunch({ method, ...baseParams, user_id: userLogin, ...balanceParams });
    if (url) {
      return res.json({ ok: true, launch_url: addBalanceToUrl(url, balanceToSend, currencyToSend, userLogin) });
    }
  }
  for (const method of methodsToTry) {
    const url = await tryLaunch({ method, ...baseParams });
    if (url) {
      return res.json({ ok: true, launch_url: addBalanceToUrl(url, balanceToSend, currencyToSend, userLogin) });
    }
  }

  const fallbackBase = FRONTEND_URL || 'https://maaxbete-app.vercel.app';
  const fallbackUrl = `${fallbackBase}/casino-demo-unavailable?game=${encodeURIComponent(game_code)}`;
  return res.json({
    ok: true,
    launch_url: fallbackUrl,
    is_fallback: true,
  });
});

async function start() {
  if (isConfigured) {
    const result = await testConnection();
    if (!result.ok) {
      console.error('[DB]', result.message);
      console.error('[DB] Le serveur démarre quand même. Corrigez DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD sur Render (Environment) pour activer MySQL.');
    } else {
      console.log('[DB]', result.message);
      console.log('[DB] Stockage : MySQL — toutes les données sont enregistrées à l\'instant dans la base.');
      try {
        await runSchemaIfNeeded();
        await db.ensureMaster();
      } catch (err) {
        console.error('[DB] ensureMaster:', err.message || err);
        console.error('[DB] Le serveur démarre quand même. Exécutez schema.sql sur Railway si besoin.');
      }
    }
  } else {
    console.log('[DB] Stockage : fichiers JSON (data/) — configurez DB_HOST, DB_NAME, DB_USER pour utiliser MySQL.');
  }
  app.listen(PORT, () => {
    if (!isProduction) console.log(`Casino proxy: http://localhost:${PORT}`);
    else console.log(`Backend démarré sur le port ${PORT}`);
    if (!isProduction) console.log(`API cible: ${API_BASE}`);
    if (!CALLBACK_URL) {
      console.warn('[Casino] CASINO_CALLBACK_URL non défini : le provider ne peut pas appeler votre backend pour solde/mises/gains. Définissez-le sur Render (ex: https://maaxbete-backend.onrender.com/api/casino/callback) et dans le panneau API Nexus.');
    }
  });
}

start().catch((err) => {
  console.error('Démarrage proxy:', err.message || err);
  process.exit(1);
});
