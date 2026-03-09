/**
 * Page affichée dans l’iframe quand l’API Casino ne peut pas lancer le jeu (mode démo / config API).
 * Utilisée comme URL de repli par le backend pour éviter une erreur brute.
 */
import { useSearchParams } from 'react-router-dom';
import './CasinoDemoUnavailable.css';

export default function CasinoDemoUnavailable() {
  const [params] = useSearchParams();
  const game = params.get('game') || '';

  return (
    <div className="casino-demo-unavailable">
      <div className="casino-demo-unavailable-card">
        <h1>Jeu en mode démo</h1>
        {game && <p className="casino-demo-game-name">Jeu : {game}</p>}
        <p>
          Pour lancer les jeux en réel, vérifiez la configuration de l’API Casino :
        </p>
        <ul>
          <li>Whitelist IP : ajoutez l’IP du backend (voir <code>/api/casino/my-ip</code>) dans le panneau API.</li>
          <li>Identifiants : CASINO_AGENT_CODE, CASINO_TOKEN, CASINO_SECRET sur Render.</li>
        </ul>
        <p className="casino-demo-note">Vous pouvez fermer cette fenêtre et réessayer un autre jeu.</p>
      </div>
    </div>
  );
}
