import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './DashboardPages.css';
import './GameSettings.css';

export default function GameSettings() {
  const { user, getGameSettings, setGameSettings, ROLES } = useAuth();
  const [winPercentage, setWinPercentage] = useState(80);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const s = getGameSettings();
    setWinPercentage(s.winPercentage);
  }, [getGameSettings]);

  const isMaster = user?.role === ROLES.MASTER;

  const handleSave = (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    const result = setGameSettings(winPercentage);
    if (result.ok) setMessage({ type: 'success', text: 'Paramètres enregistrés.' });
    else setMessage({ type: 'error', text: result.error });
  };

  if (!user) return null;
  if (!isMaster) {
    return (
      <div className="dashboard-page">
        <h1>Paramètres jeux</h1>
        <p className="form-message error">Réservé au compte master.</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page game-settings-page">
      <h1>Paramètres jeux</h1>
      <p className="page-desc">
        Pourcentage <strong>global</strong> de gain pour tout le site : à chaque mise, le joueur a cette chance (en %) de gagner. 10 % = le casino « ferme » les gains (rarement gagner), 100 % = le casino « ouvre » (toujours gagner si le jeu paie). Vous pouvez aussi définir un pourcentage par compte dans All Users (colonne Taux gain %).
      </p>

      <form className="game-settings-form" onSubmit={handleSave}>
        <div className="setting-row">
          <label>
            <span className="setting-label">Pourcentage de gain global (par mise)</span>
            <span className="setting-value">{winPercentage} %</span>
          </label>
          <input
            type="range"
            min="10"
            max="100"
            step="5"
            value={winPercentage}
            onChange={(e) => setWinPercentage(Number(e.target.value))}
            className="win-slider"
          />
          <div className="slider-labels">
            <span>10 % (fermer — joueurs perdent plus)</span>
            <span>100 % (ouvrir — joueurs gagnent plus)</span>
          </div>
        </div>
        {message.text && <p className={`form-message ${message.type}`}>{message.text}</p>}
        <button type="submit" className="btn-save-settings">Enregistrer</button>
      </form>
    </div>
  );
}
