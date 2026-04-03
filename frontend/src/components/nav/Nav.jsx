import React from 'react';

const NAV_VIEWS = ['dashboard', 'seeds', 'plantings', 'calendar', 'map', 'photos'];

function navLabel(v) {
  return v === 'map' ? 'Garden Map' : v.charAt(0).toUpperCase() + v.slice(1);
}

function isNavActive(view, navView) {
  return view === navView
    || (view === 'detail' && navView === 'plantings')
    || (view === 'bed-planner' && navView === 'map');
}

export default function Nav({ view, setView, onFetchImages, onExport, onImport }) {
  return (
    <nav className="nav">
      <div className="nav-logo">🌱 Heirloom</div>
      <div className="nav-links">
        {NAV_VIEWS.map(v => (
          <div key={v} className={`nav-link ${isNavActive(view, v) ? 'active' : ''}`} onClick={() => setView(v)}>
            {navLabel(v)}
          </div>
        ))}
      </div>
      <div className="nav-right">
        <button className="nav-btn" onClick={onFetchImages}>🌿 Fetch Plant Images</button>
        <button className="nav-btn" onClick={onExport}>Export JSON</button>
        <button className="nav-btn" onClick={onImport}>Import</button>
      </div>
    </nav>
  );
}
