/**
 * Configuration et connexion MySQL.
 * Les identifiants sont chargés depuis .env (jamais en dur).
 * Test de connexion au démarrage de l'application.
 */
import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DB_HOST = process.env.DB_HOST || '';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_NAME = process.env.DB_NAME || '';
const DB_USER = process.env.DB_USER || '';
const DB_PASSWORD = process.env.DB_PASSWORD ?? '';

const isConfigured = Boolean(DB_HOST && DB_NAME && DB_USER);

let pool = null;

/**
 * Crée ou retourne le pool de connexions MySQL.
 * Retourne null si la base n'est pas configurée (mode JSON conservé).
 */
export function getPool() {
  if (!isConfigured) return null;
  if (pool) return pool;
  pool = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });
  return pool;
}

/**
 * Teste la connexion au démarrage.
 * En dev : message clair. En prod : pas d'infos sensibles.
 */
export async function testConnection() {
  if (!isConfigured) {
    return { ok: false, message: 'MySQL non configuré (DB_HOST, DB_NAME, DB_USER manquants)' };
  }
  const p = getPool();
  try {
    const conn = await p.getConnection();
    await conn.ping();
    conn.release();
    const isProd = process.env.NODE_ENV === 'production';
    return {
      ok: true,
      message: isProd ? 'Connexion MySQL OK' : `Connexion MySQL OK (${DB_HOST}:${DB_PORT}/${DB_NAME})`,
    };
  } catch (err) {
    const isProd = process.env.NODE_ENV === 'production';
    return {
      ok: false,
      message: isProd
        ? 'Erreur de connexion à la base de données.'
        : `Erreur MySQL: ${err.message || 'connexion refusée'}`,
    };
  }
}

/**
 * Si la table users n'existe pas, exécute server/database/schema.sql.
 * Permet au backend (Render) de créer les tables à la première connexion à Railway.
 */
export async function runSchemaIfNeeded() {
  if (!isConfigured) return;
  const p = getPool();
  try {
    const [rows] = await p.query(
      "SELECT 1 FROM information_schema.tables WHERE table_schema = ? AND table_name = 'users'",
      [DB_NAME]
    );
    if (rows.length > 0) return;
    const schemaPath = join(__dirname, '..', 'database', 'schema.sql');
    const sql = readFileSync(schemaPath, 'utf8');
    const statements = sql
      .split(';')
      .map((s) => s.replace(/--[^\n]*/g, '').trim())
      .filter((s) => s.length > 0);
    const conn = await p.getConnection();
    try {
      for (const stmt of statements) {
        if (stmt) await conn.query(stmt + ';');
      }
      console.log('[DB] Schéma SQL appliqué (tables créées).');
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('[DB] runSchemaIfNeeded:', err.message || err);
    throw err;
  }
}

export { isConfigured };
