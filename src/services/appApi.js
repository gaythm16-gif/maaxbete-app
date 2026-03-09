/**
 * Client API pour les données app (utilisateurs, auth, transactions).
 * En dev : /api/app (proxy Vite). En prod : backend Render (voir src/config/api.js).
 */
import { getAppApiBase } from '../config/api.js';

const getApiBase = () => getAppApiBase();

function getToken() {
  try {
    const raw = localStorage.getItem('maaxbete_app_token');
    return raw || null;
  } catch {
    return null;
  }
}

function setToken(token) {
  if (token) localStorage.setItem('maaxbete_app_token', token);
  else localStorage.removeItem('maaxbete_app_token');
}

async function request(method, path, body = null, useAuth = true) {
  const base = getApiBase();
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (useAuth) {
    const t = getToken();
    if (t) opts.headers.Authorization = `Bearer ${t}`;
  }
  if (body && (method === 'POST' || method === 'PATCH')) opts.body = JSON.stringify(body);
  const res = await fetch(`${base}${path}`, opts);
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    setToken(null);
    throw new Error(data.error || 'Session expirée');
  }
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export async function health() {
  const base = getApiBase();
  const res = await fetch(`${base}/health`);
  return res.ok;
}

export async function login(loginVal, password) {
  const data = await request('POST', '/login', { login: loginVal, password }, false);
  if (data.ok && data.token) setToken(data.token);
  return data;
}

export async function logout() {
  try {
    await request('POST', '/logout', {}, true);
  } catch (_) {}
  setToken(null);
}

export async function me() {
  return request('GET', '/me');
}

export async function getUsers() {
  const data = await request('GET', '/users');
  return data.users || [];
}

export async function getTransactions() {
  const data = await request('GET', '/transactions');
  return data.transactions || [];
}

export async function createUser(data) {
  const r = await request('POST', '/users', data);
  return { user: r.user, initialPassword: r.initialPassword };
}

export async function updateUser(userId, updates) {
  const r = await request('PATCH', `/users/${userId}`, updates);
  return r.user;
}

export async function transfer(toUserId, amount, note = '') {
  return request('POST', '/transfer', { toUserId, amount, note });
}

export async function withdraw(fromUserId, amount, note = '') {
  return request('POST', '/withdraw', { fromUserId, amount, note });
}

export async function generateBalance(amount) {
  const r = await request('POST', '/generate-balance', { amount });
  return r.user;
}

export async function getGameSettings() {
  const r = await request('GET', '/game-settings');
  return { winPercentage: r.winPercentage ?? 80 };
}

export async function setGameSettings(winPercentage) {
  return request('POST', '/game-settings', { winPercentage });
}

export async function changePassword(currentPassword, newPassword) {
  return request('POST', '/change-password', { currentPassword, newPassword });
}

export async function changePasswordOf(targetUserId, newPassword) {
  return request('POST', '/change-password-of', { targetUserId, newPassword });
}

export async function setUserStatus(targetUserId, status) {
  return request('POST', '/set-user-status', { targetUserId, status });
}

export async function updateUserCurrency(targetUserId, currency) {
  const r = await request('POST', '/update-user-currency', { targetUserId, currency });
  return r.user;
}

export async function setUserWinPercentage(targetUserId, winPercentage) {
  return request('POST', '/set-user-win-percentage', { targetUserId, winPercentage });
}

/** Enregistre une mise + gain (historique casino / jeux internes). */
export async function recordBet({ betAmount, winAmount, result, balanceBefore, balanceAfter, gameId }) {
  return request('POST', '/record-bet', {
    betAmount,
    winAmount: winAmount ?? 0,
    result: result === 'win' || result === 'lose' ? result : undefined,
    balanceBefore,
    balanceAfter,
    gameId: gameId ?? null,
  });
}

export { getToken, setToken };
