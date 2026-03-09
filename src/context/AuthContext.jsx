import { createContext, useContext, useState, useEffect } from 'react';
import { convertBalance } from './LanguageContext';
import * as appApi from '../services/appApi';

export const ROLES = {
  MASTER: 'master',
  PARTNER: 'partner',
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  CASHIER: 'cashier',
  PLAYER: 'player',
};

const AuthContext = createContext(null);

const STORAGE_KEY = 'maaxbete_auth';
const USERS_KEY = 'maaxbete_users';
const TX_KEY = 'maaxbete_transactions';
const GAME_SETTINGS_KEY = 'maaxbete_game_settings';

function loadGameSettings() {
  try {
    const raw = localStorage.getItem(GAME_SETTINGS_KEY);
    if (raw) {
      const o = JSON.parse(raw);
      const p = Number(o.winPercentage);
      if (p >= 10 && p <= 100) return { winPercentage: p };
    }
  } catch (_) {}
  return { winPercentage: 80 };
}

function saveGameSettings(settings) {
  localStorage.setItem(GAME_SETTINGS_KEY, JSON.stringify(settings));
}

export const CURRENCIES = ['EUR', 'TND', 'USD'];

// Compte master par défaut pour test
const DEFAULT_MASTER = {
  id: 'master-1',
  accountId: 1,
  login: 'master@maaxbete.com',
  password: 'Master2025!',
  role: ROLES.MASTER,
  balance: 100000,
  currency: 'TND',
  parentId: null,
  status: 'active',
  createdAt: Date.now(),
};

function loadUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      let nextId = Math.max(0, ...list.map((u) => Number(u.accountId) || 0)) + 1;
      return list.map((u) => ({
        ...u,
        accountId: u.accountId != null ? u.accountId : nextId++,
        status: u.status ?? 'active',
        currency: CURRENCIES.includes(u.currency) ? u.currency : 'TND',
      }));
    }
  } catch (_) {}
  const initial = [DEFAULT_MASTER];
  localStorage.setItem(USERS_KEY, JSON.stringify(initial));
  return initial;
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function loadTransactions() {
  try {
    const raw = localStorage.getItem(TX_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return [];
}

function saveTransactions(tx) {
  localStorage.setItem(TX_KEY, JSON.stringify(tx));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState(() => loadUsers());
  const [transactions, setTransactions] = useState(() => loadTransactions());
  const [authChecked, setAuthChecked] = useState(false);
  const [useApi, setUseApi] = useState(false);

  useEffect(() => {
    let cancelled = false;
    appApi.health().then((ok) => {
      if (cancelled) return;
      if (ok) {
        setUseApi(true);
        const token = appApi.getToken();
        if (token) {
          appApi.me()
            .then((r) => {
              if (cancelled) return;
              if (r.ok && r.user) {
                setUser(r.user);
                return Promise.all([appApi.getUsers(), appApi.getTransactions()]);
              }
            })
            .then((arr) => {
              if (cancelled || !arr) return;
              setUsers(arr[0] || []);
              setTransactions(arr[1] || []);
            })
            .catch(() => {
              if (!cancelled) setUser(null);
            });
        }
      } else {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          try {
            const { login } = JSON.parse(raw);
            const list = loadUsers();
            const found = list.find((u) => u.login === login);
            if (found) setUser(found);
          } catch (_) {}
        }
      }
      setAuthChecked(true);
    }).catch(() => {
      if (!cancelled) {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          try {
            const { login } = JSON.parse(raw);
            const list = loadUsers();
            const found = list.find((u) => u.login === login);
            if (found) setUser(found);
          } catch (_) {}
        }
        setAuthChecked(true);
      }
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!useApi && Array.isArray(users)) saveUsers(users);
  }, [useApi, users]);

  useEffect(() => {
    if (!useApi && Array.isArray(transactions)) saveTransactions(transactions);
  }, [useApi, transactions]);

  const login = async (loginVal, password) => {
    if (useApi) {
      try {
        const data = await appApi.login(loginVal, password);
        if (!data.ok) return data;
        setUser(data.user);
        const [usersList, txList] = await Promise.all([appApi.getUsers(), appApi.getTransactions()]);
        setUsers(usersList || []);
        setTransactions(txList || []);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e.message || 'Erreur connexion' };
      }
    }
    const list = loadUsers();
    const found = list.find(
      (u) => u.login.toLowerCase() === loginVal.toLowerCase() && u.password === password
    );
    if (!found) return { ok: false, error: 'Login ou mot de passe incorrect' };
    if (found.status === 'banned')
      return { ok: false, error: 'Ce compte est banni. Contactez l\'administrateur.' };
    setUser(found);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ login: found.login, token: 'demo' }));
    return { ok: true };
  };

  const logout = () => {
    if (useApi) appApi.logout();
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Qui peut créer quel rôle : Master → partner, superadmin, admin, cashier, player ; Partner → superadmin, admin, cashier ; Superadmin → admin, cashier, player ; Admin → cashier, player ; Cashier → player
  const canCreateRole = (creatorRole, newRole) => {
    if (creatorRole === ROLES.MASTER)
      return [ROLES.PARTNER, ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.CASHIER, ROLES.PLAYER].includes(newRole);
    if (creatorRole === ROLES.PARTNER)
      return [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.CASHIER].includes(newRole);
    if (creatorRole === ROLES.SUPERADMIN)
      return [ROLES.ADMIN, ROLES.CASHIER, ROLES.PLAYER].includes(newRole);
    if (creatorRole === ROLES.ADMIN) return [ROLES.CASHIER, ROLES.PLAYER].includes(newRole);
    if (creatorRole === ROLES.CASHIER) return newRole === ROLES.PLAYER;
    return false;
  };

  const createUser = async (data) => {
    if (!user) return { ok: false, error: 'Non connecté.' };
    if (!canCreateRole(user.role, data.role))
      return { ok: false, error: 'Vous n\'êtes pas autorisé à créer ce type de compte.' };
    if (useApi) {
      try {
        const r = await appApi.createUser({
          ...data,
          balance: Number(data.balance) || 0,
          currency: CURRENCIES.includes(data.currency) ? data.currency : 'TND',
        });
        const newUser = r.user;
        setUsers((prev) => [...prev, newUser]);
        setTransactions((t) => [
          ...t,
          {
            id: `tx-${Date.now()}`,
            type: 'CREATE_USER',
            fromId: user.id,
            toId: newUser.id,
            amount: 0,
            at: Date.now(),
            note: `Création compte ${data.role}: ${data.login}`,
          },
        ]);
        return { ok: true, initialPassword: r.initialPassword };
      } catch (e) {
        return { ok: false, error: e.message || 'Erreur' };
      }
    }
    const list = loadUsers();
    if (list.some((u) => u.login.toLowerCase() === data.login.toLowerCase()))
      return { ok: false, error: 'Ce login existe déjà.' };
    const nextAccountId = Math.max(0, ...list.map((u) => u.accountId || 0)) + 1;
    const newUserObj = {
      id: `user-${Date.now()}`,
      accountId: nextAccountId,
      login: data.login,
      password: data.password,
      role: data.role,
      balance: Number(data.balance) || 0,
      currency: CURRENCIES.includes(data.currency) ? data.currency : 'TND',
      parentId: user.id,
      status: 'active',
      createdAt: Date.now(),
    };
    const next = [...list, newUserObj];
    setUsers(next);
    setTransactions((t) => [
      ...t,
      {
        id: `tx-${Date.now()}`,
        type: 'CREATE_USER',
        fromId: user.id,
        toId: newUserObj.id,
        amount: 0,
        at: Date.now(),
        note: `Création compte ${data.role}: ${data.login}`,
      },
    ]);
    return { ok: true, initialPassword: data.password };
  };

  // Solde du compte master visible uniquement par le master (secret)
  const canSeeUserBalance = (viewerRole, targetUser) => {
    if (targetUser.role !== ROLES.MASTER) return true;
    return viewerRole === ROLES.MASTER;
  };

  const canTransferTo = (fromRole, toRole) => {
    if (fromRole === ROLES.MASTER) return true;
    if (fromRole === ROLES.PARTNER)
      return [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.CASHIER].includes(toRole);
    if (fromRole === ROLES.SUPERADMIN && toRole === ROLES.ADMIN) return true;
    if (fromRole === ROLES.ADMIN && toRole === ROLES.CASHIER) return true;
    return false;
  };

  const transfer = async (toUserId, amount, note = '') => {
    if (!user) return { ok: false, error: 'Non connecté.' };
    const from = users.find((u) => u.id === user.id);
    const to = users.find((u) => u.id === toUserId);
    if (!from || !to) return { ok: false, error: 'Compte introuvable.' };
    if (from.id === to.id) return { ok: false, error: 'Impossible de transférer vers son propre compte.' };
    if (!canTransferTo(from.role, to.role))
      return { ok: false, error: 'Vous n\'êtes pas autorisé à transférer vers ce compte.' };
    const toCurrency = to.currency || 'TND';
    const fromCurrency = from.currency || 'TND';
    const numTo = Math.round(Number(amount) * 100) / 100;
    if (isNaN(numTo) || numTo <= 0) return { ok: false, error: 'Montant invalide.' };
    const numFrom = Math.round(convertBalance(numTo, toCurrency, fromCurrency) * 100) / 100;
    const balanceFrom = Math.round((Number(from.balance) || 0) * 100) / 100;
    if (balanceFrom < numFrom) return { ok: false, error: 'Solde insuffisant.' };
    if (useApi) {
      try {
        const result = await appApi.transfer(toUserId, numTo, note);
        setUsers((prev) =>
          prev.map((u) => {
            if (u.id === result.from.id) return { ...u, balance: result.from.balance };
            if (u.id === result.to.id) return { ...u, balance: result.to.balance };
            return u;
          })
        );
        setUser((prev) => (prev?.id === result.from.id ? { ...prev, balance: result.from.balance } : prev?.id === result.to.id ? { ...prev, balance: result.to.balance } : prev));
        setTransactions((t) => [...t, result.transaction]);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e.message || 'Erreur transfert' };
      }
    }
    const balanceTo = Math.round((Number(to.balance) || 0) * 100) / 100;
    const next = users.map((u) => {
      if (u.id === from.id) return { ...u, balance: Math.round((balanceFrom - numFrom) * 100) / 100 };
      if (u.id === to.id) return { ...u, balance: Math.round((balanceTo + numTo) * 100) / 100 };
      return u;
    });
    setUsers(next);
    setUser(next.find((u) => u.id === user.id));
    const tx = {
      id: `tx-${Date.now()}`,
      type: 'TRANSFER',
      fromId: from.id,
      toId: to.id,
      amount: numTo,
      at: Date.now(),
      note: note || `Transfert vers ${to.login}`,
    };
    setTransactions((t) => [...t, tx]);

    return { ok: true };
  };

  const changePassword = async (currentPassword, newPassword) => {
    if (!user) return { ok: false, error: 'Non connecté.' };
    if (useApi) {
      try {
        await appApi.changePassword(currentPassword, newPassword);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e.message || 'Erreur' };
      }
    }
    if (user.password !== currentPassword) return { ok: false, error: 'Mot de passe actuel incorrect.' };
    if (!newPassword || newPassword.length < 6)
      return { ok: false, error: 'Le nouveau mot de passe doit faire au moins 6 caractères.' };
    const next = users.map((u) =>
      u.id === user.id ? { ...u, password: newPassword } : u
    );
    setUsers(next);
    setUser(next.find((u) => u.id === user.id));
    return { ok: true };
  };

  /** Met à jour le solde du joueur connecté (ex. après sync avec le serveur casino). */
  const syncCasinoBalance = (newBalance) => {
    if (!user || newBalance == null) return;
    const num = Math.round(Number(newBalance) * 100) / 100;
    const next = users.map((u) =>
      u.id === user.id ? { ...u, balance: num } : u
    );
    setUsers(next);
    setUser((prev) => (prev && prev.id === user.id ? { ...prev, balance: num } : prev));
  };

  const getTransactionsForUser = (userId) => {
    return transactions.filter((t) => t.fromId === userId || t.toId === userId);
  };

  // Transferts visibles selon le rôle : Master = tous ; Superadmin = admin/cashier/player ; Admin/Cashier = leur sous-arbre ; Player = les siens
  const getVisibleTransferTransactions = (currentUser, userList, txList) => {
    if (!currentUser) return [];
    const onlyTransfers = txList.filter((tx) => tx.type === 'TRANSFER');
    if (currentUser.role === ROLES.MASTER) return onlyTransfers;
    if (currentUser.role === ROLES.SUPERADMIN) {
      const masterId = userList.find((u) => u.role === ROLES.MASTER)?.id;
      return onlyTransfers.filter(
        (tx) => tx.fromId !== masterId || tx.toId !== masterId
      );
    }
    const visibleIds = new Set(
      getVisibleUsers(currentUser, userList).map((u) => u.id)
    );
    return onlyTransfers.filter(
      (tx) => visibleIds.has(tx.fromId) || visibleIds.has(tx.toId)
    );
  };

  // Un utilisateur est-il descendant d'un ancêtre (créé par lui ou par sa chaîne) ?
  const isDescendant = (ancestorId, nodeId, userList) => {
    if (ancestorId === nodeId) return true;
    const node = userList.find((u) => u.id === nodeId);
    if (!node || !node.parentId) return false;
    return isDescendant(ancestorId, node.parentId, userList);
  };

  // Utilisateurs visibles : master voit tous ; chaque admin ne voit que les comptes qu'il a créés (lui + direct children)
  const getVisibleUsers = (currentUser, userList) => {
    if (!currentUser) return [];
    if (currentUser.role === ROLES.MASTER) return userList;
    return userList.filter(
      (u) => u.id === currentUser.id || u.parentId === currentUser.id
    );
  };

  // Peut retirer du solde : master depuis tous ; les autres seulement depuis les comptes qu'ils ont créés (direct children)
  const canWithdrawFrom = (actor, target, userList) => {
    if (actor.role === ROLES.MASTER) return true;
    return target.parentId === actor.id;
  };

  // Retirer du solde (from target → to current user)
  const withdraw = async (targetUserId, amount, note = '') => {
    if (!user) return { ok: false, error: 'Non connecté.' };
    const from = users.find((u) => u.id === targetUserId);
    const to = users.find((u) => u.id === user.id);
    if (!from || !to) return { ok: false, error: 'Compte introuvable.' };
    if (from.id === to.id) return { ok: false, error: 'Impossible de retirer de son propre compte.' };
    if (!canWithdrawFrom(to, from, users))
      return { ok: false, error: 'Vous n\'êtes pas autorisé à retirer depuis ce compte.' };
    const fromCurrency = from.currency || 'TND';
    const toCurrency = to.currency || 'TND';
    const numFrom = Math.round(Number(amount) * 100) / 100;
    if (isNaN(numFrom) || numFrom <= 0) return { ok: false, error: 'Montant invalide.' };
    const balanceFrom = Math.round((Number(from.balance) || 0) * 100) / 100;
    if (balanceFrom < numFrom) return { ok: false, error: 'Solde insuffisant sur ce compte.' };
    if (useApi) {
      try {
        const result = await appApi.withdraw(targetUserId, numFrom, note);
        setUsers((prev) =>
          prev.map((u) => {
            if (u.id === result.from.id) return { ...u, balance: result.from.balance };
            if (u.id === result.to.id) return { ...u, balance: result.to.balance };
            return u;
          })
        );
        setUser((prev) => (prev?.id === result.to.id ? { ...prev, balance: result.to.balance } : prev));
        setTransactions((t) => [...t, result.transaction]);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e.message || 'Erreur retrait' };
      }
    }
    const numTo = Math.round(convertBalance(numFrom, fromCurrency, toCurrency) * 100) / 100;
    const balanceTo = Math.round((Number(to.balance) || 0) * 100) / 100;
    const next = users.map((u) => {
      if (u.id === from.id) return { ...u, balance: Math.round((balanceFrom - numFrom) * 100) / 100 };
      if (u.id === to.id) return { ...u, balance: Math.round((balanceTo + numTo) * 100) / 100 };
      return u;
    });
    setUsers(next);
    setUser(next.find((u) => u.id === user.id));
    const tx = {
      id: `tx-${Date.now()}`,
      type: 'WITHDRAW',
      fromId: from.id,
      toId: to.id,
      amount: numFrom,
      at: Date.now(),
      note: note || `Retrait depuis ${from.login}`,
    };
    setTransactions((t) => [...t, tx]);

    return { ok: true };
  };

  // Générer du solde (crédit) : réservé au master
  const generateBalance = async (amount) => {
    if (!user) return { ok: false, error: 'Non connecté.' };
    if (user.role !== ROLES.MASTER) return { ok: false, error: 'Réservé au compte master.' };
    const num = Number(amount);
    if (isNaN(num) || num <= 0) return { ok: false, error: 'Montant invalide.' };
    if (useApi) {
      try {
        const updated = await appApi.generateBalance(num);
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, balance: updated.balance } : u)));
        setUser((prev) => (prev?.id === updated.id ? { ...prev, balance: updated.balance } : prev));
        setTransactions((t) => [
          ...t,
          {
            id: `tx-${Date.now()}`,
            type: 'GENERATE',
            fromId: user.id,
            toId: user.id,
            amount: num,
            at: Date.now(),
            note: 'Génération de solde',
          },
        ]);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e.message || 'Erreur' };
      }
    }
    const list = loadUsers();
    const next = list.map((u) =>
      u.id === user.id ? { ...u, balance: (u.balance || 0) + num } : u
    );
    setUsers(next);
    setTransactions((t) => [
      ...t,
      {
        id: `tx-${Date.now()}`,
        type: 'GENERATE',
        fromId: user.id,
        toId: user.id,
        amount: num,
        at: Date.now(),
        note: 'Génération de solde',
      },
    ]);
    setUser(next.find((u) => u.id === user.id));
    return { ok: true };
  };

  // Master peut changer le mot de passe de tous ; les autres uniquement des comptes qu'ils ont créés (direct child)
  const canChangePasswordOf = (actor, target) =>
    actor.role === ROLES.MASTER || target.parentId === actor.id;

  const changePasswordOf = async (targetUserId, newPassword) => {
    if (!user) return { ok: false, error: 'Non connecté.' };
    const target = users.find((u) => u.id === targetUserId);
    if (!target) return { ok: false, error: 'Compte introuvable.' };
    if (!canChangePasswordOf(user, target))
      return { ok: false, error: 'Non autorisé à modifier ce mot de passe.' };
    if (!newPassword || newPassword.length < 6)
      return { ok: false, error: 'Le mot de passe doit faire au moins 6 caractères.' };
    if (useApi) {
      try {
        await appApi.changePasswordOf(targetUserId, newPassword);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e.message || 'Erreur' };
      }
    }
    const next = users.map((u) =>
      u.id === targetUserId ? { ...u, password: newPassword } : u
    );
    setUsers(next);
    return { ok: true };
  };

  // Ban / Unban : même règle que changer mot de passe (master tous, sinon uniquement enfants directs)
  const canBanUser = (actor, target) =>
    actor.role === ROLES.MASTER || target.parentId === actor.id;

  const setUserStatus = async (targetUserId, status) => {
    if (!user) return { ok: false, error: 'Non connecté.' };
    if (status !== 'active' && status !== 'banned')
      return { ok: false, error: 'Statut invalide.' };
    const target = users.find((u) => u.id === targetUserId);
    if (!target) return { ok: false, error: 'Compte introuvable.' };
    if (!canBanUser(user, target))
      return { ok: false, error: 'Non autorisé à bannir / débloquer ce compte.' };
    if (target.role === ROLES.MASTER)
      return { ok: false, error: 'Impossible de bannir le compte master.' };
    if (useApi) {
      try {
        await appApi.setUserStatus(targetUserId, status);
        setUsers((prev) => prev.map((u) => (u.id === targetUserId ? { ...u, status } : u)));
        if (user.id === targetUserId) setUser(null);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e.message || 'Erreur' };
      }
    }
    const next = users.map((u) => (u.id === targetUserId ? { ...u, status } : u));
    setUsers(next);
    if (user.id === targetUserId) setUser(null);
    return { ok: true };
  };

  // Changer la devise d'un compte : master pour tous ; les autres pour les comptes qu'ils ont créés
  const canChangeCurrencyOf = (actor, target) =>
    actor.role === ROLES.MASTER || target.parentId === actor.id;

  const updateUserCurrency = async (targetUserId, currency) => {
    if (!user) return { ok: false, error: 'Non connecté.' };
    if (!CURRENCIES.includes(currency)) return { ok: false, error: 'Devise invalide.' };
    const target = users.find((u) => u.id === targetUserId);
    if (!target) return { ok: false, error: 'Compte introuvable.' };
    if (!canChangeCurrencyOf(user, target))
      return { ok: false, error: 'Non autorisé à modifier la devise de ce compte.' };
    if (useApi) {
      try {
        const updated = await appApi.updateUserCurrency(targetUserId, currency);
        setUsers((prev) => prev.map((u) => (u.id === targetUserId ? { ...u, currency: updated.currency } : u)));
        if (user.id === targetUserId) setUser((p) => (p ? { ...p, currency: updated.currency } : p));
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e.message || 'Erreur' };
      }
    }
    const next = users.map((u) => (u.id === targetUserId ? { ...u, currency } : u));
    setUsers(next);
    if (user.id === targetUserId) setUser(next.find((u) => u.id === user.id));
    return { ok: true };
  };

  // Paramètres jeux : pourcentage de gain = probabilité que le joueur gagne à chaque mise (10–100 %). Réservé au master.
  const getGameSettings = () => loadGameSettings();

  const setGameSettings = (winPercentage) => {
    if (!user || user.role !== ROLES.MASTER) return { ok: false, error: 'Réservé au master.' };
    const p = Number(winPercentage);
    if (isNaN(p) || p < 10 || p > 100) return { ok: false, error: 'Le pourcentage doit être entre 10 et 100.' };
    saveGameSettings({ winPercentage: p });
    return { ok: true };
  };

  // Pour un compte : taux de gain effectif (compte client ou global). Le master peut définir un taux par compte.
  const getEffectiveWinPercentage = (userId) => {
    const list = loadUsers();
    const u = list.find((x) => x.id === userId);
    const global = loadGameSettings();
    if (u?.winPercentage != null && u.winPercentage >= 10 && u.winPercentage <= 100) return u.winPercentage;
    return global.winPercentage;
  };

  const setUserWinPercentage = async (targetUserId, winPercentage) => {
    if (!user || user.role !== ROLES.MASTER) return { ok: false, error: 'Réservé au master.' };
    const target = users.find((u) => u.id === targetUserId);
    if (!target) return { ok: false, error: 'Compte introuvable.' };
    if (winPercentage === '' || winPercentage == null) {
      if (useApi) {
        try {
          await appApi.setUserWinPercentage(targetUserId, null);
          setUsers((prev) => prev.map((u) => (u.id === targetUserId ? { ...u, winPercentage: undefined } : u)));
          return { ok: true };
        } catch (e) {
          return { ok: false, error: e.message };
        }
      }
      const next = users.map((u) => (u.id === targetUserId ? { ...u, winPercentage: undefined } : u));
      setUsers(next);
      return { ok: true };
    }
    const p = Number(winPercentage);
    if (isNaN(p) || p < 10 || p > 100) return { ok: false, error: 'Entre 10 et 100, ou vide pour global.' };
    if (useApi) {
      try {
        await appApi.setUserWinPercentage(targetUserId, p);
        setUsers((prev) => prev.map((u) => (u.id === targetUserId ? { ...u, winPercentage: p } : u)));
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    }
    const next = users.map((u) => (u.id === targetUserId ? { ...u, winPercentage: p } : u));
    setUsers(next);
    return { ok: true };
  };

  // Jeu : à chaque mise, le joueur gagne ou perd selon le pourcentage. Si useApi, on enregistre la mise et le solde côté serveur.
  const gamePlay = async (betAmount, gameType = 'slot', options = {}) => {
    if (!user) return { ok: false, error: 'Connectez-vous pour jouer.', winAmount: 0 };
    const list = useApi ? users : loadUsers();
    const account = list.find((u) => u.id === user.id);
    if (!account) return { ok: false, error: 'Compte introuvable.', winAmount: 0 };
    const bet = Number(betAmount);
    if (isNaN(bet) || bet <= 0) return { ok: false, error: 'Mise invalide.', winAmount: 0 };
    if ((account.balance || 0) < bet) return { ok: false, error: 'Solde insuffisant.', winAmount: 0 };

    const effectiveWinPct = getEffectiveWinPercentage(user.id);
    const playerWinsThisBet = Math.random() * 100 < effectiveWinPct;

    let rawWin = 0;
    let symbols = [0, 0, 0];
    let diceValue = 0;
    let plinkoSlot = 0;
    let plinkoMultiplier = 0;

    if (gameType === 'plinko') {
      const rows = Math.min(16, Math.max(10, Number(options.rows) || 12));
      const risk = ['low', 'medium', 'high'].includes(options.risk) ? options.risk : 'medium';
      const numSlots = rows + 1;
      const mults = getPlinkoMultipliers(rows, risk);
      let slot;
      if (typeof options.slot === 'number' && options.slot >= 0 && options.slot < numSlots) {
        slot = options.slot;
      } else {
        slot = 0;
        for (let i = 0; i < rows; i++) slot += Math.random() < 0.5 ? 0 : 1;
      }
      plinkoSlot = slot;
      plinkoMultiplier = mults[slot];
      rawWin = bet * plinkoMultiplier;
    } else if (gameType === 'dice') {
      diceValue = Math.floor(Math.random() * 6) + 1;
      if (diceValue >= 5) rawWin = bet * 2;
    } else if (gameType === 'slot-lions') {
      rawWin = Math.floor(Number(options.winAmount) || 0);
    } else {
      symbols = [Math.floor(Math.random() * 4), Math.floor(Math.random() * 4), Math.floor(Math.random() * 4)];
      const [a, b, c] = symbols;
      let multiplier = 0;
      if (a === b && b === c) multiplier = a === 2 ? 10 : a === 3 ? 15 : 5;
      else if (a === b || b === c || a === c) multiplier = 2;
      rawWin = bet * multiplier;
    }

    const winAmount = playerWinsThisBet && rawWin > 0
      ? (gameType === 'plinko' || gameType === 'slot-lions' ? Math.floor(rawWin) : Math.round(rawWin * 100) / 100)
      : 0;

    const balanceBefore = Math.round(Number(account.balance) * 100) / 100;
    const balanceAfter = Math.round((balanceBefore - bet + winAmount) * 100) / 100;

    if (useApi) {
      try {
        const data = await appApi.recordBet({
          betAmount: bet,
          winAmount,
          result: winAmount > 0 ? 'win' : 'lose',
          balanceBefore,
          balanceAfter,
          gameId: null,
        });
        if (data.ok && data.user) {
          setUser(data.user);
          setUsers((prev) => prev.map((u) => (u.id === data.user.id ? data.user : u)));
          setTransactions((t) => [
            ...t,
            { id: `tx-${Date.now()}`, type: 'BET', fromId: user.id, toId: user.id, amount: -bet, at: Date.now(), note: `Mise ${gameType}: ${bet}` },
            ...(winAmount > 0 ? [{ id: `tx-${Date.now()}-win`, type: 'WIN', fromId: user.id, toId: user.id, amount: winAmount, at: Date.now(), note: `Gain ${gameType}: ${winAmount}` }] : []),
          ]);
        }
        return {
          ok: true,
          winAmount,
          balance: data.balance ?? balanceAfter,
          symbols,
          diceValue: gameType === 'dice' ? diceValue : undefined,
          plinkoSlot: gameType === 'plinko' ? plinkoSlot : undefined,
          plinkoMultiplier: gameType === 'plinko' ? plinkoMultiplier : undefined,
        };
      } catch (e) {
        return { ok: false, error: e.message || 'Erreur enregistrement mise.', winAmount: 0 };
      }
    }

    let nextList = list.map((u) =>
      u.id === user.id ? { ...u, balance: (u.balance || 0) - bet } : u
    );
    setUsers(nextList);
    setTransactions((t) => [
      ...t,
      { id: `tx-${Date.now()}`, type: 'BET', fromId: user.id, toId: user.id, amount: -bet, at: Date.now(), note: `Mise ${gameType}: ${bet}` },
    ]);
    if (winAmount > 0) {
      nextList = nextList.map((u) =>
        u.id === user.id ? { ...u, balance: (u.balance || 0) + winAmount } : u
      );
      setUsers(nextList);
      setTransactions((t) => [
        ...t,
        { id: `tx-${Date.now()}-win`, type: 'WIN', fromId: user.id, toId: user.id, amount: winAmount, at: Date.now(), note: `Gain ${gameType}: ${winAmount}` },
      ]);
    }
    const updatedUser = nextList.find((u) => u.id === user.id);
    setUser(updatedUser);
    return {
      ok: true,
      winAmount,
      balance: updatedUser ? (updatedUser.balance ?? 0) : 0,
      symbols,
      diceValue: gameType === 'dice' ? diceValue : undefined,
      plinkoSlot: gameType === 'plinko' ? plinkoSlot : undefined,
      plinkoMultiplier: gameType === 'plinko' ? plinkoMultiplier : undefined,
    };
  };

  function getPlinkoMultipliers(rows, risk) {
    const n = rows + 1;
    const EDGE = [10, 5, 2, 1, 0.5, 0.2];
    const mid = Math.floor((n - 1) / 2);
    const mults = Array(n);
    for (let i = 0; i < mid; i++) mults[i] = EDGE[Math.min(i, EDGE.length - 1)];
    mults[mid] = 1;
    for (let i = mid + 1; i < n; i++) mults[i] = mults[n - 1 - i];
    return mults;
  }

  const value = {
    user,
    users,
    transactions,
    authChecked,
    login,
    logout,
    createUser,
    transfer,
    changePassword,
    syncCasinoBalance,
    getTransactionsForUser,
    getVisibleTransferTransactions,
    canTransferTo,
    canCreateRole,
    canSeeUserBalance,
    getVisibleUsers,
    canWithdrawFrom,
    withdraw,
    canChangePasswordOf,
    changePasswordOf,
    canBanUser,
    setUserStatus,
    generateBalance,
    canChangeCurrencyOf,
    updateUserCurrency,
    gamePlay,
    getPlinkoMultipliers,
    getGameSettings,
    setGameSettings,
    getEffectiveWinPercentage,
    setUserWinPercentage,
    ROLES,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
