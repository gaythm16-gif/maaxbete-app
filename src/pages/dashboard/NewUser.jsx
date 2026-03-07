import { useMemo, useState } from 'react';
import { useAuth, CURRENCIES as CURRENCIES_LIST } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import './DashboardPages.css';

const ALL_ROLES = [
  { value: 'partner', label: 'Partner' },
  { value: 'superadmin', label: 'Superadmin' },
  { value: 'admin', label: 'Admin' },
  { value: 'cashier', label: 'Cashier' },
  { value: 'player', label: 'Player' },
];

export default function NewUser() {
  const { user, createUser, canCreateRole, ROLES } = useAuth();
  const { t } = useLanguage();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('player');
  const [currency, setCurrency] = useState('TND');
  const [balance, setBalance] = useState('0');
  const [message, setMessage] = useState({ type: '', text: '' });

  const allowedRoles = useMemo(
    () => ALL_ROLES.filter((r) => user && canCreateRole(user.role, r.value)),
    [user, canCreateRole]
  );

  const canCreateAny = allowedRoles.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    const result = await createUser({
      login,
      password,
      role: allowedRoles.some((r) => r.value === role) ? role : (allowedRoles[0]?.value ?? 'player'),
      balance,
      currency,
    });
    if (result.ok) {
      const passwordNote = result.initialPassword
        ? ` Mot de passe initial : ${result.initialPassword} — Notez-le ou communiquez-le à l'utilisateur (il ne sera plus affiché).`
        : '';
      setMessage({ type: 'success', text: `Compte créé avec succès.${passwordNote}` });
      setLogin('');
      setPassword('');
      setRole(allowedRoles[0]?.value ?? 'player');
      setCurrency('TND');
      setBalance('0');
    } else {
      setMessage({ type: 'error', text: result.error });
    }
  };

  if (!user) return null;
  if (!canCreateAny) {
    return (
      <div className="dashboard-page">
        <h1>New User</h1>
        <p className="form-message error">Vous n&apos;êtes pas autorisé à créer des comptes (Cashier crée uniquement des joueurs).</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <h1>New User</h1>
      <p className="page-desc">
        Master : partner, superadmin, admin, cashier, player. Partner : superadmin, admin, cashier. Superadmin : admin, cashier, player. Admin : cashier, player. Cashier : player uniquement.
      </p>
      <form className="form-transfer" onSubmit={handleSubmit}>
        <label>
          Login
          <input
            type="text"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="login ou email"
            required
          />
        </label>
        <label>
          Mot de passe
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
          />
        </label>
        <label>
          Rôle
          <select
            value={allowedRoles.some((r) => r.value === role) ? role : (allowedRoles[0]?.value ?? '')}
            onChange={(e) => setRole(e.target.value)}
          >
            {allowedRoles.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </label>
        <label>
          {t('currency')} (EUR / TND / USD)
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {CURRENCIES_LIST.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Solde initial
          <input
            type="text"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            placeholder="0"
          />
        </label>
        {message.text && (
          <p className={`form-message ${message.type}`}>{message.text}</p>
        )}
        <button type="submit">Créer le compte</button>
      </form>
    </div>
  );
}
