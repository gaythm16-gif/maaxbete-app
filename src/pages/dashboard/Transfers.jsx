import { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { formatBalance, convertBalance, useLanguage } from '../../context/LanguageContext';
import './DashboardPages.css';

function formatTxDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isSameDay(ts, dateStr) {
  if (!dateStr) return true;
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}` === dateStr;
}

export default function Transfers() {
  const { user, users, transactions, transfer, canTransferTo, canSeeUserBalance, getVisibleUsers, getVisibleTransferTransactions } = useAuth();
  const { displayCurrency, t } = useLanguage();
  const [toUserId, setToUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [searchName, setSearchName] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const visibleUsers = getVisibleUsers(user, users);
  const allowedTargets = visibleUsers.filter(
    (u) => u.id !== user?.id && canTransferTo(user?.role, u.role)
  );

  const transferList = useMemo(() => {
    const list = getVisibleTransferTransactions(user, users, transactions ?? []);
    const nameTrim = searchName.trim().toLowerCase();
    return list
      .filter((tx) => {
        if (searchDate && !isSameDay(tx.at, searchDate)) return false;
        if (!nameTrim) return true;
        const fromUser = users.find((u) => u.id === tx.fromId);
        const toUser = users.find((u) => u.id === tx.toId);
        const fromLogin = (fromUser?.login ?? '').toLowerCase();
        const toLogin = (toUser?.login ?? '').toLowerCase();
        return fromLogin.includes(nameTrim) || toLogin.includes(nameTrim);
      })
      .sort((a, b) => (b.at || 0) - (a.at || 0));
  }, [user, users, transactions, searchName, searchDate, getVisibleTransferTransactions]);

  const getLogin = (id) => users.find((u) => u.id === id)?.login ?? id;
  const getUser = (id) => users.find((u) => u.id === id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    if (!toUserId || !amount) {
      setMessage({ type: 'error', text: 'Sélectionnez un compte et un montant.' });
      return;
    }
    const result = await transfer(toUserId, Number(amount.replace(',', '.')), note);
    if (result.ok) {
      setMessage({ type: 'success', text: 'Transfert effectué.' });
      setAmount('');
      setNote('');
      setToUserId('');
    } else {
      setMessage({ type: 'error', text: result.error });
    }
  };

  return (
    <div className="dashboard-page">
      <h1>Transfers</h1>
      <p className="page-desc">
        Master → tous. Superadmin → Admin et Cashiers. Admin → Cashier. Le solde du compte master n&apos;apparaît que pour le master.
      </p>

      <form className="form-transfer" onSubmit={handleSubmit}>
        <label>
          Compte destinataire
          <select value={toUserId} onChange={(e) => setToUserId(e.target.value)} required>
            <option value="">— Choisir —</option>
            {allowedTargets.map((u) => (
              <option key={u.id} value={u.id}>
                ID {u.accountId ?? u.id} — {u.login} ({u.role})
                {user && canSeeUserBalance(user.role, u)
                  ? ` — ${formatBalance(convertBalance(u.balance ?? 0, u.currency, displayCurrency), displayCurrency)}`
                  : ''}
              </option>
            ))}
          </select>
        </label>
        <label>
          Montant
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
          />
        </label>
        <label>
          Note (optionnel)
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Commentaire"
          />
        </label>
        {message.text && (
          <p className={`form-message ${message.type}`}>{message.text}</p>
        )}
        <button type="submit">Effectuer le transfert</button>
      </form>

      <section className={`transfers-list-section${filtersOpen ? ' filters-open' : ''}`}>
        <h2>Tous les transferts</h2>
        <button
          type="button"
          className="show-filters-btn show-filters-btn-transfers"
          onClick={() => setFiltersOpen((o) => !o)}
          aria-expanded={filtersOpen}
        >
          {filtersOpen ? t('hideFilters') : t('showFilters')}
        </button>
        <div className="transfers-filters">
          <label className="search-label">
            Recherche par nom
            <input
              type="text"
              placeholder="Nom ou login..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="transfers-search-input"
            />
          </label>
          <label className="search-label">
            Filtrer par date
            <input
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="transfers-date-input"
            />
          </label>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>De</th>
                <th>Vers</th>
                <th>Montant</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {transferList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="no-data">Aucun transfert à afficher.</td>
                </tr>
              ) : (
                transferList.map((tx) => {
                  const fromUser = getUser(tx.fromId);
                  const toUser = getUser(tx.toId);
                  const amountDisplay = fromUser
                    ? formatBalance(
                        convertBalance(tx.amount, fromUser.currency, displayCurrency),
                        displayCurrency
                      )
                    : `${Number(tx.amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} —`;
                  return (
                    <tr key={tx.id}>
                      <td>{formatTxDate(tx.at)}</td>
                      <td>{getLogin(tx.fromId)} {fromUser && <span className="tx-role">({fromUser.role})</span>}</td>
                      <td>{getLogin(tx.toId)} {toUser && <span className="tx-role">({toUser.role})</span>}</td>
                      <td className="tx-amount">{amountDisplay}</td>
                      <td className="tx-note">{tx.note || '—'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
