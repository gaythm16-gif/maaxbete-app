import { useAuth } from '../../context/AuthContext';
import './DashboardPages.css';

export default function TransactionsProfit() {
  const { users, transactions } = useAuth();
  const transfers = transactions.filter((t) => t.type === 'TRANSFER');
  const totalMoved = transfers.reduce((s, t) => s + (t.amount || 0), 0);

  const getLogin = (id) => users.find((u) => u.id === id)?.login ?? id;

  return (
    <div className="dashboard-page">
      <h1>Transactions Profit</h1>
      <p className="page-desc">Total des montants transférés: <strong>{totalMoved.toLocaleString('fr-FR')} €</strong></p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>De</th>
              <th>Vers</th>
              <th>Montant</th>
            </tr>
          </thead>
          <tbody>
            {transfers.length === 0 ? (
              <tr><td colSpan={4}>Aucun transfert</td></tr>
            ) : (
              [...transfers].reverse().map((tx) => (
                <tr key={tx.id}>
                  <td>{new Date(tx.at).toLocaleString('fr-FR')}</td>
                  <td>{getLogin(tx.fromId)}</td>
                  <td>{getLogin(tx.toId)}</td>
                  <td>{Number(tx.amount).toLocaleString('fr-FR')} €</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
