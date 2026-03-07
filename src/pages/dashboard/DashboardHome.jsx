import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage, formatBalance, convertBalance } from '../../context/LanguageContext';
import './DashboardPages.css';

export default function DashboardHome() {
  const { user, ROLES } = useAuth();
  const { displayCurrency } = useLanguage();
  const isPlayer = user?.role === ROLES.PLAYER;
  const balanceConverted = convertBalance(user?.balance ?? 0, user?.currency, displayCurrency);

  if (isPlayer) {
    return (
      <div className="dashboard-page">
        <h1>Mon compte</h1>
        <p>Bienvenue, <strong>{user?.login}</strong>.</p>
        <p>Solde actuel: <strong>{formatBalance(balanceConverted, displayCurrency)}</strong></p>
        <Link to="/casino" className="btn-play-dashboard">Jouer aux jeux</Link>
        <p className="player-hint">Utilisez le menu pour consulter l&apos;historique ou modifier votre mot de passe.</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <h1>Tableau de bord</h1>
      <p>Bienvenue, <strong>{user?.login}</strong> (rôle: {user?.role}).</p>
      <p>Solde actuel: <strong>{formatBalance(balanceConverted, displayCurrency)}</strong></p>
      <p>Utilisez le menu à gauche pour gérer les utilisateurs, les transferts et l&apos;historique.</p>
    </div>
  );
}
