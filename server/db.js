/**
 * Facade base de données : MySQL (si DB_HOST) ou fichiers JSON.
 * Toutes les fonctions sont async pour unifier l'API.
 */
const useMySQL = Boolean(process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER);

async function getDb() {
  if (useMySQL) return import('./database/mysqlAdapter.js');
  return import('./database/dbJson.js');
}

export async function getAllUsers() {
  const db = await getDb();
  const result = useMySQL ? await db.getAllUsers() : db.getAllUsers();
  return Promise.resolve(result);
}

export async function getUserById(id) {
  const db = await getDb();
  const result = useMySQL ? await db.getUserById(id) : db.getUserById(id);
  return Promise.resolve(result);
}

export async function getUserByLogin(login) {
  const db = await getDb();
  const result = useMySQL ? await db.getUserByLogin(login) : db.getUserByLogin(login);
  return Promise.resolve(result);
}

export async function verifyPassword(login, plainPassword) {
  const db = await getDb();
  const result = useMySQL ? await db.verifyPassword(login, plainPassword) : db.verifyPassword(login, plainPassword);
  return Promise.resolve(result);
}

export async function createUser(data) {
  const db = await getDb();
  const result = useMySQL ? await db.createUser(data) : db.createUser(data);
  return Promise.resolve(result);
}

export async function updateUser(id, updates) {
  const db = await getDb();
  const result = useMySQL ? await db.updateUser(id, updates) : db.updateUser(id, updates);
  return Promise.resolve(result);
}

export async function getAllTransactions() {
  const db = await getDb();
  const result = useMySQL ? await db.getAllTransactions() : db.getAllTransactions();
  return Promise.resolve(result);
}

export async function addTransaction(tx) {
  const db = await getDb();
  const result = useMySQL ? await db.addTransaction(tx) : db.addTransaction(tx);
  return Promise.resolve(result);
}

export async function getGameSettings() {
  const db = await getDb();
  const result = useMySQL ? await db.getGameSettings() : db.getGameSettings();
  return Promise.resolve(result);
}

export async function setGameSettings(winPercentage) {
  const db = await getDb();
  const result = useMySQL ? await db.setGameSettings(winPercentage) : db.setGameSettings(winPercentage);
  return Promise.resolve(result);
}

export async function transfer(fromId, toId, amount, note = '') {
  const db = await getDb();
  return useMySQL ? db.transfer(fromId, toId, amount, note) : Promise.resolve(db.transfer(fromId, toId, amount, note));
}

export async function withdraw(fromId, toId, amount, note = '') {
  const db = await getDb();
  return useMySQL ? db.withdraw(fromId, toId, amount, note) : Promise.resolve(db.withdraw(fromId, toId, amount, note));
}

export async function generateBalance(userId, amount) {
  const db = await getDb();
  const result = useMySQL ? await db.generateBalance(userId, amount) : db.generateBalance(userId, amount);
  return Promise.resolve(result);
}

export async function recordBet(params) {
  const db = await getDb();
  const result = useMySQL ? await db.recordBet(params) : db.recordBet(params);
  return Promise.resolve(result);
}

export async function ensureMaster() {
  if (!useMySQL) return;
  const m = await import('./database/mysqlAdapter.js');
  return m.ensureMaster();
}

export const isMySQL = useMySQL;
