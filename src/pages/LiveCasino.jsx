import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getProviders, getGameList, launchGame, getMyIp, getCasinoBalance, syncCasinoBalance as syncBalanceToServer, depositToNexus } from '../services/nexusApi';
import { getDemoGameImage } from '../utils/demoGameImage';
import './Casino.css';

/** Fournisseurs considérés comme Live (code ou nom contient "Live" / noms connus). */
function isLiveProvider(p) {
  const name = (p.name || p.code || '').toLowerCase();
  const code = (p.code || '').toUpperCase();
  if (name.includes('live')) return true;
  if (['SPRIBE', 'EVOLUTION', 'PRAGMATIC PLAY LIVE', 'EZUGI', 'VIVO'].some((c) => code.includes(c.replace(/\s/g, '')) || name.includes(c.toLowerCase()))) return true;
  return false;
}

function GameCard({ g, user, t }) {
  const fallback = getDemoGameImage(g.id, g.name);
  const [imgSrc, setImgSrc] = useState(g.image || fallback);

  return (
    <div className="game-card">
      <div className="game-placeholder">
        <img
          src={imgSrc}
          alt=""
          className="game-thumb"
          loading="lazy"
          onError={() => setImgSrc(fallback)}
        />
        <span className="game-title-inner">{g.name}</span>
        <small>{user ? t('playWithBalance') || 'Jouer' : t('signInToPlay')}</small>
      </div>
      <p className="game-name">{g.name}</p>
      {g.provider && <p className="game-provider">{g.provider}</p>}
    </div>
  );
}

export default function LiveCasino() {
  const { t } = useLanguage();
  const { user, syncCasinoBalance } = useAuth();
  const [games, setGames] = useState([]);
  const [allProviders, setAllProviders] = useState([]);
  const [liveProviders, setLiveProviders] = useState([]);
  const [currentProvider, setCurrentProvider] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [gameLaunchUrl, setGameLaunchUrl] = useState(null);
  const [whitelistIp, setWhitelistIp] = useState(null);
  const [providerSearch, setProviderSearch] = useState('');
  const [providerDropdownOpen, setProviderDropdownOpen] = useState(false);

  useEffect(() => {
    if (!user?.login) return;
    let cancelled = false;
    getCasinoBalance(user.login).then((result) => {
      if (cancelled) return;
      if (result.ok && result.balance != null) syncCasinoBalance(result.balance);
      else syncBalanceToServer(user.login, user.balance ?? 0, user.currency || 'TND');
    });
    return () => { cancelled = true; };
  }, [user?.login]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getProviders()
      .then((result) => {
        if (cancelled) return;
        if (result.ok && Array.isArray(result.providers) && result.providers.length > 0) {
          setAllProviders(result.providers);
          const live = result.providers.filter(isLiveProvider);
          setLiveProviders(live);
          if (live.length > 0) {
            setCurrentProvider(live[0].code);
            setProviderSearch(live[0].name || live[0].code);
          }
          setWhitelistIp(null);
        } else {
          setLiveProviders([]);
          if (result.ipWhitelistHint && result.hint) {
            setError(result.hint);
            getMyIp().then((ips) => setWhitelistIp(ips));
          } else if (result.error && result.error !== 'Réseau') {
            setError(result.error);
          }
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Réseau');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!currentProvider || liveProviders.length === 0) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getGameList(currentProvider)
      .then((result) => {
        if (cancelled) return;
        if (result.ok && Array.isArray(result.games)) {
          setGames(result.games);
          if (result.isDemo && result.ipWhitelistHint && result.hint) {
            setError(result.hint);
            getMyIp().then((ips) => setWhitelistIp(ips));
          }
        } else {
          setGames([]);
          setError(result.error || t('casinoLoadError') || 'Impossible de charger les jeux.');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Réseau');
          setGames([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [currentProvider, liveProviders.length]);

  const searchTrim = search.trim().toLowerCase();
  const filtered = searchTrim
    ? games.filter(
        (g) =>
          (g.name && g.name.toLowerCase().includes(searchTrim)) ||
          (g.provider && g.provider.toLowerCase().includes(searchTrim))
      )
    : games;

  const handleLaunch = async (game) => {
    if (!user) {
      setError(t('signInToPlay'));
      return;
    }
    const bal = Number(user.balance) || 0;
    if (bal <= 0) {
      setError('Solde insuffisant. Créditez votre compte pour jouer.');
      return;
    }
    const providerCode = game.provider || currentProvider;
    const gameCode = game.code || game.id;
    if (!providerCode || !gameCode) return;
    setError(null);
    setGameLaunchUrl('');
    try {
      await Promise.all([
        syncBalanceToServer(user.login, user.balance, user.currency || 'TND'),
        depositToNexus(user.login, user.balance, user.currency || 'TND'),
      ]);
      const result = await launchGame({
        providerCode,
        gameCode,
        userCode: user.login,
        lang: 'en',
        balance: user.balance,
        currency: user.currency || 'TND',
      });
      if (result.ok && result.url) {
        setGameLaunchUrl(result.url);
      } else {
        setGameLaunchUrl(null);
        setError(result.error || 'Impossible de lancer le jeu.');
        if (result.ipWhitelistHint && result.hint) setError(result.hint);
      }
    } catch (e) {
      setGameLaunchUrl(null);
      const msg = e.message || 'Erreur lors du lancement.';
      if (msg.includes('API_BASE') && msg.includes('not defined')) {
        setError('Veuillez actualiser la page (Ctrl+F5) pour charger la dernière version.');
      } else {
        setError(msg);
      }
    }
  };

  const currentProviderName = liveProviders.find((p) => p.code === currentProvider)?.name || currentProvider;

  return (
    <div className="casino-page">
      {gameLaunchUrl !== null && (
        <div className="casino-game-overlay" role="dialog" aria-modal="true" aria-label="Jeu en cours">
          <div className="casino-game-overlay-header">
            <button
              type="button"
              className="casino-game-close"
              onClick={() => setGameLaunchUrl(null)}
              aria-label="Fermer le jeu"
            >
              Fermer le jeu
            </button>
          </div>
          {gameLaunchUrl ? (
            <iframe
              src={gameLaunchUrl}
              title="Live Casino"
              className="casino-game-iframe"
              allow="fullscreen; autoplay; payment"
              allowFullScreen
            />
          ) : (
            <div className="casino-game-loading">
              <span className="casino-game-spinner" aria-hidden />
              <p>Lancement du jeu…</p>
            </div>
          )}
        </div>
      )}

      <section className="casino-hero">
        <h1>{t('navLiveCasino')}</h1>
        <p>Jeux en direct avec croupiers réels.</p>
      </section>

      {user && (
        <p className="casino-balance-line casino-balance-below-hero">
          <strong>Votre solde :</strong> {Number(user.balance ?? 0).toFixed(2)} {user.currency || 'TND'}
          <button
            type="button"
            className="casino-balance-refresh"
            onClick={() => {
              getCasinoBalance(user.login).then((r) => {
                if (r.ok && r.balance != null) syncCasinoBalance(r.balance);
              });
            }}
            title="Actualiser le solde"
          >
            Actualiser le solde
          </button>
        </p>
      )}

      {!loading && liveProviders.length > 0 && (
        <>
          <div className="casino-provider-search-wrap">
            <label className="casino-provider-search-label">Fournisseur Live</label>
            <div className="casino-provider-dropdown">
              <input
                type="text"
                className="casino-provider-search-input"
                placeholder="Rechercher un fournisseur..."
                value={providerDropdownOpen ? providerSearch : (currentProviderName || '')}
                onChange={(e) => setProviderSearch(e.target.value)}
                onFocus={() => {
                  setProviderDropdownOpen(true);
                  setProviderSearch(currentProviderName || '');
                }}
                onBlur={() => setTimeout(() => setProviderDropdownOpen(false), 200)}
              />
              <span className="casino-provider-dropdown-arrow">▼</span>
              {providerDropdownOpen && (
                <ul className="casino-provider-dropdown-list">
                  {liveProviders
                    .filter((p) =>
                      (p.name || p.code || '').toLowerCase().includes(providerSearch.trim().toLowerCase())
                    )
                    .map((p) => (
                      <li key={p.code}>
                        <button
                          type="button"
                          className={currentProvider === p.code ? 'active' : ''}
                          onClick={() => {
                            setCurrentProvider(p.code);
                            setProviderSearch(p.name || p.code);
                            setProviderDropdownOpen(false);
                          }}
                        >
                          {p.name || p.code}
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>

          <div className="casino-filters">
            <input
              type="search"
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="casino-search-input"
            />
          </div>
        </>
      )}

      {searchTrim && !loading && (
        <p className="casino-search-result">
          {filtered.length === 0
            ? t('noGamesFound')
            : `${filtered.length} ${filtered.length === 1 ? t('gameFound') : t('gamesFound')}`}
        </p>
      )}

      {loading && (
        <div className="games-grid games-grid--empty">
          <p className="casino-loading">{t('loadingGames')}</p>
        </div>
      )}

      {error && !loading && (
        <div className="casino-error">
          {String(error).includes('API_BASE') && String(error).includes('not defined')
            ? 'Veuillez actualiser la page (Ctrl+F5 ou Cmd+Shift+R) pour charger la dernière version.'
            : error}
          {whitelistIp && (whitelistIp.ip || whitelistIp.ipv6) && (
            <>
              {whitelistIp.ipv6 && (
                <p style={{ marginTop: '0.75rem', fontWeight: 600 }}>
                  IPv6 : <strong>{whitelistIp.ipv6}</strong>
                </p>
              )}
              {whitelistIp.ip && (
                <p style={{ marginTop: '0.5rem', fontWeight: 600 }}>
                  IPv4 : <strong>{whitelistIp.ip}</strong>
                </p>
              )}
            </>
          )}
        </div>
      )}

      {!loading && liveProviders.length === 0 && !error && user && (
        <p className="casino-empty-message">Aucun fournisseur Live Casino disponible pour le moment.</p>
      )}

      {!loading && liveProviders.length > 0 && filtered.length === 0 && (
        <div className="games-grid games-grid--empty">
          <p className="casino-empty-message">{t('casinoEmptyMessage')}</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <section className="casino-section">
          <h2 className="casino-section-title">Jeux Live</h2>
          <div className="games-grid">
            {filtered.map((g) => (
              <div
                key={g.id}
                role="button"
                tabIndex={0}
                onClick={() => handleLaunch(g)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleLaunch(g);
                }}
                style={{ cursor: 'pointer' }}
              >
                <GameCard g={g} user={user} t={t} />
              </div>
            ))}
          </div>
        </section>
      )}

      {!user && (
        <p className="casino-free-loading">Connectez-vous pour accéder au Live Casino.</p>
      )}
    </div>
  );
}
