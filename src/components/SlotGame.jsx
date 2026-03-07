import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage, formatBalance } from '../context/LanguageContext';
import './SlotGame.css';

const SYMBOLS = ['🍒', '🍋', '7️⃣', '📊']; // cerise, citron, 7, bar

export default function SlotGame() {
  const { user, gamePlay } = useAuth();
  const { t } = useLanguage();
  const [bet, setBet] = useState('1');
  const [spinning, setSpinning] = useState(false);
  const [reels, setReels] = useState([0, 0, 0]);
  const [lastWin, setLastWin] = useState(null);
  const [error, setError] = useState('');

  const balance = user?.balance ?? 0;
  const currency = user?.currency || 'TND';

  const handleSpin = () => {
    setError('');
    setLastWin(null);
    const amount = Number(bet?.replace(',', '.'));
    if (!amount || amount <= 0) {
      setError('Saisissez une mise valide.');
      return;
    }
    if (balance < amount) {
      setError('Solde insuffisant.');
      return;
    }
    setSpinning(true);
    setTimeout(async () => {
      const result = await gamePlay(amount);
      setSpinning(false);
      if (!result.ok) {
        setError(result.error || 'Erreur');
        return;
      }
      setReels(result.symbols ?? [0, 0, 0]);
      setLastWin(result.winAmount);
    }, 600);
  };

  if (!user) {
    return (
      <div className="slot-game slot-game-guest">
        <p>Connectez-vous pour jouer avec votre solde.</p>
      </div>
    );
  }

  return (
    <div className="slot-game">
      <div className="slot-balance">
        <span className="slot-balance-label">{t('balance')}</span>
        <span className="slot-balance-value">{formatBalance(balance, currency)}</span>
      </div>

      <div className={`slot-reels ${spinning ? 'spinning' : ''}`}>
        <div className="slot-reel"><span>{SYMBOLS[reels[0]]}</span></div>
        <div className="slot-reel"><span>{SYMBOLS[reels[1]]}</span></div>
        <div className="slot-reel"><span>{SYMBOLS[reels[2]]}</span></div>
      </div>

      {lastWin !== null && (
        <div className={`slot-result ${lastWin > 0 ? 'win' : 'lose'}`}>
          {lastWin > 0 ? `Gagné: ${formatBalance(lastWin, currency)}` : 'Pas de gain'}
        </div>
      )}

      {error && <p className="slot-error">{error}</p>}

      <div className="slot-controls">
        <label>
          <span>Mise</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={bet}
            onChange={(e) => setBet(e.target.value)}
            disabled={spinning}
          />
        </label>
        <button
          type="button"
          className="slot-spin"
          onClick={handleSpin}
          disabled={spinning || balance < Number(bet)}
        >
          {spinning ? '...' : 'Tourner'}
        </button>
      </div>

      <p className="slot-rules">
        3 identiques: 5x à 15x · 2 identiques: 2x
      </p>
    </div>
  );
}
