import { Link } from 'react-router-dom';
import DiceGame from '../components/DiceGame';
import './CasinoPlay.css';

export default function CasinoDice() {
  return (
    <div className="casino-play-page">
      <div className="casino-play-header">
        <Link to="/casino" className="back-link">← Retour au casino</Link>
        <h1>Dés</h1>
        <p>Lancez le dé : 5 ou 6 = gain 2× la mise</p>
      </div>
      <DiceGame />
    </div>
  );
}
