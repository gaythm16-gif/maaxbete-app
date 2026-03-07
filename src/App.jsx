import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import PublicLayout from './components/PublicLayout';
import DashboardLayout from './components/DashboardLayout';
import Home from './pages/Home';
import Casino from './pages/Casino';
import LiveCasino from './pages/LiveCasino';
import ParisSportifs from './pages/ParisSportifs';
import DashboardHome from './pages/dashboard/DashboardHome';
import Tree from './pages/dashboard/Tree';
import Transfers from './pages/dashboard/Transfers';
import History from './pages/dashboard/History';
import NewUser from './pages/dashboard/NewUser';
import AllUsers from './pages/dashboard/AllUsers';
import ChangePassword from './pages/dashboard/ChangePassword';
import UsersProfit from './pages/dashboard/UsersProfit';
import TransactionsProfit from './pages/dashboard/TransactionsProfit';
import GameSettings from './pages/dashboard/GameSettings';
import './App.css';

function PlaceholderPage({ title }) {
  return (
    <div className="dashboard-page" style={{ padding: '2rem' }}>
      <h1>{title}</h1>
      <p>Contenu à venir.</p>
    </div>
  );
}

export default function App() {
  const [mobilePreview, setMobilePreview] = useState(false);

  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <>
            <button
              type="button"
              className="mobile-preview-toggle"
              onClick={() => setMobilePreview((v) => !v)}
              title={mobilePreview ? 'Vue normale' : 'Vue smartphone'}
              aria-label={mobilePreview ? 'Vue normale' : 'Vue smartphone'}
            >
              {mobilePreview ? '✕' : '📱'}
            </button>
            <div className={mobilePreview ? 'mobile-preview-frame' : ''}>
              <ErrorBoundary>
                <Routes>
                  <Route path="/" element={<PublicLayout />}>
                    <Route index element={<Navigate to="/casino" replace />} />
                    <Route path="home" element={<Home />} />
                    <Route path="paris-sportifs" element={<ParisSportifs />} />
                    <Route path="paris-direct" element={<PlaceholderPage title="Paris en direct" />} />
                    <Route path="casino" element={<Casino />} />
                    <Route path="live-casino" element={<LiveCasino />} />
                    <Route path="virtuels" element={<PlaceholderPage title="Virtuels" />} />
                  </Route>
                  <Route path="/dashboard" element={<DashboardLayout />}>
                    <Route index element={<DashboardHome />} />
                    <Route path="new-user" element={<NewUser />} />
                    <Route path="users" element={<AllUsers />} />
                    <Route path="tree" element={<Tree />} />
                    <Route path="transfers" element={<Transfers />} />
                    <Route path="history" element={<History />} />
                    <Route path="change-password" element={<ChangePassword />} />
                    <Route path="game-settings" element={<GameSettings />} />
                    <Route path="users-profit" element={<UsersProfit />} />
                    <Route path="transactions-profit" element={<TransactionsProfit />} />
                  </Route>
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </ErrorBoundary>
            </div>
          </>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}
