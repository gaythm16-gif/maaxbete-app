/**
 * Routes API pour l'app (utilisateurs, auth, transactions).
 * Monté sur /api/app dans le proxy.
 * Toutes les opérations DB sont async (MySQL ou JSON).
 */
import { Router } from 'express';
import {
  getAllUsers,
  getUserByLogin,
  getUserById,
  verifyPassword,
  createUser as dbCreateUser,
  updateUser,
  getAllTransactions,
  addTransaction,
  getGameSettings,
  setGameSettings as dbSetGameSettings,
  transfer as dbTransfer,
  withdraw as dbWithdraw,
  generateBalance as dbGenerateBalance,
  recordBet as dbRecordBet,
} from './db.js';

const router = Router();

const tokens = new Map();

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.body?.token;
  if (!token) {
    return res.status(401).json({ ok: false, error: 'Non connecté' });
  }
  const userId = tokens.get(token);
  if (!userId) {
    return res.status(401).json({ ok: false, error: 'Session expirée' });
  }
  req.userId = userId;
  next();
}

router.get('/health', (_req, res) => {
  res.json({ ok: true, db: process.env.DB_HOST ? 'mysql' : 'json' });
});

router.post('/login', async (req, res) => {
  try {
    const { login, password } = req.body || {};
    if (!login || !password) {
      return res.status(400).json({ ok: false, error: 'Login et mot de passe requis' });
    }
    const user = await getUserByLogin(login);
    if (!user) {
      return res.json({ ok: false, error: 'Login ou mot de passe incorrect' });
    }
    const passwordOk = await verifyPassword(login, password);
    if (!passwordOk) {
      return res.json({ ok: false, error: 'Login ou mot de passe incorrect' });
    }
    if (user.status === 'banned') {
      return res.json({ ok: false, error: 'Ce compte est banni.' });
    }
    const token = `tk_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    tokens.set(token, user.id);
    const { password: _, password_hash: __, ...userWithoutPassword } = user;
    await addTransaction({
      id: `tx-${Date.now()}`,
      type: 'LOGIN',
      fromId: user.id,
      toId: user.id,
      amount: 0,
      at: Date.now(),
      note: 'Connexion',
    });
    res.json({ ok: true, user: userWithoutPassword, token });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'Erreur serveur' });
  }
});

router.post('/logout', (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.body?.token;
  if (token) tokens.delete(token);
  res.json({ ok: true });
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await getUserById(req.userId);
    if (!user) return res.status(401).json({ ok: false, error: 'Session invalide' });
    const { password: _, password_hash: __, ...u } = user;
    res.json({ ok: true, user: u });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/users', authMiddleware, async (_req, res) => {
  try {
    const users = await getAllUsers();
    const safe = users.map((u) => {
      const { password: _, password_hash: __, ...rest } = u;
      return rest;
    });
    res.json({ ok: true, users: safe });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/users', authMiddleware, async (req, res) => {
  try {
    const data = req.body || {};
    if (!data.login || !data.password || !data.role) {
      return res.status(400).json({ ok: false, error: 'login, password et role requis' });
    }
    const existing = await getUserByLogin(data.login);
    if (existing) {
      return res.json({ ok: false, error: 'Ce login existe déjà.' });
    }
    data.parentId = req.userId;
    const newUser = await dbCreateUser(data);
    await addTransaction({
      id: `tx-${Date.now()}`,
      type: 'CREATE_USER',
      fromId: req.userId,
      toId: newUser.id,
      amount: 0,
      at: Date.now(),
      note: `Création compte ${data.role}: ${data.login}`,
    });
    const { password: _, password_hash: __, ...safe } = newUser;
    // Retourner le mot de passe une seule fois à la création pour que l'admin puisse le communiquer à l'utilisateur (jamais stocké en clair en base)
    res.json({ ok: true, user: safe, initialPassword: data.password || null });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.patch('/users/:id', authMiddleware, async (req, res) => {
  try {
    const id = req.params.id;
    const updates = req.body || {};
    const updated = await updateUser(id, updates);
    if (!updated) return res.status(404).json({ ok: false, error: 'Compte introuvable' });
    const { password: _, password_hash: __, ...safe } = updated;
    res.json({ ok: true, user: safe });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/transactions', authMiddleware, async (_req, res) => {
  try {
    const transactions = await getAllTransactions();
    res.json({ ok: true, transactions });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/transfer', authMiddleware, async (req, res) => {
  try {
    const { toUserId, amount, note } = req.body || {};
    const fromId = req.userId;
    if (!toUserId || amount == null) {
      return res.status(400).json({ ok: false, error: 'toUserId et amount requis' });
    }
    const result = await dbTransfer(fromId, toUserId, amount, note);
    const { password: _f, password_hash: __f, ...from } = result.from;
    const { password: _t, password_hash: __t, ...to } = result.to;
    res.json({ ok: true, from, to, transaction: result.transaction });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

router.post('/withdraw', authMiddleware, async (req, res) => {
  try {
    const { fromUserId, amount, note } = req.body || {};
    const toId = req.userId;
    if (!fromUserId || amount == null) {
      return res.status(400).json({ ok: false, error: 'fromUserId et amount requis' });
    }
    const result = await dbWithdraw(fromUserId, toId, amount, note);
    const { password: _f, password_hash: __f, ...from } = result.from;
    const { password: _t, password_hash: __t, ...to } = result.to;
    res.json({ ok: true, from, to, transaction: result.transaction });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

router.post('/generate-balance', authMiddleware, async (req, res) => {
  try {
    const { amount } = req.body || {};
    if (amount == null) return res.status(400).json({ ok: false, error: 'amount requis' });
    const user = await getUserById(req.userId);
    if (user.role !== 'master') {
      return res.status(403).json({ ok: false, error: 'Réservé au compte master.' });
    }
    const updated = await dbGenerateBalance(req.userId, amount);
    const { password: _, password_hash: __, ...safe } = updated;
    res.json({ ok: true, user: safe });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/game-settings', authMiddleware, async (_req, res) => {
  try {
    const settings = await getGameSettings();
    res.json({ ok: true, ...settings });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/game-settings', authMiddleware, async (req, res) => {
  try {
    const user = await getUserById(req.userId);
    if (user.role !== 'master') {
      return res.status(403).json({ ok: false, error: 'Réservé au master.' });
    }
    const { winPercentage } = req.body || {};
    const p = Number(winPercentage);
    if (isNaN(p) || p < 10 || p > 100) {
      return res.status(400).json({ ok: false, error: 'Le pourcentage doit être entre 10 et 100.' });
    }
    await dbSetGameSettings(p);
    const settings = await getGameSettings();
    res.json({ ok: true, ...settings });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    const user = await getUserById(req.userId);
    if (!user) return res.status(401).json({ ok: false, error: 'Session invalide' });
    const currentOk = await verifyPassword(user.login, currentPassword);
    if (!currentOk) {
      return res.json({ ok: false, error: 'Mot de passe actuel incorrect.' });
    }
    if (!newPassword || newPassword.length < 6) {
      return res.json({ ok: false, error: 'Le nouveau mot de passe doit faire au moins 6 caractères.' });
    }
    await updateUser(user.id, { password: newPassword });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/change-password-of', authMiddleware, async (req, res) => {
  try {
    const { targetUserId, newPassword } = req.body || {};
    const actor = await getUserById(req.userId);
    const target = await getUserById(targetUserId);
    if (!target) return res.status(404).json({ ok: false, error: 'Compte introuvable.' });
    const canChange = actor.role === 'master' || target.parentId === actor.id;
    if (!canChange) return res.status(403).json({ ok: false, error: 'Non autorisé.' });
    if (!newPassword || newPassword.length < 6) {
      return res.json({ ok: false, error: 'Le mot de passe doit faire au moins 6 caractères.' });
    }
    await updateUser(targetUserId, { password: newPassword });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/set-user-status', authMiddleware, async (req, res) => {
  try {
    const { targetUserId, status } = req.body || {};
    if (status !== 'active' && status !== 'banned') {
      return res.status(400).json({ ok: false, error: 'Statut invalide.' });
    }
    const actor = await getUserById(req.userId);
    const target = await getUserById(targetUserId);
    if (!target) return res.status(404).json({ ok: false, error: 'Compte introuvable.' });
    if (target.role === 'master') {
      return res.json({ ok: false, error: 'Impossible de bannir le compte master.' });
    }
    const canBan = actor.role === 'master' || target.parentId === actor.id;
    if (!canBan) return res.status(403).json({ ok: false, error: 'Non autorisé.' });
    await updateUser(targetUserId, { status });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/update-user-currency', authMiddleware, async (req, res) => {
  try {
    const { targetUserId, currency } = req.body || {};
    if (!['EUR', 'TND', 'USD'].includes(currency)) {
      return res.status(400).json({ ok: false, error: 'Devise invalide.' });
    }
    const actor = await getUserById(req.userId);
    const target = await getUserById(targetUserId);
    if (!target) return res.status(404).json({ ok: false, error: 'Compte introuvable.' });
    const canChange = actor.role === 'master' || target.parentId === actor.id;
    if (!canChange) return res.status(403).json({ ok: false, error: 'Non autorisé.' });
    const updated = await updateUser(targetUserId, { currency });
    const { password: _, password_hash: __, ...safe } = updated;
    res.json({ ok: true, user: safe });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/set-user-win-percentage', authMiddleware, async (req, res) => {
  try {
    const { targetUserId, winPercentage } = req.body || {};
    const actor = await getUserById(req.userId);
    if (actor.role !== 'master') return res.status(403).json({ ok: false, error: 'Réservé au master.' });
    const target = await getUserById(targetUserId);
    if (!target) return res.status(404).json({ ok: false, error: 'Compte introuvable.' });
    const val = winPercentage === '' || winPercentage == null ? null : Number(winPercentage);
    if (val != null && (isNaN(val) || val < 10 || val > 100)) {
      return res.status(400).json({ ok: false, error: 'Entre 10 et 100, ou vide pour global.' });
    }
    await updateUser(targetUserId, { winPercentage: val });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** Enregistre une mise + gain (jeu interne ou casino) et met à jour le solde. */
router.post('/record-bet', authMiddleware, async (req, res) => {
  try {
    const { betAmount, winAmount, result, balanceBefore, balanceAfter, gameId } = req.body || {};
    const userId = req.userId;
    const bet = Number(betAmount);
    if (isNaN(bet) || bet <= 0) {
      return res.status(400).json({ ok: false, error: 'Mise invalide.' });
    }
    const user = await getUserById(userId);
    if (!user) return res.status(401).json({ ok: false, error: 'Session invalide' });
    const before = Number(balanceBefore);
    const after = Number(balanceAfter);
    const win = Number(winAmount) || 0;
    const resVal = result === 'win' || result === 'lose' ? result : (win > 0 ? 'win' : 'lose');
    await dbRecordBet({
      userId,
      gameId: gameId || null,
      betAmount: bet,
      winAmount: win,
      result: resVal,
      balanceBefore: before,
      balanceAfter: after,
    });
    await updateUser(userId, { balance: after });
    await addTransaction({
      id: `tx-${Date.now()}`,
      type: 'BET',
      fromId: userId,
      toId: userId,
      amount: -bet,
      at: Date.now(),
      note: 'Mise',
    });
    if (win > 0) {
      await addTransaction({
        id: `tx-${Date.now()}-win`,
        type: 'WIN',
        fromId: userId,
        toId: userId,
        amount: win,
        at: Date.now(),
        note: 'Gain',
      });
    }
    const updated = await getUserById(userId);
    const { password: _, password_hash: __, ...safe } = updated;
    res.json({ ok: true, user: safe, balance: after });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
