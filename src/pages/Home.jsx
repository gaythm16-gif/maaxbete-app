import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import './Home.css';

export default function Home() {
  const { t } = useLanguage();
  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-content">
          <h1 className="hero-title">{t('heroTitle')}</h1>
          <p className="hero-subtitle">{t('heroSubtitle')}</p>
        </div>
        <div className="hero-coins" aria-hidden />
      </section>
      <section className="categories">
        <h2>{t('homeCasino')}</h2>
        <div className="category-grid">
          <Link to="/casino" className="category-card">
            <span className="cat-icon">💎</span>
            <span>{t('dropsWins')}</span>
          </Link>
          <Link to="/casino" className="category-card">
            <span className="cat-icon">🎰</span>
            <span>{t('bestGames')}</span>
          </Link>
          <Link to="/casino" className="category-card active">
            <span className="cat-icon">👑</span>
            <span>{t('slots')}</span>
          </Link>
          <Link to="/casino" className="category-card">
            <span className="cat-icon">💎</span>
            <span>{t('tableGames')}</span>
          </Link>
          <Link to="/casino" className="category-card">
            <span className="cat-icon">🃏</span>
            <span>{t('videoPoker')}</span>
          </Link>
        </div>
        <div className="filter-bar">
          <span>{t('sortBy')}</span>
          <button type="button" className="filter-btn active">{t('popularity')}</button>
          <button type="button" className="filter-btn">A-Z</button>
          <span>{t('filterBy')}</span>
          <select className="filter-select">
            <option>{t('allCategories')}</option>
          </select>
          <input type="search" placeholder={t('searchPlaceholder')} className="filter-search" />
        </div>
      </section>
    </div>
  );
}
