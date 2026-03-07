/**
 * Charge .env en premier, avant tout autre module qui lit process.env.
 * À importer en premier dans casinoProxy.js pour que DB_* soient définis avant db.js.
 */
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });
