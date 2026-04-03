import React from 'react';

const TABS = [
  { key: 'dashboard', icon: '🏠', label: 'Home' },
  { key: 'seeds',     icon: '🌱', label: 'Seeds' },
  { key: 'plantings', icon: '🌿', label: 'Plants' },
  { key: 'calendar',  icon: '📅', label: 'Calendar' },
  { key: 'map',       icon: '🗺️',  label: 'Map' },
  { key: 'photos',    icon: '📷', label: 'Photos' },
];

function isTabActive(view, tabKey) {
  return view === tabKey
    || (view === 'detail' && tabKey === 'plantings')
    || (view === 'bed-planner' && tabKey === 'map');
}

export default function MobileTabBar({ view, setView }) {
  return (
    <div className="mobile-tabs">
      {TABS.map(({ key, icon, label }) => (
        <button key={key}
          className={`mobile-tab ${isTabActive(view, key) ? 'active' : ''}`}
          onClick={() => setView(key)}>
          <span className="mobile-tab-icon">{icon}</span>
          {label}
        </button>
      ))}
    </div>
  );
}
