import { useAuth } from '../../context/AuthContext';
import { useLanguage, formatBalance } from '../../context/LanguageContext';
import './DashboardPages.css';

export default function UsersProfit() {
  const { user, users, canSeeUserBalance, getVisibleUsers } = useAuth();
  const { t } = useLanguage();
  const visibleUsers = getVisibleUsers(user, users);
  return (
    <div className="dashboard-page">
      <h1>{t('usersProfit')}</h1>
      <p className="page-desc">Aperçu des soldes (EUR / TND / USD). Le solde du compte master n&apos;est visible que par le master.</p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('username')}</th>
              <th>{t('role')}</th>
              <th>{t('balance')}</th>
              <th>{t('currency')}</th>
            </tr>
          </thead>
          <tbody>
            {visibleUsers.map((u) => (
              <tr key={u.id}>
                <td>{u.login}</td>
                <td>{u.role}</td>
                <td>
                  {user && canSeeUserBalance(user.role, u)
                    ? formatBalance(u.balance ?? 0, u.currency)
                    : '—'}
                </td>
                <td>{u.currency || 'TND'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
