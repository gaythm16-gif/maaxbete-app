import { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage, formatBalance, LANG_LABELS, convertBalance, CURRENCIES_ORDER } from '../context/LanguageContext';
import './DashboardLayout.css';

const MENU_ADMIN = [
  { path: '/dashboard/new-user', labelKey: 'newUser', icon: '👤' },
  { path: '/dashboard/users', labelKey: 'allUsers', icon: '👥' },
  { path: '/dashboard/tree', labelKey: 'tree', icon: '🌳' },
  { path: '/dashboard/transfers', labelKey: 'transfers', icon: '💵' },
  { path: '/dashboard/history', labelKey: 'history', icon: 'ℹ️' },
  { path: '/dashboard/change-password', labelKey: 'changePassword', icon: '🔑' },
  { path: '/dashboard/game-settings', labelKey: 'gameSettings', icon: '🎰' },
  { path: '/dashboard/users-profit', labelKey: 'usersProfit', icon: '💵' },
  { path: '/dashboard/transactions-profit', labelKey: 'transactionsProfit', icon: '💵' },
];

const MENU_PLAYER = [
  { path: '/dashboard/history', labelKey: 'history', icon: 'ℹ️' },
  { path: '/dashboard/change-password', labelKey: 'changePassword', icon: '🔑' },
];

export default function DashboardLayout() {
  const { user, logout, authChecked, ROLES } = useAuth();
  const { lang, setLang, t, displayCurrency, setDisplayCurrency } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [langOpen, setLangOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const langWrapRef = useRef(null);
  const currencyWrapRef = useRef(null);

  const isMobile = () => {
    if (typeof window === 'undefined') return false;
    if (window.innerWidth <= 768) return true;
    const frame = document.querySelector('.mobile-preview-frame');
    return frame ? frame.getBoundingClientRect().width <= 768 : false;
  };

  useEffect(() => {
    if (location.pathname === '/dashboard' && isMobile()) {
      navigate('/dashboard/users', { replace: true });
    }
  }, [location.pathname, navigate]);

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

  const closeSidebar = () => setSidebarOpen(false);

  if (!authChecked) return <div className="dashboard-layout"><div className="dashboard-content">{t('loading')}</div></div>;
  if (!user) {
    navigate('/');
    return null;
  }

  const isPlayer = user.role === ROLES.PLAYER;
  const menu = isPlayer ? MENU_PLAYER : MENU_ADMIN;
  const isActive = (path) => location.pathname === path;

  return (
    <div className={`dashboard-layout ${sidebarOpen ? 'mobile-sidebar-open' : ''}`}>
      <div className="sidebar-overlay" onClick={closeSidebar} aria-hidden="true" />
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <Link to="/" className="sidebar-logo" onClick={closeSidebar}>
            M<span className="logo-aa">AA</span>XBET<span className="logo-e">E</span>
          </Link>
        </div>
        <nav className="sidebar-nav">
          {!isPlayer && (
            <Link to="/dashboard" className={`sidebar-link ${location.pathname === '/dashboard' ? 'active' : ''}`} onClick={closeSidebar}>
              <span className="sidebar-icon">📊</span> {t('dashboard')}
            </Link>
          )}
          {menu.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}
              onClick={closeSidebar}
            >
              <span className="sidebar-icon">{item.icon}</span>
              {t(item.labelKey)}
            </Link>
          ))}
          {isPlayer && (
            <Link to="/casino" className="sidebar-link sidebar-link-play" onClick={closeSidebar}>
              <span className="sidebar-icon">🎰</span> {t('play')}
            </Link>
          )}
        </nav>
        <div className="sidebar-footer">
          <button type="button" className="btn-logout-sidebar" onClick={() => { logout(); navigate('/'); }}>
            {t('logOut')}
          </button>
          <div className="sidebar-lang-wrap" ref={langWrapRef}>
            <button type="button" className="sidebar-lang" onClick={() => setLangOpen((o) => !o)}>
              <span>{LANG_LABELS[lang] || 'Français'}</span>
              <span>▼</span>
            </button>
            {langOpen && (
              <div className="sidebar-lang-dropdown">
                <button type="button" onClick={() => { setLang('fr'); setLangOpen(false); }}>🇫🇷 Français</button>
                <button type="button" onClick={() => { setLang('en'); setLangOpen(false); }}>🇬🇧 English</button>
                <button type="button" onClick={() => { setLang('ar'); setLangOpen(false); }}>🇸🇦 العربية</button>
              </div>
            )}
          </div>
        </div>
      </aside>
      <div className="dashboard-content">
        <div className="dashboard-topbar">
          <button
            type="button"
            className="topbar-hamburger"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label="Menu"
            aria-expanded={sidebarOpen}
          >
            <span /><span /><span />
          </button>
          <div className="topbar-right">
            <span className="topbar-user">{user.login}</span>
            <span className="topbar-role topbar-role-inline">{user.role}</span>
            {user.role === ROLES.MASTER ? (
              <div className="topbar-balance-wrap topbar-balance-line" ref={currencyWrapRef}>
                <button type="button" className="topbar-currency-btn" onClick={() => setCurrencyOpen((o) => !o)} aria-expanded={currencyOpen}>
                  <span className="topbar-balance">{formatBalance(convertBalance(user.balance ?? 0, user.currency, displayCurrency), displayCurrency)}</span>
                  <span className="topbar-currency-arrow">▼</span>
                </button>
                {currencyOpen && (
                  <div className="topbar-currency-dropdown">
                    {CURRENCIES_ORDER.map((c) => (
                      <button key={c.code} type="button" className={displayCurrency === c.code ? 'active' : ''} onClick={() => { setDisplayCurrency(c.code); setCurrencyOpen(false); }}>
                        {c.label} ({c.symbol})
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <span className="topbar-balance topbar-balance-only topbar-balance-line">
                {formatBalance(user.balance ?? 0, user.currency || 'TND')}
              </span>
            )}
          </div>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
