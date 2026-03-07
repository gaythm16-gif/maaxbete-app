/**
 * Copie tous les utilisateurs de data/users.json vers MySQL (s'ils n'existent pas déjà).
 * Utile quand le proxy a écrit en JSON au lieu de MySQL.
 */
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_NAME = process.env.DB_NAME || 'maaxbete';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD ?? '';

async function run() {
  const usersPath = join(__dirname, '..', '..', 'data', 'users.json');
  const raw = readFileSync(usersPath, 'utf8');
  const users = JSON.parse(raw);
  if (!Array.isArray(users) || users.length === 0) {
    console.log('Aucun utilisateur dans users.json.');
    process.exit(0);
  }

  const pool = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
  });

  let added = 0;
  for (const u of users) {
    const login = (u.login || '').trim();
    if (!login) continue;
    const [existing] = await pool.execute('SELECT id FROM users WHERE LOWER(login) = LOWER(?)', [login]);
    if (existing.length > 0) continue;

    const password_hash = await bcrypt.hash(String(u.password || 'ChangeMe123'), 10);
    const now = u.createdAt || Date.now();
    await pool.execute(
      `INSERT INTO users (id, account_id, login, email, password_hash, role, balance, currency, parent_id, status, created_at, updated_at)
       VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      [
        u.id,
        u.accountId ?? u.account_id ?? 0,
        login,
        password_hash,
        u.role || 'player',
        Number(u.balance) || 0,
        (u.currency || 'TND').toString().toUpperCase(),
        u.parentId ?? u.parent_id ?? null,
        now,
        now,
      ]
    );
    console.log('Ajouté en MySQL:', login);
    added++;
  }
  await pool.end();
  console.log(added === 0 ? 'Aucun nouvel utilisateur à ajouter.' : `Total: ${added} utilisateur(s) ajouté(s).`);
}

run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
