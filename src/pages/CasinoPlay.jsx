import { Link } from 'react-router-dom';
import SlotGame from '../components/SlotGame';
import './CasinoPlay.css';

export default function CasinoPlay() {
  return (
    <div className="casino-play-page">
      <div className="casino-play-header">
        <Link to="/casino" className="back-link">← Retour au casino</Link>
        <h1>Slot Machine</h1>
        <p>Jouez avec votre solde (master → superadmin → admin → cashier → joueur)</p>
      </div>
      <SlotGame />
    </div>
  );
}
