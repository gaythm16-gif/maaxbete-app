/**
 * Implémentation fichier JSON (sync) pour compatibilité sans MySQL.
 * Utilisée lorsque DB_HOST n'est pas défini.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', 'data');
const USERS_FILE = join(DATA_DIR, 'users.json');
const TX_FILE = join(DATA_DIR, 'transactions.json');
const SETTINGS_FILE = join(DATA_DIR, 'game_settings.json');

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const DEFAULT_MASTER = {
  id: 'master-1',
  accountId: 1,
  login: 'master@maaxbete.com',
  password: 'Master2025!',
  role: 'master',
  balance: 100000,
  currency: 'TND',
  parentId: null,
  status: 'active',
  createdAt: Date.now(),
};

function readJson(path, defaultValue) {
  try {
    if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf8'));
  } catch (_) {}
  return defaultValue;
}

function writeJson(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
}

function getUsersRaw() {
  const raw = readJson(USERS_FILE, []);
  if (!Array.isArray(raw) || raw.length === 0) {
    writeJson(USERS_FILE, [DEFAULT_MASTER]);
    return [DEFAULT_MASTER];
  }
  return raw;
}

function getTxRaw() {
  const raw = readJson(TX_FILE, []);
  return Array.isArray(raw) ? raw : [];
}

function normalizeUser(u) {
  return {
    ...u,
    accountId: u.accountId ?? u.account_id,
    parentId: u.parentId ?? u.parent_id,
    createdAt: u.createdAt ?? u.created_at,
  };
}

export function getAllUsers() {
  return getUsersRaw().map(normalizeUser);
}

export function getUserById(id) {
  const u = getUsersRaw().find((x) => x.id === id);
  return u ? normalizeUser(u) : null;
}

export function getUserByLogin(login) {
  const u = getUsersRaw().find((x) => (x.login || '').toLowerCase() === (login || '').toLowerCase());
  return u ? normalizeUser(u) : null;
}

export function createUser(data) {
  const list = getUsersRaw();
  const nextAccountId = Math.max(0, ...list.map((u) => u.accountId || u.account_id || 0)) + 1;
  const newUser = {
    id: `user-${Date.now()}`,
    accountId: nextAccountId,
    login: data.login,
    password: data.password,
    role: data.role,
    balance: Number(data.balance) || 0,
    currency: ['EUR', 'TND', 'USD'].includes(data.currency) ? data.currency : 'TND',
    parentId: data.parentId ?? data.parent_id ?? null,
    status: 'active',
    createdAt: Date.now(),
  };
  list.push(newUser);
  writeJson(USERS_FILE, list);
  return newUser;
}

export function updateUser(id, updates) {
  const list = getUsersRaw();
  const idx = list.findIndex((u) => u.id === id);
  if (idx < 0) return null;
  const u = list[idx];
  if (updates.balance !== undefined) u.balance = Math.round(Number(updates.balance) * 100) / 100;
  if (updates.currency !== undefined) u.currency = updates.currency;
  if (updates.status !== undefined) u.status = updates.status;
  if (updates.password !== undefined) u.password = updates.password;
  if (updates.winPercentage !== undefined) u.winPercentage = updates.winPercentage == null ? undefined : Number(updates.winPercentage);
  list[idx] = u;
  writeJson(USERS_FILE, list);
  return { ...u, accountId: u.accountId, parentId: u.parentId, createdAt: u.createdAt };
}

export function getAllTransactions() {
  return getTxRaw().map((t) => ({
    id: t.id,
    type: t.type,
    fromId: t.fromId ?? t.from_id,
    toId: t.toId ?? t.to_id,
    amount: t.amount,
    at: t.at,
    note: t.note,
  }));
}

export function addTransaction(tx) {
  const list = getTxRaw();
  list.push({
    id: tx.id,
    type: tx.type,
    fromId: tx.fromId,
    toId: tx.toId,
    amount: tx.amount,
    at: tx.at ?? Date.now(),
    note: tx.note ?? null,
  });
  writeJson(TX_FILE, list);
  return tx;
}

export function getGameSettings() {
  const raw = readJson(SETTINGS_FILE, { winPercentage: 80 });
  return { winPercentage: raw.winPercentage ?? 80 };
}

export function setGameSettings(winPercentage) {
  writeJson(SETTINGS_FILE, { winPercentage: Number(winPercentage) });
  return getGameSettings();
}

export function transfer(fromId, toId, amount, note = '') {
  const list = getUsersRaw();
  const from = list.find((u) => u.id === fromId);
  const to = list.find((u) => u.id === toId);
  if (!from || !to) throw new Error('Compte introuvable');
  if (fromId === toId) throw new Error('Impossible de transférer vers son propre compte');
  const num = Math.round(Number(amount) * 100) / 100;
  if (num <= 0) throw new Error('Montant invalide');
  const balanceFrom = Math.round((Number(from.balance) || 0) * 100) / 100;
  if (balanceFrom < num) throw new Error('Solde insuffisant');
  const balanceTo = Math.round((Number(to.balance) || 0) * 100) / 100;
  from.balance = Math.round((balanceFrom - num) * 100) / 100;
  to.balance = Math.round((balanceTo + num) * 100) / 100;
  writeJson(USERS_FILE, list);
  const tx = { id: `tx-${Date.now()}`, type: 'TRANSFER', fromId, toId, amount: num, at: Date.now(), note: note || `Transfert vers ${to.login}` };
  addTransaction(tx);
  return { from: normalizeUser(from), to: normalizeUser(to), transaction: tx };
}

export function withdraw(fromId, toId, amount, note = '') {
  const list = getUsersRaw();
  const from = list.find((u) => u.id === fromId);
  const to = list.find((u) => u.id === toId);
  if (!from || !to) throw new Error('Compte introuvable');
  const num = Math.round(Number(amount) * 100) / 100;
  if (num <= 0) throw new Error('Montant invalide');
  const balanceFrom = Math.round((Number(from.balance) || 0) * 100) / 100;
  if (balanceFrom < num) throw new Error('Solde insuffisant sur ce compte');
  const balanceTo = Math.round((Number(to.balance) || 0) * 100) / 100;
  from.balance = Math.round((balanceFrom - num) * 100) / 100;
  to.balance = Math.round((balanceTo + num) * 100) / 100;
  writeJson(USERS_FILE, list);
  const tx = { id: `tx-${Date.now()}`, type: 'WITHDRAW', fromId, toId, amount: num, at: Date.now(), note: note || `Retrait depuis ${from.login}` };
  addTransaction(tx);
  return { from: normalizeUser(from), to: normalizeUser(to), transaction: tx };
}

export function generateBalance(userId, amount) {
  const list = getUsersRaw();
  const u = list.find((x) => x.id === userId);
  if (!u) throw new Error('Compte introuvable');
  u.balance = Math.round(((u.balance || 0) + Number(amount)) * 100) / 100;
  writeJson(USERS_FILE, list);
  addTransaction({ id: `tx-${Date.now()}`, type: 'GENERATE', fromId: userId, toId: userId, amount: Number(amount), at: Date.now(), note: 'Génération de solde' });
  return normalizeUser(u);
}

/** En mode JSON : enregistre uniquement les transactions BET/WIN (pas de table bets). */
export function recordBet(params) {
  const now = Date.now();
  addTransaction({ id: `tx-${now}`, type: 'BET', fromId: params.userId, toId: params.userId, amount: -Number(params.betAmount), at: now, note: 'Mise' });
  if (Number(params.winAmount || 0) > 0) {
    addTransaction({ id: `tx-${now}-win`, type: 'WIN', fromId: params.userId, toId: params.userId, amount: Number(params.winAmount), at: now, note: 'Gain' });
  }
  return { id: `bet-${now}`, created_at: now };
}

/** En mode JSON : comparaison mot de passe en clair (pour compatibilité). */
export function verifyPassword(login, plainPassword) {
  const u = getUserByLogin(login);
  return !!(u && u.password === plainPassword);
}
