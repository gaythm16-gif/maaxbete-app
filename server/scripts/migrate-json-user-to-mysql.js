/**
 * Insère l'utilisateur AZER (depuis data/users.json) dans MySQL.
 * À exécuter une fois après avoir configuré DB_* dans .env.
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
  const azer = users.find((u) => (u.login || '').toUpperCase() === 'AZER');
  if (!azer) {
    console.log('Aucun utilisateur AZER dans users.json.');
    process.exit(0);
  }

  const pool = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
  });

  const [existing] = await pool.execute('SELECT id FROM users WHERE LOWER(login) = LOWER(?)', [azer.login]);
  if (existing.length > 0) {
    console.log('AZER existe déjà dans MySQL.');
    await pool.end();
    process.exit(0);
  }

  const password_hash = await bcrypt.hash(String(azer.password || 'Aa1234'), 10);
  const now = Date.now();
  await pool.execute(
    `INSERT INTO users (id, account_id, login, email, password_hash, role, balance, currency, parent_id, status, created_at, updated_at)
     VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, 'active', ?, ?)`,
    [
      azer.id,
      azer.accountId || 2,
      azer.login,
      password_hash,
      azer.role || 'partner',
      Number(azer.balance) || 0,
      azer.currency || 'TND',
      azer.parentId || null,
      now,
      now,
    ]
  );
  console.log('Utilisateur AZER ajouté à MySQL.');
  await pool.end();
}

run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
