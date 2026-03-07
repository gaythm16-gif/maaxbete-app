/**
 * Store solde joueurs côté serveur (pour liaison avec l'API casino).
 * Persiste dans un fichier JSON pour survivre au redémarrage du proxy.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE = join(__dirname, '..', 'wallet.json');

function load() {
  try {
    if (existsSync(FILE)) {
      const raw = readFileSync(FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (_) {}
  return {};
}

function save(data) {
  try {
    writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('wallet save error', err);
  }
}

export function getWallet(userLogin) {
  const data = load();
  const key = (userLogin || '').toString().toLowerCase().trim();
  return data[key] ?? null;
}

export function setWallet(userLogin, balance, currency = 'TND') {
  const data = load();
  const key = (userLogin || '').toString().toLowerCase().trim();
  if (!key) return;
  data[key] = {
    balance: Number(balance) || 0,
    currency: currency || 'TND',
    updatedAt: Date.now(),
  };
  save(data);
}

export function updateBalance(userLogin, delta) {
  const w = getWallet(userLogin);
  const current = w ? w.balance : 0;
  const next = Math.max(0, current + Number(delta));
  setWallet(userLogin, next, w ? w.currency : 'TND');
  return next;
}
