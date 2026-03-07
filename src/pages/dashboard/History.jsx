import { useAuth } from '../../context/AuthContext';
import { formatBalance } from '../../context/LanguageContext';
import './DashboardPages.css';

export default function History() {
  const { user, users, getTransactionsForUser } = useAuth();
  const txs = getTransactionsForUser(user?.id).sort((a, b) => b.at - a.at);

  const getLogin = (id) => users.find((u) => u.id === id)?.login ?? id;
  const getUser = (id) => users.find((u) => u.id === id);

  return (
    <div className="dashboard-page">
      <h1>History</h1>
      <p className="page-desc">Historique des transactions pour ce compte.</p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>De</th>
              <th>Vers</th>
              <th>Montant</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {txs.length === 0 ? (
              <tr>
                <td colSpan={6}>Aucune transaction</td>
              </tr>
            ) : (
              txs.map((tx) => (
                <tr key={tx.id}>
                  <td>{new Date(tx.at).toLocaleString('fr-FR')}</td>
                  <td>{tx.type}</td>
                  <td>{getLogin(tx.fromId)}</td>
                  <td>{getLogin(tx.toId)}</td>
                  <td>
                    {tx.amount != null && tx.amount !== 0
                      ? (tx.amount < 0 ? '− ' : '') + formatBalance(Math.abs(tx.amount), getUser(tx.fromId)?.currency || user?.currency || 'TND')
                      : '—'}
                  </td>
                  <td>{tx.note || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
