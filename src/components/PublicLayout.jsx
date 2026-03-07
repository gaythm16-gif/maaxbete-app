import { Link, NavLink, Outlet } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage, formatBalance, LANG_LABELS, convertBalance, CURRENCIES_ORDER } from '../context/LanguageContext';
import './PublicLayout.css';

const NAV_ITEMS = [
  { path: '/paris-sportifs', labelKey: 'navSports' },
  { path: '/paris-direct', labelKey: 'navLive' },
  { path: '/casino', labelKey: 'navCasino' },
  { path: '/live-casino', labelKey: 'navLiveCasino' },
  { path: '/virtuels', labelKey: 'navVirtuels' },
];

export default function PublicLayout() {
  const { user, login, logout, ROLES } = useAuth();
  const { lang, setLang, t, displayCurrency, setDisplayCurrency } = useLanguage();
  const [loginOpen, setLoginOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const langWrapRef = useRef(null);
  const currencyWrapRef = useRef(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!langOpen) return;
    const close = (e) => {
      if (langWrapRef.current && !langWrapRef.current.contains(e.target)) setLangOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [langOpen]);

  useEffect(() => {
    if (!currencyOpen) return;
    const close = (e) => {
      if (currencyWrapRef.current && !currencyWrapRef.current.contains(e.target)) setCurrencyOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [currencyOpen]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(username, password);
    if (result.ok) {
      setLoginOpen(false);
      setUsername('');
      setPassword('');
    } else setError(result.error || '');
  };

  return (
    <div className="public-layout">
      <header className="site-header">
        <div className="header-top-bar">
          <Link to="/" className="logo-link">
            <span className="logo-text">
              M<span className="logo-aa">AA</span>XBET<span className="logo-e">E</span>
            </span>
          </Link>
          <div className="header-right">
          {user ? (
            <>
              <div className="header-right-top">
                {user.role === ROLES.MASTER ? (
                  <div className="header-balance-wrap" ref={currencyWrapRef}>
                    <button type="button" className="header-currency-btn" onClick={() => setCurrencyOpen((o) => !o)} aria-expanded={currencyOpen} aria-haspopup="true">
                      <span className="header-balance" title={t('yourBalance')}>
                        {formatBalance(convertBalance(user.balance ?? 0, user.currency, displayCurrency), displayCurrency)}
                      </span>
                      <span className="header-currency-arrow">▼</span>
                    </button>
                    {currencyOpen && (
                      <div className="header-currency-dropdown" role="menu">
                        {CURRENCIES_ORDER.map((c) => (
                          <button key={c.code} type="button" role="menuitem" className={displayCurrency === c.code ? 'active' : ''} onClick={() => { setDisplayCurrency(c.code); setCurrencyOpen(false); }}>
                            {c.label} ({c.symbol})
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="header-balance header-balance-only" title={t('yourBalance')}>
                    {formatBalance(user.balance ?? 0, user.currency || 'TND')}
                  </span>
                )}
              </div>
              <div className="header-right-bottom">
                <div className="lang-select-wrap" ref={langWrapRef}>
                  <button type="button" className="lang-select" onClick={() => setLangOpen((o) => !o)} aria-expanded={langOpen} aria-haspopup="true">
                    <span className="lang-flag">{lang === 'fr' ? '🇫🇷' : lang === 'ar' ? '🇸🇦' : '🇬🇧'}</span>
                    <span>{LANG_LABELS[lang] || 'Français'}</span>
                    <span className="lang-arrow">▼</span>
                  </button>
                  {langOpen && (
                    <div className="lang-dropdown" role="menu">
                      <button type="button" role="menuitem" onClick={() => { setLang('fr'); setLangOpen(false); }}>🇫🇷 Français</button>
                      <button type="button" role="menuitem" onClick={() => { setLang('en'); setLangOpen(false); }}>🇬🇧 English</button>
                      <button type="button" role="menuitem" onClick={() => { setLang('ar'); setLangOpen(false); }}>🇸🇦 العربية</button>
                    </div>
                  )}
                </div>
                <div className="user-actions">
                  <span className="user-name">{user.login}</span>
                  <Link to="/dashboard" className="btn-dashboard">Dashboard</Link>
                  <button type="button" className="btn-logout" onClick={logout}>
                    {t('logOut')}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="header-right-bottom">
              <div className="lang-select-wrap" ref={langWrapRef}>
                <button type="button" className="lang-select" onClick={() => setLangOpen((o) => !o)} aria-expanded={langOpen} aria-haspopup="true">
                  <span className="lang-flag">{lang === 'fr' ? '🇫🇷' : lang === 'ar' ? '🇸🇦' : '🇬🇧'}</span>
                  <span>{LANG_LABELS[lang] || 'Français'}</span>
                  <span className="lang-arrow">▼</span>
                </button>
                {langOpen && (
                  <div className="lang-dropdown" role="menu">
                    <button type="button" role="menuitem" onClick={() => { setLang('fr'); setLangOpen(false); }}>🇫🇷 Français</button>
                    <button type="button" role="menuitem" onClick={() => { setLang('en'); setLangOpen(false); }}>🇬🇧 English</button>
                    <button type="button" role="menuitem" onClick={() => { setLang('ar'); setLangOpen(false); }}>🇸🇦 العربية</button>
                  </div>
                )}
              </div>
              <button type="button" className="btn-signin" onClick={() => { setError(''); setLoginOpen(true); }}>
                {t('signIn')}
              </button>
            </div>
          )}
        </div>
        </div>
        <nav className="header-nav-bar main-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>
      </header>

      {loginOpen && (
        <div className="modal-overlay" onClick={() => { setLoginOpen(false); setError(''); }}>
          <div className="modal-signin" onClick={(e) => e.stopPropagation()}>
            <h2>{t('loginTitle')}</h2>
            <form onSubmit={handleLogin}>
              <input
                type="text"
                placeholder={t('loginUsername')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="modal-input"
              />
              <input
                type="password"
                placeholder={t('loginPassword')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="modal-input"
              />
              {error && <p className="modal-error">{error}</p>}
              <button type="submit" className="btn-login-modal">{t('loginTitle')}</button>
            </form>
            <div className="modal-lang">
              <span>{LANG_LABELS[lang] || 'English'}</span>
              <span>▼</span>
            </div>
            <button type="button" className="modal-close" onClick={() => { setLoginOpen(false); setError(''); }} aria-label="Fermer">×</button>
          </div>
        </div>
      )}

      <main className="site-main">
        <Outlet />
      </main>
    </div>
  );
}
