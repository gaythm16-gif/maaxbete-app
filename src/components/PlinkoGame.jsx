import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage, formatBalance } from '../context/LanguageContext';
import './PlinkoGame.css';

const PEG_RADIUS = 6;
const BALL_RADIUS = 10;
const ROW_HEIGHT = 28;
const BOARD_PADDING = 20;
const SLOT_HEIGHT = 36;
const SETTLE_VELOCITY = 0.3;
const SETTLE_FRAMES = 15;

export default function PlinkoGame() {
  const { user, gamePlay, getPlinkoMultipliers } = useAuth();
  const { t } = useLanguage();
  const [bet, setBet] = useState('1');
  const [risk, setRisk] = useState('medium');
  const [rows, setRows] = useState(12);
  const [history, setHistory] = useState([]);
  const [lastResult, setLastResult] = useState(null);
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(false);
  const [autoMode, setAutoMode] = useState(false);
  const [howToOpen, setHowToOpen] = useState(false);
  const [matterReady, setMatterReady] = useState(!!(typeof window !== 'undefined' && window.Matter));
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const ballRef = useRef(null);
  const settleCountRef = useRef(0);
  const animRef = useRef(null);
  const dropQueueRef = useRef(0);
  const pendingBetRef = useRef(0);

  const balance = user?.balance ?? 0;
  const currency = user?.currency || 'TND';
  const multipliers = getPlinkoMultipliers(rows, risk);
  const numSlots = rows + 1;
  const isPlaying = !!ballRef.current;

  const boardWidth = Math.min(900, (typeof window !== 'undefined' ? window.innerWidth : 900) - 280);
  const boardHeight = rows * ROW_HEIGHT + SLOT_HEIGHT + BOARD_PADDING * 2;
  const slotTopY = boardHeight - SLOT_HEIGHT - BOARD_PADDING;
  const slotWidth = (boardWidth - BOARD_PADDING * 2) / numSlots;

  const getSlotFromX = useCallback(
    (x) => {
      const left = BOARD_PADDING;
      const rel = x - left;
      const slot = Math.floor(rel / slotWidth);
      return Math.max(0, Math.min(numSlots - 1, slot));
    },
    [numSlots, slotWidth]
  );

  const initWorld = useCallback(() => {
    const Matter = window.Matter;
    if (!Matter || !canvasRef.current) return null;
    const { Engine, Render, Runner, World, Bodies, Body, Events } = Matter;
    const canvas = canvasRef.current;
    const width = boardWidth;
    const height = boardHeight;
    const engine = Engine.create({ gravity: { x: 0, y: 1 } });
    const render = Render.create({
      canvas,
      engine,
      options: {
        width,
        height,
        wireframes: false,
        background: '#1a1a1e',
      },
    });
    Render.run(render);
    const runner = Runner.create();
    Runner.run(runner, engine);

    const leftWall = Bodies.rectangle(-20, height / 2, 40, height + 100, { isStatic: true, render: { fillStyle: '#25252b' } });
    const rightWall = Bodies.rectangle(width + 20, height / 2, 40, height + 100, { isStatic: true, render: { fillStyle: '#25252b' } });
    const floor = Bodies.rectangle(width / 2, height + 30, width + 100, 60, { isStatic: true, render: { fillStyle: '#25252b' } });
    World.add(engine.world, [leftWall, rightWall, floor]);

    for (let r = 0; r < rows; r++) {
      const numPegs = r + 1;
      for (let i = 0; i < numPegs; i++) {
        const x = BOARD_PADDING + (boardWidth - BOARD_PADDING * 2) * (i + 0.5) / numPegs;
        const y = BOARD_PADDING + r * ROW_HEIGHT + ROW_HEIGHT / 2;
        const peg = Bodies.circle(x, y, PEG_RADIUS, {
          isStatic: true,
          restitution: 0.6,
          render: { fillStyle: '#444', strokeStyle: '#555', lineWidth: 1 },
        });
        World.add(engine.world, peg);
      }
    }

    engineRef.current = { engine, render, runner };
    return engine;
  }, [rows, boardWidth, boardHeight]);

  const dropBall = useCallback(() => {
    const Matter = window.Matter;
    const eng = engineRef.current;
    if (!Matter || !eng || !canvasRef.current) return;
    const { Bodies, World } = Matter;
    const centerX = boardWidth / 2;
    const dropX = centerX + (Math.random() - 0.5) * 80;
    const ball = Bodies.circle(dropX, BOARD_PADDING + BALL_RADIUS + 4, BALL_RADIUS, {
      restitution: 0.4,
      friction: 0.01,
      density: 0.004,
      render: { fillStyle: '#d4af37', strokeStyle: '#b8960c', lineWidth: 2 },
    });
    World.add(eng.engine.world, ball);
    ballRef.current = ball;
    settleCountRef.current = 0;
  }, [boardWidth]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.Matter) {
      setMatterReady(true);
      return;
    }
    const id = setInterval(() => {
      if (window.Matter) {
        setMatterReady(true);
        clearInterval(id);
      }
    }, 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const Matter = window.Matter;
    if (!Matter || !matterReady) return;
    initWorld();
    return () => {
      if (engineRef.current) {
        Matter.Render.stop(engineRef.current.render);
        Matter.Runner.stop(engineRef.current.runner);
        engineRef.current = null;
        ballRef.current = null;
      }
    };
  }, [initWorld, matterReady]);

  useEffect(() => {
    if (!engineRef.current || !ballRef.current) return;
    const engine = engineRef.current.engine;
    const ball = ballRef.current;
    const checkSettle = () => {
      const vy = ball.velocity.y;
      const vx = ball.velocity.x;
      const speed = Math.sqrt(vy * vy + vx * vx);
      if (ball.position.y >= slotTopY - 5 && speed < SETTLE_VELOCITY) {
        settleCountRef.current++;
        if (settleCountRef.current >= SETTLE_FRAMES) {
          const slot = getSlotFromX(ball.position.x);
          const betAmount = pendingBetRef.current || Number(String(bet).replace(',', '.'));
          if (user && betAmount > 0) {
            gamePlay(betAmount, 'plinko', { rows, risk, slot }).then((result) => {
              if (result.ok) {
                setLastResult({ slot, multiplier: result.plinkoMultiplier, winAmount: result.winAmount });
                setHistory((h) => [{ slot, multiplier: result.plinkoMultiplier, winAmount: result.winAmount }, ...h].slice(0, 10));
                setError('');
              } else {
                setError(result.error || 'Erreur');
              }
            });
          }
          Matter.World.remove(engine.world, ball);
          ballRef.current = null;
        }
      } else {
        settleCountRef.current = 0;
      }
    };
    const loop = () => {
      if (ballRef.current) checkSettle();
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [user, rows, risk, gamePlay, getSlotFromX, slotTopY]);

  const handleDrop = () => {
    setError('');
    setLastResult(null);
    const amount = Number(String(bet).replace(',', '.'));
    if (!user) {
      setError('Connectez-vous pour jouer.');
      return;
    }
    if (!amount || amount <= 0) {
      setError('Mise invalide.');
      return;
    }
    if (balance < amount) {
      setError('Solde insuffisant.');
      return;
    }
    if (ballRef.current) {
      dropQueueRef.current++;
      return;
    }
    dropBall();
    pendingBetRef.current = amount;
  };

  const handleReset = () => {
    const Matter = window.Matter;
    const eng = engineRef.current;
    if (Matter && eng && ballRef.current) {
      Matter.World.remove(eng.engine.world, ballRef.current);
      ballRef.current = null;
    }
    setLastResult(null);
    setError('');
  };

  const handleHalf = () => setBet(String(Math.max(0.01, (Number(String(bet).replace(',', '.')) || 0) / 2).toFixed(2)));
  const handleDouble = () => setBet(String((Number(String(bet).replace(',', '.')) || 0) * 2));

  if (!user) {
    return (
      <div className="plinko-page">
        <h1 className="plinko-title">PLINKO</h1>
        <div className="plinko-guest">
          <p>Connectez-vous pour jouer avec votre solde.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="plinko-page">
      <h1 className="plinko-title">PLINKO</h1>

      <div className="plinko-layout">
        <aside className="plinko-controls">
          <div className="plinko-balance">
            {t('balance')}: <strong>{formatBalance(balance, currency)}</strong>
          </div>
          <div className="plinko-field">
            <label>Mise (Bet)</label>
            <div className="bet-row">
              <input
                type="number"
                min="1"
                max={balance}
                step="0.01"
                value={bet}
                onChange={(e) => setBet(e.target.value)}
                disabled={isPlaying}
              />
              <div className="bet-btns">
                <button type="button" onClick={handleHalf} disabled={isPlaying}>½</button>
                <button type="button" onClick={handleDouble} disabled={isPlaying}>2×</button>
              </div>
            </div>
          </div>
          <div className="plinko-field">
            <label>Risk</label>
            <select value={risk} onChange={(e) => setRisk(e.target.value)} disabled={isPlaying}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="plinko-field">
            <label>Lignes (Rows)</label>
            <select value={rows} onChange={(e) => setRows(Number(e.target.value))} disabled={isPlaying}>
              {[10, 11, 12, 13, 14, 15, 16].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="plinko-actions">
            <button type="button" className="plinko-btn plinko-btn-drop" onClick={handleDrop} disabled={isPlaying || balance < (Number(String(bet).replace(',', '.')) || 0)}>
              DROP
            </button>
            <button type="button" className="plinko-btn plinko-btn-reset" onClick={handleReset} disabled={!isPlaying}>
              RESET
            </button>
          </div>
          <label className="plinko-mute">
            <input type="checkbox" checked={muted} onChange={(e) => setMuted(e.target.checked)} />
            Mute
          </label>
          {lastResult !== null && (
            <div className={`plinko-result ${lastResult.winAmount >= Number(bet) ? 'win' : lastResult.winAmount > 0 ? 'partial' : 'lose'}`}>
              {lastResult.winAmount > 0 ? `+${formatBalance(lastResult.winAmount, currency)} (${lastResult.multiplier}×)` : 'Perdu'}
            </div>
          )}
          {error && <p className="plinko-error">{error}</p>}
          <div className="plinko-history">
            <h4>Derniers résultats (10)</h4>
            <ul>
              {history.length === 0 && <li className="muted">—</li>}
              {history.map((h, i) => (
                <li key={i}>{h.multiplier}× → {h.winAmount > 0 ? `+${formatBalance(h.winAmount, currency)}` : '0'}</li>
              ))}
            </ul>
          </div>
        </aside>

        <main className="plinko-board-wrap">
          {!matterReady && <p className="plinko-loading">Chargement de la physique…</p>}
          <div className="plinko-canvas-wrap" style={{ width: boardWidth, height: boardHeight }}>
            <canvas ref={canvasRef} width={boardWidth} height={boardHeight} />
          </div>
          <div className="plinko-slots" style={{ width: boardWidth, gridTemplateColumns: `repeat(${numSlots}, 1fr)` }}>
            {multipliers.map((mult, i) => (
              <div
                key={i}
                className={`plinko-slot ${lastResult?.slot === i ? 'plinko-slot-win' : ''} slot-${mult >= 5 ? 'high' : mult >= 2 ? 'mid' : 'low'}`}
              >
                {Number(mult) % 1 === 0 ? `${mult}×` : `${mult}×`}
              </div>
            ))}
          </div>
        </main>
      </div>

      <section className="plinko-howto">
        <button type="button" className="plinko-howto-toggle" onClick={() => setHowToOpen(!howToOpen)}>
          How to play
        </button>
        {howToOpen && (
          <div className="plinko-howto-content">
            <p>Choisissez la <strong>mise</strong>, le <strong>risk</strong> (Low / Medium / High) et le nombre de <strong>lignes</strong> (10 à 16).</p>
            <p>Cliquez sur <strong>DROP</strong> pour lâcher une bille depuis le haut. Elle rebondit sur les clous et tombe dans un des slots en bas.</p>
            <p>Chaque slot affiche un <strong>multiplicateur</strong> (0.2× à 10×). Votre gain = mise × multiplicateur du slot d’arrivée. Le solde est mis à jour selon le taux de gain de votre compte.</p>
          </div>
        )}
      </section>
    </div>
  );
}
