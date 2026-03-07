import { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './CasinoPlay.css';

/**
 * Page 5 Lions Slot : iframe du jeu, solde et gains via postMessage (comme Plinko).
 */
export default function Casino5Lions() {
  const iframeRef = useRef(null);
  const { user, gamePlay } = useAuth();

  const balance = user?.balance ?? 0;

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage({ type: 'slotBalance', balance }, '*');
  }, [balance]);

  useEffect(() => {
    const handler = async (event) => {
      const d = event.data;
      if (!d || d.type !== 'slotLanded') return;
      const { bet, winAmount } = d;
      const target = iframeRef.current?.contentWindow;
      if (!user) {
        if (target) target.postMessage({ type: 'slotResult', winAmount: 0, balance: 0 }, '*');
        return;
      }
      const result = await gamePlay(Number(bet), 'slot-lions', { winAmount: Number(winAmount) || 0 });
      if (target) {
        target.postMessage({
          type: 'slotResult',
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
        title="5 Lions Slot"
        src="/5lions-standalone.html"
        className="plinko-iframe"
        onLoad={() => {
          const target = iframeRef.current?.contentWindow;
          if (target) target.postMessage({ type: 'slotBalance', balance }, '*');
        }}
      />
    </div>
  );
}
