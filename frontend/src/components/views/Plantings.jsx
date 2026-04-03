import React from 'react';
import api from '../../lib/api';
import { STATUS_LABELS, PLANT_STATUSES } from '../../lib/constants';
import { catColor, statusColor, plantStatusColor } from '../../lib/colors';
import { formatDate } from '../../lib/formatters';
import EmptyState from '../common/EmptyState';

export default function Plantings({
  plantings, seeds, structures, mapGridCells,
  expandedPlantingIds, setExpandedPlantingIds,
  collapsedCategories, setCollapsedCategories,
  showPlantingSummary, setShowPlantingSummary,
  openPlantingDetail, openPlantPanel,
  handleDuplicatePlanting, handleDeletePlanting,
  setSelectedPlanting, setEditData, setShowModal,
  loadData,
}) {
  const varietySummary = Object.values(
    plantings.reduce((acc, p) => {
      if (!acc[p.seed_id]) acc[p.seed_id] = { name: p.seed_name, category: p.category, rows: 0, started: 0, planted: 0 };
      acc[p.seed_id].rows += 1;
      acc[p.seed_id].started += p.qty_started || 0;
      acc[p.seed_id].planted += p.qty_planted || 0;
      return acc;
    }, {})
  ).sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Plantings</h1>
          <p className="page-sub">2026 Season</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setShowPlantingSummary(s => !s)}>
            {showPlantingSummary ? 'Hide Summary' : 'Show Summary'}
          </button>
          <button className="btn btn-primary" onClick={() => { setEditData({}); setShowModal('planting'); }}>+ New Planting</button>
        </div>
      </div>

      {showPlantingSummary && (() => {
        const byCategory = varietySummary.reduce((acc, v) => {
          if (!acc[v.category]) acc[v.category] = [];
          acc[v.category].push(v);
          return acc;
        }, {});
        const grandStarted = varietySummary.reduce((s, v) => s + v.started, 0);
        const grandPlanted = varietySummary.reduce((s, v) => s + v.planted, 0);
        const grandVarieties = varietySummary.length;

        return (
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, fontFamily: 'Fraunces, serif' }}>Variety Summary</div>
            <table className="table" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Variety</th>
                  <th style={{ textAlign: 'right' }}>Started</th>
                  <th style={{ textAlign: 'right' }}>Planted</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(byCategory).map(([cat, varieties]) => {
                  const catStarted = varieties.reduce((s, v) => s + v.started, 0);
                  const catPlanted = varieties.reduce((s, v) => s + v.planted, 0);
                  return (
                    <React.Fragment key={cat}>
                      <tr style={{ background: catColor(cat) + '18' }}>
                        <td colSpan={3} style={{ fontWeight: 700, fontSize: 12, color: catColor(cat), textTransform: 'uppercase', letterSpacing: '0.05em', padding: '6px 12px' }}>
                          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: catColor(cat), marginRight: 6 }} />
                          {cat} — {catStarted} started, {catPlanted} planted
                        </td>
                      </tr>
                      {varieties.map(v => (
                        <tr key={v.name}>
                          <td style={{ fontWeight: 500, paddingLeft: 24 }}>{v.name}</td>
                          <td style={{ textAlign: 'right' }}>{v.started || '—'}</td>
                          <td style={{ textAlign: 'right' }}>{v.planted || '—'}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
                <tr style={{ borderTop: '2px solid #e8e4dd', fontWeight: 700 }}>
                  <td>Total — {grandVarieties} varieties</td>
                  <td style={{ textAlign: 'right' }}>{grandStarted}</td>
                  <td style={{ textAlign: 'right' }}>{grandPlanted}</td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      })()}

      <div className="card mobile-hide" style={{ padding: 0, overflow: 'hidden' }}>
        {(() => {
          const plantingMembersMap = {};
          Object.entries(mapGridCells).forEach(([sid, cells]) => {
            cells.forEach(c => {
              if (!c.plant_guid) return;
              if (!plantingMembersMap[c.planting_id]) plantingMembersMap[c.planting_id] = [];
              plantingMembersMap[c.planting_id].push({ ...c, structure_id: sid });
            });
          });
          Object.values(plantingMembersMap).forEach(arr =>
            arr.sort((a, b) => (a.short_id || '').localeCompare(b.short_id || ''))
          );

          return (
            <table className="table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 16 }}>Variety / Plants</th>
                  <th>Location</th>
                  <th>Started</th>
                  <th>Planted</th>
                  <th>Status</th>
                  <th>Indoor Start</th>
                  <th>Transplant</th>
                  <th>Germ %</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const byCategory = {};
                  plantings.forEach(p => {
                    const cat = p.category || 'Other';
                    if (!byCategory[cat]) byCategory[cat] = [];
                    byCategory[cat].push(p);
                  });
                  const cats = Object.keys(byCategory).sort();

                  return cats.flatMap(cat => {
                    const catPlantings = byCategory[cat];
                    const isCatCollapsed = collapsedCategories.has(cat);
                    const catStarted = catPlantings.reduce((s, p) => s + (p.qty_started || 0), 0);
                    const catPlanted = catPlantings.reduce((s, p) => s + (p.qty_planted || 0), 0);
                    const color = catColor(cat);

                    const categoryRow = (
                      <tr key={`cat-${cat}`}
                        style={{ background: color + '14', cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => setCollapsedCategories(prev => {
                          const next = new Set(prev);
                          if (next.has(cat)) next.delete(cat); else next.add(cat);
                          return next;
                        })}>
                        <td colSpan={8} style={{ padding: '8px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 10, color, width: 12, textAlign: 'center' }}>{isCatCollapsed ? '▶' : '▼'}</span>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
                            <span style={{ fontWeight: 700, fontSize: 12, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{cat}</span>
                            <span style={{ fontSize: 12, color: '#8a8580', fontWeight: 400 }}>
                              {catPlantings.length} {catPlantings.length === 1 ? 'variety' : 'varieties'} · {catStarted} started · {catPlanted} planted
                            </span>
                          </div>
                        </td>
                      </tr>
                    );

                    if (isCatCollapsed) return [categoryRow];

                    const plantingRows = catPlantings.map(p => {
                      const seed = seeds.find(sd => sd.id === p.seed_id);
                      const isExpanded = expandedPlantingIds.has(p.id);
                      const members = plantingMembersMap[p.id] || [];
                      const bedNames = (p.grid_structures || [])
                        .map(sid => structures.find(s => s.id === sid)?.name || sid)
                        .filter(Boolean);
                      const isProjected = p.transplant_date && new Date(p.transplant_date + 'T00:00:00') > new Date();

                      return (
                        <React.Fragment key={p.id}>
                          <tr style={{ cursor: 'pointer', background: isExpanded ? '#faf8f5' : undefined }}
                            onClick={() => openPlantingDetail(p)}>
                            <td style={{ paddingLeft: 8 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <button
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', fontSize: 11, color: '#8a8580', flexShrink: 0, lineHeight: 1 }}
                                  onClick={e => {
                                    e.stopPropagation();
                                    setExpandedPlantingIds(prev => {
                                      const next = new Set(prev);
                                      if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
                                      return next;
                                    });
                                  }}
                                  title={isExpanded ? 'Collapse' : `Expand (${members.length} plants)`}>
                                  {isExpanded ? '▼' : '▶'}
                                </button>
                                {seed?.image_url ? (
                                  <img src={seed.image_url} alt={p.seed_name} style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 4, flexShrink: 0, border: '1px solid #e8e4dd' }} onError={e => { e.target.style.display = 'none'; }} />
                                ) : (
                                  <div style={{ width: 28, height: 28, borderRadius: 4, background: catColor(p.category), opacity: 0.35, flexShrink: 0 }} />
                                )}
                                <div>
                                  <div style={{ fontWeight: 500, fontSize: 13 }}>{p.seed_name}</div>
                                  {members.length > 0 && (
                                    <div style={{ fontSize: 11, color: '#8a8580' }}>{members.length} individual plants</div>
                                  )}
                                </div>
                                {p.organic ? <span className="badge badge-organic" style={{ marginLeft: 4 }}>OG</span> : null}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontSize: 13 }}>
                                {bedNames.length > 0 ? bedNames.join(', ') : <span style={{ color: '#ccc' }}>—</span>}
                              </div>
                              {(p.placed_count > 0 || p.unplaced_count > 0) && (
                                <div style={{ fontSize: 11, marginTop: 2 }}>
                                  {p.placed_count > 0 && <span style={{ color: '#16a34a' }}>{p.placed_count} placed</span>}
                                  {p.placed_count > 0 && p.unplaced_count > 0 && <span style={{ color: '#ccc' }}> · </span>}
                                  {p.unplaced_count > 0 && <span style={{ color: '#e8a020' }}>{p.unplaced_count} unassigned</span>}
                                </div>
                              )}
                            </td>
                            <td onClick={e => e.stopPropagation()}>
                              <input type="number" min="0" value={p.qty_started ?? ''} placeholder="—"
                                onChange={async e => { await api.put(`/api/plantings/${p.id}`, { qty_started: parseInt(e.target.value) || null }); loadData(); }}
                                style={{ width: 52, padding: '2px 6px', border: '1px solid #e8e4dd', borderRadius: 6, fontSize: 13, textAlign: 'center' }}
                              />
                            </td>
                            <td onClick={e => e.stopPropagation()}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <input type="number" min="0" value={p.qty_planted ?? ''} placeholder="—"
                                  onChange={async e => { await api.put(`/api/plantings/${p.id}`, { qty_planted: parseInt(e.target.value) || null }); loadData(); }}
                                  style={{ width: 52, padding: '2px 6px', border: `1px solid ${isProjected ? '#fbbf24' : '#e8e4dd'}`, borderRadius: 6, fontSize: 13, textAlign: 'center', background: isProjected ? '#fffbeb' : '#fff' }}
                                />
                                {isProjected && <span style={{ fontSize: 11, color: '#d97706' }}>proj.</span>}
                              </div>
                            </td>
                            <td>
                              <span className="status-dot" style={{ background: statusColor(p.status) }}></span>
                              <span style={{ fontSize: 13 }}>{STATUS_LABELS[p.status] || p.status}</span>
                            </td>
                            <td style={{ fontSize: 13 }}>{formatDate(p.indoor_start_date)}</td>
                            <td style={{ fontSize: 13 }}>{formatDate(p.transplant_date)}</td>
                            <td style={{ fontSize: 13 }}>
                              {(() => {
                                const actual = p.actual_germ_rate;
                                const seedObj = seeds.find(s => s.id === p.seed_id);
                                const expected = seedObj?.germ_rate;
                                if (actual == null) return <span style={{ color: '#c4b8a8' }}>—</span>;
                                const c = expected == null ? '#6b7280' : actual >= expected ? '#16a34a' : actual >= expected * 0.5 ? '#d97706' : '#dc2626';
                                return <span style={{ fontWeight: 600, color: c }}>{actual}%{expected != null ? <span style={{ fontWeight: 400, color: '#8a8580' }}> / {expected}%</span> : ''}</span>;
                              })()}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button className="btn btn-secondary btn-sm" onClick={e => { e.stopPropagation(); handleDuplicatePlanting(p.id); }}>Dup</button>
                                <button className="btn btn-danger btn-sm" onClick={e => { e.stopPropagation(); handleDeletePlanting(p.id); }}>Del</button>
                              </div>
                            </td>
                          </tr>

                          {isExpanded && members.map(m => {
                            const stName = structures.find(s => s.id === m.structure_id)?.name;
                            const sColor = plantStatusColor(m.plant_status);
                            return (
                              <tr key={m.plant_guid}
                                style={{ background: '#f8f7f5', cursor: 'pointer' }}
                                onClick={() => openPlantPanel(m.plant_guid)}>
                                <td style={{ paddingLeft: 52 }} colSpan={1}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span className="plant-short-id" style={{ background: sColor + '20', color: sColor }}>{m.short_id}</span>
                                    <span style={{ fontSize: 12, color: '#8a8580' }}>
                                      {m.plant_status !== 'healthy' && (
                                        <span style={{ color: sColor, fontWeight: 500, marginRight: 6 }}>
                                          {PLANT_STATUSES.find(x => x.value === m.plant_status)?.label}
                                        </span>
                                      )}
                                      {m.plant_notes ? m.plant_notes.slice(0, 40) + (m.plant_notes.length > 40 ? '…' : '') : ''}
                                    </span>
                                  </div>
                                </td>
                                <td colSpan={1} style={{ fontSize: 12, color: '#8a8580' }}>
                                  {stName && stName !== bedNames[0] ? stName : ''}
                                </td>
                                <td colSpan={6} style={{ fontSize: 12, color: '#a8a399' }}>
                                  row {m.row}, col {m.col}{m.label_visible ? '' : ' · label hidden'}
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    });
                    return [categoryRow, ...plantingRows];
                  });
                })()}
              </tbody>
            </table>
          );
        })()}
        {plantings.length === 0 && (
          <EmptyState icon="🌱" message='No plantings yet. Click "New Planting" to add your first one.' />
        )}
      </div>

      {/* Mobile planting card list */}
      <div className="mobile-planting-list">
        {plantings.length === 0 && (
          <EmptyState icon="🌱" message="No plantings yet." />
        )}
        {[...plantings].sort((a, b) => a.category.localeCompare(b.category) || a.seed_name.localeCompare(b.seed_name)).map(p => {
          const todayStr = new Date().toISOString().split('T')[0];
          const nextDate = p.transplant_date || p.direct_sow_date || p.indoor_start_date;
          const nextIcon = p.transplant_date ? '🏡' : p.direct_sow_date ? '🌿' : '🏠';
          return (
            <div key={p.id} className="card" style={{ marginBottom: 10, padding: '14px 16px', cursor: 'pointer' }}
              onClick={() => openPlantingDetail(p)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.seed_name}
                  </div>
                  <div style={{ fontSize: 12, color: '#8a8580', marginBottom: nextDate ? 6 : 0 }}>
                    {p.category}{p.structure_name ? ` · ${p.structure_name}` : ''}
                  </div>
                  {nextDate && (
                    <div style={{ fontSize: 12, color: nextDate < todayStr ? '#dc2626' : '#8a8580' }}>
                      {nextIcon} {formatDate(nextDate)}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginLeft: 12, flexShrink: 0 }}
                  onClick={e => e.stopPropagation()}>
                  <button className="btn btn-secondary btn-sm"
                    style={{ fontSize: 15, padding: '5px 10px' }}
                    onClick={() => { setSelectedPlanting(p); setEditData({}); setShowModal('quick-note'); }}>
                    📝
                  </button>
                  <button className="btn btn-secondary btn-sm"
                    style={{ fontSize: 15, padding: '5px 10px' }}
                    onClick={() => { setSelectedPlanting(p); setShowModal('quick-photo'); }}>
                    📷
                  </button>
                  <button className="btn btn-secondary btn-sm"
                    style={{ fontSize: 15, padding: '5px 10px' }}
                    onClick={() => { setSelectedPlanting(p); setEditData({ event_date: new Date().toISOString().split('T')[0], event_type: 'note' }); setShowModal('event'); }}>
                    📋
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
