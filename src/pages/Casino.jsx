import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getProviders, getGameList, launchGame, getMyIp, getCasinoBalance, syncCasinoBalance as syncBalanceToServer, depositToNexus } from '../services/nexusApi';
import { getDemoGameImage } from '../utils/demoGameImage';
import './Casino.css';

/** Ne jamais afficher "API_BASE is not defined" : remplacer par un message invitant à recharger. */
function normalizeError(msg) {
  if (msg == null) return msg;
  const s = String(msg);
  if (s.includes('API_BASE') || s.includes('is not defined')) {
    return 'RELOAD_PAGE';
  }
  return msg;
}

function GameCard({ g, user, t, tagLabel }) {
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
      {tagLabel(g) && (
        <span className={`game-badge ${g.dropsWins ? 'drops' : 'new'}`}>
          {tagLabel(g)}
        </span>
      )}
      <p className="game-name">{g.name}</p>
      {g.provider && <p className="game-provider">{g.provider}</p>}
    </div>
  );
}

export default function Casino() {
  const { t } = useLanguage();
  const { user, syncCasinoBalance } = useAuth();
  const [games, setGames] = useState([]);
  const [providers, setProviders] = useState([]);
  const [currentProvider, setCurrentProvider] = useState('PRAGMATIC');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDemoList, setIsDemoList] = useState(false);
  const [sortBy, setSortBy] = useState('popularite');
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [filterProvider, setFilterProvider] = useState('all');
  const [launching, setLaunching] = useState(false);
  const [gameLaunchUrl, setGameLaunchUrl] = useState(null);
  const [whitelistIp, setWhitelistIp] = useState(null);
  const [balanceRefreshing, setBalanceRefreshing] = useState(false);
  const [providerSearch, setProviderSearch] = useState('');
  const [providerDropdownOpen, setProviderDropdownOpen] = useState(false);

  // Au chargement, récupérer le solde casino (serveur) et synchroniser avec le contexte ; sinon envoyer le solde local au serveur
  useEffect(() => {
    if (!user?.login) return;
    let cancelled = false;
    getCasinoBalance(user.login).then((result) => {
      if (cancelled) return;
      if (result.ok && result.balance != null) {
        syncCasinoBalance(result.balance);
      } else {
        syncBalanceToServer(user.login, user.balance ?? 0, user.currency || 'TND');
      }
    });
    return () => { cancelled = true; };
  }, [user?.login]);

  // Charger la liste des providers depuis l'API (ou démo)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setIsDemoList(false);
    getProviders()
      .then((result) => {
        if (cancelled) return;
        if (result.ok && Array.isArray(result.providers) && result.providers.length > 0) {
          setProviders(result.providers);
          setWhitelistIp(null);
          const pragmatic = result.providers.find((p) => p.code === 'PRAGMATIC');
          const initialProvider = pragmatic ? pragmatic.code : result.providers[0].code;
          setCurrentProvider(initialProvider);
          setFilterProvider('all');
        } else {
          setProviders([{ code: 'PRAGMATIC', name: 'Pragmatic Play', status: 1 }, { code: "PLAY'N GO", name: "Play'n GO", status: 1 }]);
          setCurrentProvider('PRAGMATIC');
          if (result.ipWhitelistHint && result.hint) {
            setError(normalizeError(result.hint));
            getMyIp().then((ips) => setWhitelistIp(ips));
          } else if (result.error && result.error !== 'Réseau') {
            setError(normalizeError(result.error));
            setWhitelistIp(null);
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(normalizeError(err.message) || 'Erreur provider_list');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Charger la liste des jeux pour le provider courant
  useEffect(() => {
    let cancelled = false;
    if (!currentProvider && providers.length === 0) return;
    setLoading(true);
    setError(null);
    setIsDemoList(false);
    getGameList(currentProvider)
      .then((result) => {
        if (cancelled) return;
        if (result.ok && Array.isArray(result.games)) {
          setGames(result.games);
          setIsDemoList(!!result.isDemo);
          if (result.isDemo && result.ipWhitelistHint && result.hint) {
            setError(normalizeError(result.hint));
            getMyIp().then((ips) => setWhitelistIp(ips));
          }
        } else {
          setError(normalizeError(result.error) || t('casinoLoadError') || 'Impossible de charger les jeux.');
          setGames([]);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(normalizeError(err.message) || 'Erreur réseau');
          setGames([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [currentProvider]);

  const searchTrim = search.trim().toLowerCase();
  let filtered = games;
  if (searchTrim) {
    filtered = filtered.filter(
      (g) =>
        (g.name && g.name.toLowerCase().includes(searchTrim)) ||
        (g.provider && g.provider.toLowerCase().includes(searchTrim))
    );
  }
  if (filterCat && filterCat !== 'all') {
    filtered = filtered.filter((g) => {
      if (filterCat === 'new') return g.isNew;
      if (filterCat === 'drops') return g.dropsWins;
      return true;
    });
  }
  if (filterProvider && filterProvider !== 'all') {
    filtered = filtered.filter((g) => (g.provider || '').toLowerCase() === filterProvider.toLowerCase());
  }
  if (sortBy === 'az') {
    filtered = [...filtered].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  const tagLabel = (g) => {
    if (g.dropsWins) return 'DROPS & WINS';
    if (g.isNew) return 'NOUVEAU';
    return g.tag || null;
  };

  const newGames = games.filter((g) => g.isNew);

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
    setGameLaunchUrl(''); // Affiche l'overlay tout de suite avec "Chargement..."
    setLaunching(true);
    const LAUNCH_TIMEOUT_MS = 20000; // 20 s max pour éviter blocage infini
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Délai dépassé. Actualisez la page (Ctrl+Shift+R) puis réessayez.')), LAUNCH_TIMEOUT_MS);
    });
    try {
      await Promise.all([
        syncBalanceToServer(user.login, user.balance, user.currency || 'TND'),
        depositToNexus(user.login, user.balance, user.currency || 'TND'),
      ]);
      const result = await Promise.race([
        launchGame({
          providerCode,
          gameCode,
          userCode: user.login,
          lang: 'en',
          balance: user.balance,
          currency: user.currency || 'TND',
        }),
        timeoutPromise,
      ]);
      if (result.ok && result.url) {
        setGameLaunchUrl(result.url);
      } else {
        setGameLaunchUrl(null);
        setError(normalizeError(result.error) || 'Impossible de lancer le jeu.');
        if (result.ipWhitelistHint && result.hint) setError(normalizeError(result.hint));
      }
    } catch (e) {
      setGameLaunchUrl(null);
      setError(normalizeError(e?.message) || 'Erreur lors du lancement du jeu.');
    } finally {
      setLaunching(false);
    }
  };

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
              title="Jeu casino"
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
        <img
          src="/389105134852633.61dd8a11bbdcf.gif"
          alt="Casino"
          className="casino-hero-gif-full"
        />
      </section>

      {user && (
        <p className="casino-balance-line casino-balance-below-hero">
          <strong>Votre solde :</strong> {Number(user.balance ?? 0).toFixed(2)} {user.currency || 'TND'}
          <button
            type="button"
            className="casino-balance-refresh"
            onClick={() => {
              setBalanceRefreshing(true);
              getCasinoBalance(user.login).then((r) => {
                if (r.ok && r.balance != null) syncCasinoBalance(r.balance);
                setBalanceRefreshing(false);
              });
            }}
            disabled={balanceRefreshing}
            title="Actualiser le solde après une partie"
          >
            {balanceRefreshing ? '…' : 'Actualiser le solde'}
          </button>
        </p>
      )}

      {!loading && games.length > 0 && (
        <>
          {isDemoList && (
            <p className="casino-demo-banner">
              <strong>Liste de démo</strong> — jeux affichés à titre d’exemple.
            </p>
          )}

          {providers.length > 0 && (
            <div className="casino-provider-search-wrap">
              <label className="casino-provider-search-label">Fournisseur</label>
              <div className="casino-provider-dropdown">
                <input
                  type="text"
                  className="casino-provider-search-input"
                  placeholder="Rechercher un fournisseur..."
                  value={providerDropdownOpen ? providerSearch : (filterProvider === 'all' ? 'Tous' : (providers.find((p) => p.code === filterProvider)?.name || filterProvider))}
                  onChange={(e) => setProviderSearch(e.target.value)}
                  onFocus={() => {
                    setProviderDropdownOpen(true);
                    setProviderSearch(filterProvider === 'all' ? '' : (providers.find((p) => p.code === filterProvider)?.name || ''));
                  }}
                  onBlur={() => setTimeout(() => setProviderDropdownOpen(false), 200)}
                />
                <span className="casino-provider-dropdown-arrow">▼</span>
                {providerDropdownOpen && (
                  <ul className="casino-provider-dropdown-list">
                    <li>
                      <button
                        type="button"
                        className={filterProvider === 'all' ? 'active' : ''}
                        onClick={() => {
                          setFilterProvider('all');
                          setCurrentProvider(providers.find((p) => p.code === 'PRAGMATIC')?.code || providers[0]?.code || '');
                          setProviderSearch('');
                          setProviderDropdownOpen(false);
                        }}
                      >
                        Tous
                      </button>
                    </li>
                    {providers
                      .filter((p) =>
                        (p.name || p.code || '').toLowerCase().includes(providerSearch.trim().toLowerCase())
                      )
                      .map((p) => (
                        <li key={p.code}>
                          <button
                            type="button"
                            className={filterProvider === p.code ? 'active' : ''}
                            onClick={() => {
                              setFilterProvider(p.code);
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
          )}

          <div className="casino-filters">
            <span>{t('sortBy')}</span>
            <button
              type="button"
              className={sortBy === 'popularite' ? 'active' : ''}
              onClick={() => setSortBy('popularite')}
            >
              {t('popularity')}
            </button>
            <button
              type="button"
              className={sortBy === 'az' ? 'active' : ''}
              onClick={() => setSortBy('az')}
            >
              A-Z
            </button>
            <span>{t('filterBy')}</span>
            <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
              <option value="all">{t('allCategories')}</option>
              <option value="new">NOUVEAU</option>
              <option value="drops">DROPS & WINS</option>
            </select>
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
          {(error === 'RELOAD_PAGE' || String(error).includes('is not defined') || String(error).includes('API_BASE'))
            ? (
              <>
                Ancienne version en cache. Actualisez la page pour charger la dernière version (évite l’erreur de chargement des jeux).
                <p style={{ marginTop: '0.75rem' }}>
                  <button
                    type="button"
                    className="casino-balance-refresh"
                    onClick={() => { window.location.href = window.location.pathname + '?_cb=' + Date.now(); }}
                  >
                    Actualiser maintenant
                  </button>
                </p>
                <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', opacity: 0.9 }}>
                  Si le message revient après clic, faites <strong>Ctrl+Shift+R</strong> (rechargement forcé).
                </p>
              </>
            )
            : error}
          {whitelistIp && (whitelistIp.ip || whitelistIp.ipv6) && (
            <>
              {whitelistIp.ipv6 && (
                <p style={{ marginTop: '0.75rem', fontWeight: 600 }}>
                  Adresse IPv6 (format comme la 2ᵉ de votre capture) : <strong>{whitelistIp.ipv6}</strong>
                </p>
              )}
              {whitelistIp.ip && (
                <p style={{ marginTop: '0.5rem', fontWeight: 600 }}>
                  Adresse IPv4 : <strong>{whitelistIp.ip}</strong>
                </p>
              )}
              <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                URL API : https://api.nexusggr.com
              </p>
            </>
          )}
        </div>
      )}

      {!loading && !error && newGames.length > 0 && filterProvider === 'all' && !searchTrim && (
        <section className="casino-section casino-section--new">
          <div className="casino-section-header">
            <h2 className="casino-section-title">Nouveautés</h2>
            <button
              type="button"
              className="casino-section-viewall"
              onClick={() => setFilterCat('all')}
            >
              Voir tout
            </button>
          </div>
          <div className="games-grid games-grid--new">
            {newGames.slice(0, 6).map((g) => (
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
                <GameCard g={g} user={user} t={t} tagLabel={tagLabel} />
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && !error && filtered.length === 0 && games.length === 0 && (
        <div className="games-grid games-grid--empty">
          <p className="casino-empty-message">{t('casinoEmptyMessage')}</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <section className="casino-section">
          {(filterProvider !== 'all' || filterCat !== 'all' || searchTrim || newGames.length === 0) && (
            <h2 className="casino-section-title">Tous les jeux</h2>
          )}
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
                <GameCard g={g} user={user} t={t} tagLabel={tagLabel} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
