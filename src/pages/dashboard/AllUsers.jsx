import { useState, useMemo } from 'react';
import { useAuth, CURRENCIES as CURRENCIES_LIST } from '../../context/AuthContext';
import { useLanguage, formatBalance } from '../../context/LanguageContext';
import './DashboardPages.css';
import './AllUsers.css';

const ROLES_OPTIONS = [
  { value: '', label: 'Tous' },
  { value: 'master', label: 'Master' },
  { value: 'partner', label: 'Partner' },
  { value: 'superadmin', label: 'Superadmin' },
  { value: 'admin', label: 'Admin' },
  { value: 'cashier', label: 'Cashier' },
  { value: 'player', label: 'Player' },
];

export default function AllUsers() {
  const {
    user,
    users,
    canSeeUserBalance,
    getVisibleUsers,
    canTransferTo,
    canWithdrawFrom,
    transfer,
    withdraw,
    canChangePasswordOf,
    changePasswordOf,
    canBanUser,
    setUserStatus,
    generateBalance,
    canChangeCurrencyOf,
    updateUserCurrency,
    setUserWinPercentage,
    getEffectiveWinPercentage,
    ROLES,
  } = useAuth();
  const { t } = useLanguage();

  const [filters, setFilters] = useState({
    username: '',
    id: '',
    role: '',
    createdAt: '',
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [amounts, setAmounts] = useState({});
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editPasswordFor, setEditPasswordFor] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateAmount, setGenerateAmount] = useState('');

  const visibleUsers = useMemo(() => getVisibleUsers(user, users), [user, users, getVisibleUsers]);

  const filteredUsers = useMemo(() => {
    return visibleUsers.filter((u) => {
      if (filters.username && !u.login.toLowerCase().includes(filters.username.toLowerCase()))
        return false;
      if (filters.id && String(u.accountId || '').indexOf(String(filters.id)) === -1) return false;
      if (filters.role && u.role !== filters.role) return false;
      if (filters.createdAt) {
        const d = new Date(u.createdAt).toISOString().slice(0, 10);
        if (d !== filters.createdAt) return false;
      }
      return true;
    });
  }, [visibleUsers, filters]);

  const handleAdd = async (targetUserId) => {
    const amount = Number(amounts[targetUserId] ?? 0);
    if (!amount || amount <= 0) {
      setMessage({ type: 'error', text: 'Saisissez un montant.' });
      return;
    }
    setMessage({ type: '', text: '' });
    const result = await transfer(targetUserId, amount);
    if (result.ok) {
      setAmounts((a) => ({ ...a, [targetUserId]: '' }));
      setMessage({ type: 'success', text: 'Solde ajouté.' });
    } else setMessage({ type: 'error', text: result.error });
  };

  const handleWithdraw = async (targetUserId) => {
    const amount = Number(amounts[targetUserId] ?? 0);
    if (!amount || amount <= 0) {
      setMessage({ type: 'error', text: 'Saisissez un montant.' });
      return;
    }
    setMessage({ type: '', text: '' });
    const result = await withdraw(targetUserId, amount);
    if (result.ok) {
      setAmounts((a) => ({ ...a, [targetUserId]: '' }));
      setMessage({ type: 'success', text: 'Solde retiré.' });
    } else setMessage({ type: 'error', text: result.error });
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!editPasswordFor || !newPassword || newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Le mot de passe doit faire au moins 6 caractères.' });
      return;
    }
    const result = await changePasswordOf(editPasswordFor.id, newPassword);
    if (result.ok) {
      setMessage({ type: 'success', text: 'Mot de passe modifié.' });
      setEditPasswordFor(null);
      setNewPassword('');
    } else setMessage({ type: 'error', text: result.error });
  };

  const getParentAccountId = (parentId) => {
    const p = users.find((u) => u.id === parentId);
    return p?.accountId ?? parentId ?? '—';
  };

  const handleGenerateBalance = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    const result = await generateBalance(Number(generateAmount?.replace(',', '.')));
    if (result.ok) {
      setMessage({ type: 'success', text: 'Solde généré.' });
      setGenerateOpen(false);
      setGenerateAmount('');
    } else setMessage({ type: 'error', text: result.error });
  };

  const handleCurrencyChange = async (targetUserId, newCurrency) => {
    setMessage({ type: '', text: '' });
    const result = await updateUserCurrency(targetUserId, newCurrency);
    if (result.ok) setMessage({ type: 'success', text: 'Devise mise à jour.' });
    else setMessage({ type: 'error', text: result.error });
  };

  const handleWinPercentageChange = async (targetUserId, value) => {
    setMessage({ type: '', text: '' });
    const result = await setUserWinPercentage(targetUserId, value === '' || value === 'global' ? null : value);
    if (result.ok) setMessage({ type: 'success', text: 'Taux gain mis à jour.' });
    else setMessage({ type: 'error', text: result.error });
  };

  const handleBan = async (targetUser) => {
    setMessage({ type: '', text: '' });
    const result = await setUserStatus(targetUser.id, 'banned');
    if (result.ok) setMessage({ type: 'success', text: t('accountBanned') });
    else setMessage({ type: 'error', text: result.error });
  };

  const handleUnban = async (targetUser) => {
    setMessage({ type: '', text: '' });
    const result = await setUserStatus(targetUser.id, 'active');
    if (result.ok) setMessage({ type: 'success', text: t('accountUnbanned') });
    else setMessage({ type: 'error', text: result.error });
  };

  if (!user) return null;
  const isMaster = user.role === ROLES.MASTER;

  return (
    <div className={`dashboard-page all-users-page${filtersOpen ? ' filters-open' : ''}`}>
      <h1>All Users</h1>
      <p className="page-desc">
        Recherche par nom ou ID. Ajout (+) et retrait (-) de solde. Modifier le mot de passe des comptes que vous avez créés (Edit). Changez la devise (EUR / TND / USD) dans la colonne Currency.
      </p>

      {isMaster && (
        <div className="generate-balance-bar">
          <button type="button" className="btn-generate" onClick={() => setGenerateOpen(true)}>
            Générer le solde
          </button>
        </div>
      )}

      <button
        type="button"
        className="show-filters-btn"
        onClick={() => setFiltersOpen((o) => !o)}
        aria-expanded={filtersOpen}
      >
        {filtersOpen ? t('hideFilters') : t('showFilters')}
      </button>
      <div className="filters-bar">
        <label>
          <span>{t('username')}</span>
          <input
            type="text"
            value={filters.username}
            onChange={(e) => setFilters((f) => ({ ...f, username: e.target.value }))}
            placeholder="Nom ou login"
          />
        </label>
        <label>
          <span>{t('id')}</span>
          <input
            type="text"
            value={filters.id}
            onChange={(e) => setFilters((f) => ({ ...f, id: e.target.value }))}
            placeholder="ID compte"
          />
        </label>
        <label>
          <span>{t('role')}</span>
          <select
            value={filters.role}
            onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value }))}
          >
            {ROLES_OPTIONS.map((r) => (
              <option key={r.value || 'all'} value={r.value}>{r.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span>{t('createdAt')}</span>
          <input
            type="date"
            value={filters.createdAt}
            onChange={(e) => setFilters((f) => ({ ...f, createdAt: e.target.value }))}
          />
        </label>
        <div className="filters-actions">
          <button
            type="button"
            className="btn-reset"
            onClick={() => setFilters({ username: '', id: '', role: '', createdAt: '' })}
          >
            {t('resetFilters')}
          </button>
          <span className="search-hint">Recherche en direct</span>
        </div>
      </div>

      {message.text && (
        <p className={`form-message ${message.type}`}>{message.text}</p>
      )}

      <div className="table-wrap">
        <table className="data-table all-users-table">
          <thead>
            <tr>
              <th>{t('level')}</th>
              <th>{t('id')}</th>
              <th>{t('balance')}</th>
              <th>{t('currency')}</th>
              {isMaster && <th>Taux gain %</th>}
              <th>{t('username')}</th>
              <th>{t('status')}</th>
              <th>{t('createdAt')}</th>
              <th>{t('parentId')}</th>
              <th>{t('transfer')}</th>
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => (
              <tr key={u.id}>
                <td><span className="role-badge">{u.role}</span></td>
                <td>{u.accountId ?? '—'}</td>
                <td>
                  {canSeeUserBalance(user.role, u)
                    ? formatBalance(u.balance ?? 0, u.currency)
                    : '—'}
                </td>
                <td>
                  {canChangeCurrencyOf(user, u) ? (
                    <select
                      className="currency-select"
                      value={u.currency || 'TND'}
                      onChange={(e) => handleCurrencyChange(u.id, e.target.value)}
                    >
                      {CURRENCIES_LIST.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  ) : (
                    <span>{u.currency || 'TND'}</span>
                  )}
                </td>
                {isMaster && (
                  <td className="win-pct-cell">
                    <select
                      className="win-pct-select"
                      value={u.winPercentage != null ? u.winPercentage : 'global'}
                      onChange={(e) => handleWinPercentageChange(u.id, e.target.value)}
                    >
                      <option value="global">Global</option>
                      {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((p) => (
                        <option key={p} value={p}>{p} %</option>
                      ))}
                    </select>
                  </td>
                )}
                <td>{u.login}</td>
                <td><span className={`status-badge status-${u.status || 'active'}`}>{u.status || 'active'}</span></td>
                <td>{new Date(u.createdAt).toLocaleString('fr-FR')}</td>
                <td>{getParentAccountId(u.parentId)}</td>
                <td className="transfer-cell">
                  <button
                    type="button"
                    className="btn-transfer minus"
                    title="Retirer du solde"
                    disabled={u.id === user.id || !canWithdrawFrom(user, u, users)}
                    onClick={() => handleWithdraw(u.id)}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={t('amount')}
                    value={amounts[u.id] ?? ''}
                    onChange={(e) => setAmounts((a) => ({ ...a, [u.id]: e.target.value }))}
                  />
                  <button
                    type="button"
                    className="btn-transfer plus"
                    title="Ajouter au solde"
                    disabled={u.id === user.id || !canTransferTo(user.role, u.role)}
                    onClick={() => handleAdd(u.id)}
                  >
                    +
                  </button>
                </td>
                <td>
                  <div className="all-users-actions-cell">
                    {canChangePasswordOf(user, u) && (
                      <button
                        type="button"
                        className="btn-edit"
                        onClick={() => setEditPasswordFor(u)}
                      >
                        {t('edit')}
                      </button>
                    )}
                    {canBanUser(user, u) && u.role !== ROLES.MASTER && (
                      u.status === 'banned' ? (
                        <button
                          type="button"
                          className="btn-unban-allusers"
                          onClick={() => handleUnban(u)}
                        >
                          {t('unban')}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-ban-allusers"
                          onClick={() => handleBan(u)}
                        >
                          {t('ban')}
                        </button>
                      )
                    )}
                    {!canChangePasswordOf(user, u) && !(canBanUser(user, u) && u.role !== ROLES.MASTER) && (
                      <span className="no-edit">—</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {generateOpen && (
        <div className="modal-overlay" onClick={() => { setGenerateOpen(false); setGenerateAmount(''); }}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Générer le solde</h3>
            <p className="modal-desc">Ajouter du solde à votre compte master.</p>
            <form onSubmit={handleGenerateBalance}>
              <label>
                Montant
                <input
                  type="text"
                  value={generateAmount}
                  onChange={(e) => setGenerateAmount(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                />
              </label>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => { setGenerateOpen(false); setGenerateAmount(''); }}>
                  Annuler
                </button>
                <button type="submit" className="btn-submit">Générer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editPasswordFor && (
        <div className="modal-overlay" onClick={() => { setEditPasswordFor(null); setNewPassword(''); }}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Réinitialiser le mot de passe — {editPasswordFor.login}</h3>
            <p className="modal-desc">Définir un nouveau mot de passe pour cet utilisateur (min. 6 caractères). Communiquez-le lui par un canal sécurisé. L’ancien mot de passe ne peut pas être affiché.</p>
            <form onSubmit={handleChangePasswordSubmit}>
              <label>
                Nouveau mot de passe
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  placeholder="••••••••"
                />
              </label>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => { setEditPasswordFor(null); setNewPassword(''); }}>
                  Annuler
                </button>
                <button type="submit" className="btn-submit">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
