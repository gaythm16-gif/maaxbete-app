/**
 * Adaptateur MySQL : même API que db.js (async), requêtes préparées, bcrypt.
 * Utilisé lorsque DB_HOST est défini dans .env.
 */
import bcrypt from 'bcrypt';
import { getPool } from '../config/database.js';

const SALT_ROUNDS = 10;

function rowToUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    accountId: row.account_id,
    login: row.login,
    email: row.email || undefined,
    password: undefined,
    password_hash: row.password_hash,
    role: row.role,
    balance: Number(row.balance),
    currency: row.currency || 'TND',
    parentId: row.parent_id ?? null,
    status: row.status || 'active',
    winPercentage: row.win_percentage != null ? Number(row.win_percentage) : undefined,
    createdAt: row.created_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function rowToTx(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    fromId: row.from_id,
    toId: row.to_id,
    amount: Number(row.amount),
    at: row.created_at,
    note: row.note ?? null,
  };
}

export async function getAllUsers() {
  const pool = getPool();
  if (!pool) return [];
  const [rows] = await pool.execute('SELECT * FROM users ORDER BY created_at ASC');
  return rows.map(rowToUser);
}

export async function getUserById(id) {
  const pool = getPool();
  if (!pool) return null;
  const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
  return rowToUser(rows[0] || null);
}

export async function getUserByLogin(login) {
  const pool = getPool();
  if (!pool) return null;
  const [rows] = await pool.execute('SELECT * FROM users WHERE LOWER(login) = LOWER(?)', [login]);
  return rowToUser(rows[0] || null);
}

/** Vérifie le mot de passe sans exposer le hash. */
export async function verifyPassword(login, plainPassword) {
  const pool = getPool();
  if (!pool) return false;
  const [rows] = await pool.execute('SELECT password_hash FROM users WHERE LOWER(login) = LOWER(?)', [login]);
  const hash = rows[0]?.password_hash;
  if (!hash) return false;
  return bcrypt.compare(plainPassword, hash);
}

export async function createUser(data) {
  const pool = getPool();
  if (!pool) throw new Error('Base de données non configurée');
  const hash = await bcrypt.hash(String(data.password), SALT_ROUNDS);
  const id = `user-${Date.now()}`;
  const now = Date.now();
  const [[{ maxId }]] = await pool.execute(
    'SELECT COALESCE(MAX(account_id), 0) AS maxId FROM users'
  );
  const accountId = (maxId || 0) + 1;
  const login = String(data.login).trim();
  const role = data.role || 'player';
  const balance = Math.round((Number(data.balance) || 0) * 100) / 100;
  const currency = ['EUR', 'TND', 'USD'].includes(data.currency) ? data.currency : 'TND';
  const parentId = data.parentId ?? data.parent_id ?? null;

  await pool.execute(
    `INSERT INTO users (id, account_id, login, email, password_hash, role, balance, currency, parent_id, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
    [id, accountId, login, data.email || null, hash, role, balance, currency, parentId, now, now]
  );
  return getUserById(id);
}

export async function updateUser(id, updates) {
  const pool = getPool();
  if (!pool) return null;
  const user = await getUserById(id);
  if (!user) return null;

  const fields = [];
  const values = [];
  if (updates.balance !== undefined) {
    fields.push('balance = ?');
    values.push(Math.round(Number(updates.balance) * 100) / 100);
  }
  if (updates.currency !== undefined) {
    fields.push('currency = ?');
    values.push(updates.currency);
  }
  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }
  if (updates.winPercentage !== undefined) {
    fields.push('win_percentage = ?');
    values.push(updates.winPercentage == null ? null : Number(updates.winPercentage));
  }
  if (updates.password !== undefined) {
    const hash = await bcrypt.hash(String(updates.password), SALT_ROUNDS);
    fields.push('password_hash = ?');
    values.push(hash);
  }
  if (fields.length === 0) return rowToUser({ ...user, ...updates });
  fields.push('updated_at = ?');
  values.push(Date.now());
  values.push(id);
  await pool.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
  return getUserById(id);
}

export async function getAllTransactions() {
  const pool = getPool();
  if (!pool) return [];
  const [rows] = await pool.execute(
    'SELECT id, type, from_id, to_id, amount, note, created_at FROM transactions ORDER BY created_at ASC'
  );
  return rows.map(rowToTx);
}

export async function addTransaction(tx) {
  const pool = getPool();
  if (!pool) throw new Error('Base de données non configurée');
  const now = tx.at ?? Date.now();
  const userId = tx.fromId || tx.toId;
  await pool.execute(
    `INSERT INTO transactions (id, user_id, type, from_id, to_id, amount, status, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'completed', ?, ?)`,
    [tx.id, userId, tx.type, tx.fromId ?? null, tx.toId ?? null, Number(tx.amount), tx.note ?? null, now]
  );
  return tx;
}

export async function getGameSettings() {
  const pool = getPool();
  if (!pool) return { winPercentage: 80 };
  const [rows] = await pool.execute('SELECT win_percentage FROM game_settings WHERE id = 1');
  const p = rows[0]?.win_percentage;
  return { winPercentage: p != null ? Number(p) : 80 };
}

export async function setGameSettings(winPercentage) {
  const pool = getPool();
  if (!pool) return getGameSettings();
  await pool.execute(
    'UPDATE game_settings SET win_percentage = ?, updated_at = ? WHERE id = 1',
    [Number(winPercentage), Date.now()]
  );
  return getGameSettings();
}

export async function transfer(fromId, toId, amount, note = '') {
  const pool = getPool();
  if (!pool) throw new Error('Base de données non configurée');
  const from = await getUserById(fromId);
  const to = await getUserById(toId);
  if (!from || !to) throw new Error('Compte introuvable');
  if (fromId === toId) throw new Error('Impossible de transférer vers son propre compte');
  const num = Math.round(Number(amount) * 100) / 100;
  if (num <= 0) throw new Error('Montant invalide');
  const balanceFrom = Math.round(Number(from.balance) * 100) / 100;
  if (balanceFrom < num) throw new Error('Solde insuffisant');
  const balanceTo = Math.round(Number(to.balance) * 100) / 100;

  const newBalanceFrom = Math.round((balanceFrom - num) * 100) / 100;
  const newBalanceTo = Math.round((balanceTo + num) * 100) / 100;
  const now = Date.now();
  const txId = `tx-${now}`;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('UPDATE users SET balance = ?, updated_at = ? WHERE id = ?', [newBalanceFrom, now, fromId]);
    await conn.execute('UPDATE users SET balance = ?, updated_at = ? WHERE id = ?', [newBalanceTo, now, toId]);
    await conn.execute(
      `INSERT INTO transactions (id, user_id, type, from_id, to_id, amount, status, note, created_at)
       VALUES (?, ?, 'TRANSFER', ?, ?, ?, 'completed', ?, ?)`,
      [txId, fromId, fromId, toId, num, note || `Transfert vers ${to.login}`, now]
    );
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }

  const tx = { id: txId, type: 'TRANSFER', fromId, toId, amount: num, at: now, note: note || null };
  const fromUpdated = await getUserById(fromId);
  const toUpdated = await getUserById(toId);
  return { from: fromUpdated, to: toUpdated, transaction: tx };
}

export async function withdraw(fromId, toId, amount, note = '') {
  const pool = getPool();
  if (!pool) throw new Error('Base de données non configurée');
  const from = await getUserById(fromId);
  const to = await getUserById(toId);
  if (!from || !to) throw new Error('Compte introuvable');
  const num = Math.round(Number(amount) * 100) / 100;
  if (num <= 0) throw new Error('Montant invalide');
  const balanceFrom = Math.round(Number(from.balance) * 100) / 100;
  if (balanceFrom < num) throw new Error('Solde insuffisant sur ce compte');
  const balanceTo = Math.round(Number(to.balance) * 100) / 100;

  const newBalanceFrom = Math.round((balanceFrom - num) * 100) / 100;
  const newBalanceTo = Math.round((balanceTo + num) * 100) / 100;
  const now = Date.now();
  const txId = `tx-${now}`;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('UPDATE users SET balance = ?, updated_at = ? WHERE id = ?', [newBalanceFrom, now, fromId]);
    await conn.execute('UPDATE users SET balance = ?, updated_at = ? WHERE id = ?', [newBalanceTo, now, toId]);
    await conn.execute(
      `INSERT INTO transactions (id, user_id, type, from_id, to_id, amount, status, note, created_at)
       VALUES (?, ?, 'WITHDRAW', ?, ?, ?, 'completed', ?, ?)`,
      [txId, fromId, fromId, toId, num, note || `Retrait depuis ${from.login}`, now]
    );
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }

  const tx = { id: txId, type: 'WITHDRAW', fromId, toId, amount: num, at: now, note: note || null };
  const fromUpdated = await getUserById(fromId);
  const toUpdated = await getUserById(toId);
  return { from: fromUpdated, to: toUpdated, transaction: tx };
}

export async function generateBalance(userId, amount) {
  const pool = getPool();
  if (!pool) throw new Error('Base de données non configurée');
  const u = await getUserById(userId);
  if (!u) throw new Error('Compte introuvable');
  const newBalance = Math.round((Number(u.balance) + Number(amount)) * 100) / 100;
  const now = Date.now();
  await pool.execute('UPDATE users SET balance = ?, updated_at = ? WHERE id = ?', [newBalance, now, userId]);
  await addTransaction({
    id: `tx-${now}`,
    type: 'GENERATE',
    fromId: userId,
    toId: userId,
    amount: Number(amount),
    at: now,
    note: 'Génération de solde',
  });
  return getUserById(userId);
}

/** Enregistre une mise + gain éventuel (jeux internes ou callback casino). */
/** Enregistre une mise + gain éventuel (jeux internes ou callback casino). */
export async function recordBet(params) {
  const pool = getPool();
  if (!pool) throw new Error('Base de données non configurée');
  const { userId, gameId, betAmount, winAmount, result, balanceBefore, balanceAfter } = params;
  const now = Date.now();
  const betId = `bet-${now}`;
  const histId = `gh-${now}`;
  const conn = await pool.getConnection();
  try {
    await conn.execute(
      `INSERT INTO bets (id, user_id, game_id, bet_amount, win_amount, result, balance_before, balance_after, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [betId, userId, gameId || null, Number(betAmount), Number(winAmount || 0), result, Number(balanceBefore), Number(balanceAfter), now]
    );
    await conn.execute(
      `INSERT INTO game_history (id, user_id, game_id, bet_amount, win_amount, result, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [histId, userId, gameId || null, Number(betAmount), Number(winAmount || 0), result, now]
    );
  } finally {
    conn.release();
  }
  return { id: betId, created_at: now };
}

/** Crée le compte master si aucun utilisateur n'existe (premier démarrage). */
export async function ensureMaster() {
  const pool = getPool();
  if (!pool) return;
  const [rows] = await pool.execute('SELECT id FROM users WHERE role = ? LIMIT 1', ['master']);
  if (rows.length > 0) return;
  const defaultPassword = process.env.MASTER_INITIAL_PASSWORD || 'Master2025!';
  const hash = await bcrypt.hash(defaultPassword, SALT_ROUNDS);
  const now = Date.now();
  await pool.execute(
    `INSERT INTO users (id, account_id, login, email, password_hash, role, balance, currency, parent_id, status, created_at, updated_at)
     VALUES ('master-1', 1, 'master@maaxbete.com', NULL, ?, 'master', 100000, 'TND', NULL, 'active', ?, ?)`,
    [hash, now, now]
  );
}
