/**
 * Exécute server/database/schema.sql sur la base MySQL configurée dans .env
 * Utilise les variables DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD (valeurs Railway).
 *
 * Usage (depuis la racine du projet) :
 *   1. Copie les valeurs Railway dans .env (DB_HOST=shinkansen.proxy.rlwy.net, DB_PORT=17883, etc.)
 *   2. node scripts/run-schema-on-railway.js
 */
import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const DB_HOST = process.env.DB_HOST || '';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_NAME = process.env.DB_NAME || '';
const DB_USER = process.env.DB_USER || '';
const DB_PASSWORD = process.env.DB_PASSWORD ?? '';

if (!DB_HOST || !DB_NAME || !DB_USER) {
  console.error('Configure .env avec DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD (valeurs Railway).');
  process.exit(1);
}
if (!DB_PASSWORD) {
  console.error('DB_PASSWORD est requis. Dans Railway : Variables → MYSQLPASSWORD, copiez la valeur dans .env : DB_PASSWORD=votre_mot_de_passe');
  process.exit(1);
}

const schemaPath = join(__dirname, '..', 'server', 'database', 'schema.sql');
const sql = readFileSync(schemaPath, 'utf8');

// Enlever les commentaires et exécuter les requêtes une par une (CREATE TABLE, INSERT)
const statements = sql
  .split(';')
  .map((s) => s.replace(/--[^\n]*/g, '').trim())
  .filter((s) => s.length > 0);

async function main() {
  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true,
  });
  try {
    console.log('Connexion à', DB_HOST + ':' + DB_PORT + '/' + DB_NAME, '...');
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i] + ';';
      await conn.query(stmt);
      const preview = stmt.slice(0, 50).replace(/\s+/g, ' ');
      console.log('OK:', preview + (stmt.length > 50 ? '...' : ''));
    }
    console.log('Schema appliqué.');
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
