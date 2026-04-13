import React from 'react';
import { EVENT_TYPES } from '../../lib/constants';
import { catColor, statusColor } from '../../lib/colors';
import { formatDate } from '../../lib/formatters';
import StatCard from '../common/StatCard';
import EmptyState from '../common/EmptyState';

export default function Dashboard({
  seeds, plantings, recentActivity, allPhotos,
  totalStarted, totalPlanted, harvestingCount,
  gardenMapContent,
  openPlantingDetail,
  setEditData, setShowModal,
  setView, setPhotosLightboxIndex,
}) {
  return (
    <div>
      <h1 className="page-title">Heirloom</h1>
      <p className="page-sub">D'Silva Heirloom Garden · Berkeley Heights NJ · Zone 6b · 2026 Season</p>

      <div className="grid-4" style={{ marginBottom: 24 }}>
        <StatCard value={seeds.length} label="Seed Varieties" />
        <StatCard value={totalStarted} label="Started" />
        <StatCard value={totalPlanted} label="Planted / Projected" />
        <StatCard value={harvestingCount} label="Harvesting" />
      </div>

      <div className="grid-2">
        <div>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Recent Plantings</h3>
              <button className="btn btn-primary btn-sm" onClick={() => { const today = new Date().toISOString().slice(0, 10); setEditData({ direct_sow_date: today, indoor_start_date: today }); setShowModal('planting'); }}>+ Add Planting</button>
            </div>
            {plantings.slice(0, 8).map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #f0ece6', cursor: 'pointer' }} onClick={() => openPlantingDetail(p)}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: statusColor(p.status) }}></span>
                <span style={{ flex: 1, fontWeight: 500, fontSize: 14 }}>{p.seed_name}</span>
                <span className="badge badge-category" style={{ background: catColor(p.category) }}>{p.category}</span>
                <span style={{ fontSize: 12, color: '#8a8580', whiteSpace: 'nowrap' }}>
                  {p.qty_started ? `${p.qty_started} started` : ''}
                  {p.placed_count > 0 ? ` · ${p.placed_count} placed` : ''}
                  {p.unplaced_count > 0 ? <span style={{ color: '#e8a020' }}> · {p.unplaced_count} unassigned</span> : ''}
                </span>
                <span style={{ fontSize: 12, color: '#8a8580' }}>{p.structure_name || 'Unassigned'}</span>
              </div>
            ))}
            {plantings.length === 0 && (
              <EmptyState icon="🌱" message='No plantings yet. Click "Add Planting" to get started!' />
            )}
          </div>
        </div>
        <div>
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 12 }}>Garden Overview</h3>
            {gardenMapContent}
          </div>
        </div>
      </div>

      {recentActivity.length > 0 && (() => {
        const groups = [];
        const seen = {};
        recentActivity.forEach(ev => {
          const key = ev.planting_id ?? 'unknown';
          if (!seen[key]) {
            seen[key] = { seed_name: ev.seed_name || 'Unknown', category: ev.category || '', events: [] };
            groups.push(key);
          }
          seen[key].events.push(ev);
        });
        const displayGroups = groups.slice(0, 5);
        return (
          <div className="card" style={{ marginTop: 24 }}>
            <h3 className="card-title" style={{ marginBottom: 16 }}>Recent Activity</h3>
            {displayGroups.map((key, gi) => {
              const group = seen[key];
              const planting = plantings.find(p => p.id === (key === 'unknown' ? null : parseInt(key)));
              return (
                <div key={key} style={{ marginBottom: gi < displayGroups.length - 1 ? 16 : 0, paddingBottom: gi < displayGroups.length - 1 ? 16 : 0, borderBottom: gi < displayGroups.length - 1 ? '1px solid #f0ece6' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, cursor: planting ? 'pointer' : 'default' }}
                    onClick={() => planting && openPlantingDetail(planting)}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: catColor(group.category), display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, fontSize: 14, color: '#2d2a24' }}>{group.seed_name}</span>
                    {planting && <span style={{ fontSize: 12, color: '#8a8580' }}>→</span>}
                  </div>
                  {group.events.slice(0, 3).map(ev => {
                    const evType = EVENT_TYPES.find(t => t.value === ev.event_type);
                    return (
                      <div key={ev.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '4px 0 4px 14px', fontSize: 13 }}>
                        <span style={{ flexShrink: 0 }}>{evType ? evType.label.split(' ')[0] : '📋'}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ color: '#4a4540', fontWeight: 500 }}>{evType ? evType.label.replace(/^[^\s]+\s/, '') : ev.event_type}</span>
                          <span style={{ color: '#8a8580', marginLeft: 6 }}>· {formatDate(ev.event_date)}</span>
                          {ev.details && <div style={{ color: '#6b6660', fontSize: 12, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.details.slice(0, 80)}{ev.details.length > 80 ? '…' : ''}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })()}

      {allPhotos.length > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 className="card-title" style={{ margin: 0 }}>Recent Photos</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => setView('photos')}>→ All ({allPhotos.length})</button>
          </div>
          <div className="dashboard-photo-strip">
            {allPhotos.slice(0, 8).map((photo, idx) => (
              <div key={photo.id} className="dashboard-photo-item" onClick={() => setPhotosLightboxIndex(idx)}>
                <img src={`/photos/${photo.filename}`} alt={photo.caption || ''} loading="lazy" />
                <div className="dashboard-photo-item-label">{photo.seed_name || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
