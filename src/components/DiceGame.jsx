import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage, formatBalance } from '../context/LanguageContext';
import './SlotGame.css';

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export default function DiceGame() {
  const { user, gamePlay } = useAuth();
  const { t } = useLanguage();
  const [bet, setBet] = useState('1');
  const [rolling, setRolling] = useState(false);
  const [diceValue, setDiceValue] = useState(0);
  const [lastWin, setLastWin] = useState(null);
  const [error, setError] = useState('');

  const balance = user?.balance ?? 0;
  const currency = user?.currency || 'TND';

  const handleRoll = () => {
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
    setRolling(true);
    setTimeout(async () => {
      const result = await gamePlay(amount, 'dice');
      setRolling(false);
      if (!result.ok) {
        setError(result.error || 'Erreur');
        return;
      }
      setDiceValue(result.diceValue ?? 0);
      setLastWin(result.winAmount);
    }, 500);
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

      <div className={`slot-reels ${rolling ? 'spinning' : ''}`}>
        <div className="slot-reel dice-reel">
          <span>{diceValue > 0 ? DICE_FACES[diceValue - 1] : '?'}</span>
        </div>
      </div>

      {lastWin !== null && (
        <div className={`slot-result ${lastWin > 0 ? 'win' : 'lose'}`}>
          {lastWin > 0 ? `Gagné: ${formatBalance(lastWin, currency)}` : 'Perdu'}
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
            disabled={rolling}
          />
        </label>
        <button
          type="button"
          className="slot-spin"
          onClick={handleRoll}
          disabled={rolling || balance < Number(bet)}
        >
          {rolling ? '...' : 'Lancer'}
        </button>
      </div>

      <p className="slot-rules">
        5 ou 6 : gain 2× la mise · 1, 2, 3 ou 4 : perdu
      </p>
    </div>
  );
}
