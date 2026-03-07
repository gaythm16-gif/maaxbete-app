import { useState } from 'react';
import './ParisSportifs.css';

const MOCK_MATCHES = [
  { id: 1, league: 'Super Lig . Turkiye', team1: 'Kayserispor', team2: 'Antalyaspor', date: '22/02 - 11:30', o1: 2.09, ox: 3.55, o2: 3.85 },
  { id: 2, league: 'Eredivisie . Netherlands', team1: 'FC Twente Enschede', team2: 'FC Groningen', date: '22/02 - 12:00', o1: 1.85, ox: 3.40, o2: 4.20 },
];

export default function ParisSportifs() {
  const [searchQuery, setSearchQuery] = useState('');
  const displayMatches = MOCK_MATCHES;

  return (
    <div className="paris-page">
      <div className="paris-layout">
        <aside className="paris-sidebar">
          <h3>TOP LEAGUES</h3>
          <ul>
            <li>UEFA Champions League</li>
            <li>UEFA Europa League</li>
            <li>Premier League</li>
            <li>LaLiga</li>
            <li>Serie A</li>
            <li>Bundesliga</li>
            <li>Ligue 1</li>
          </ul>
          <input
            type="search"
            placeholder="Enter Team or Championship..."
            className="paris-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <h3>MENU</h3>
          <ul>
            <li>Football</li>
            <li>LIVE 999+</li>
          </ul>
        </aside>
        <main className="paris-main">
          <div className="paris-dates">
            {['MON 23/02', 'TUE 24/02', 'WED 25/02', 'THU 26/02', 'FRI 27/02', 'SAT 28/02', 'SUN 01/03'].map((d) => (
              <button key={d} type="button" className="date-btn">{d}</button>
            ))}
          </div>
          <div className="sport-icons">
            <span className="sport-icon">LIVE</span>
            <span className="sport-icon active">FOOTBALL</span>
            <span className="sport-icon">BASKETBALL</span>
            <span className="sport-icon">TENNIS</span>
            <span className="sport-icon">ALL SPORTS</span>
          </div>
          <div className="matches-list">
            {displayMatches.map((m) => (
              <div key={m.id} className="match-card">
                <div className="match-meta">{m.date} — {m.league || 'Match'}</div>
                <div className="match-teams">
                  <span>{m.team1}</span>
                  <span className="vs">vs</span>
                  <span>{m.team2}</span>
                </div>
                <div className="match-odds">
                  <button type="button" className="odd-btn">1 {m.o1}</button>
                  <button type="button" className="odd-btn">X {m.ox}</button>
                  <button type="button" className="odd-btn">2 {m.o2}</button>
                </div>
              </div>
            ))}
          </div>
          <section className="live-now">
            <h3>LIVE NOW</h3>
            <div className="live-tabs">
              <button type="button" className="active">FOOTBALL</button>
              <button type="button">BASKETBALL</button>
            </div>
            <p className="live-placeholder">Paris en direct (démo)</p>
          </section>
        </main>
        <aside className="paris-betslip">
          <h3>BETSLIP</h3>
          <p>No selections in the betslip</p>
          <h3>BOOKING CODE</h3>
          <input type="text" placeholder="Enter Booking Code" />
        </aside>
      </div>
    </div>
  );
}
