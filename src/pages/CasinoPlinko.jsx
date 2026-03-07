import { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './CasinoPlay.css';

/**
 * Page Plinko : iframe du jeu avec solde joueur, mise variable (1, 2, 3... dinars), taux de gain master (postMessage).
 */
export default function CasinoPlinko() {
  const iframeRef = useRef(null);
  const { user, gamePlay } = useAuth();

  const balance = user?.balance ?? 0;

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage({ type: 'plinkoBalance', balance }, '*');
  }, [balance]);

  useEffect(() => {
    const handler = async (event) => {
      const d = event.data;
      if (!d || d.type !== 'plinkoLanded') return;
      const { bet, slot, rows, risk } = d;
      const target = iframeRef.current?.contentWindow;
      if (!user) {
        if (target) target.postMessage({ type: 'plinkoResult', winAmount: 0, balance: 0 }, '*');
        return;
      }
      const result = await gamePlay(Number(bet), 'plinko', { rows, risk, slot });
      if (target) {
        target.postMessage({
          type: 'plinkoResult',
          winAmount: result.winAmount ?? 0,
          balance: result.balance ?? balance,
        }, '*');
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [user, gamePlay, balance]);

  return (
    <div className="casino-play-page casino-play-plinko">
      <div className="casino-play-header casino-play-plinko-header">
        <Link to="/casino" className="back-link">← Retour au casino</Link>
      </div>
      <iframe
        ref={iframeRef}
        title="Plinko"
        src="/plinko-standalone.html"
        className="plinko-iframe"
        onLoad={() => {
          const target = iframeRef.current?.contentWindow;
          if (target) target.postMessage({ type: 'plinkoBalance', balance }, '*');
        }}
      />
    </div>
  );
}
