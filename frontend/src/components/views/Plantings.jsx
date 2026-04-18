import React from 'react';
import api from '../../lib/api';
import { PLANT_STATUSES } from '../../lib/constants';
import { catColor, plantStatusColor } from '../../lib/colors';
import { formatDate } from '../../lib/formatters';
import { deriveStatus } from '../../lib/plantingStatus';
import EmptyState from '../common/EmptyState';
import ThumbPreview from '../common/ThumbPreview';

export default function Plantings({
  plantings, seeds, structures, mapGridCells,
  expandedPlantingIds, setExpandedPlantingIds,
  collapsedCategories, setCollapsedCategories,
  showPlantingSummary, setShowPlantingSummary,
  openPlantingDetail, openPlantPanel,
  handleDuplicatePlanting, handleDeletePlanting,
  setSelectedPlanting, setEditData, setShowModal,
  loadData,
  bulkSelectMode, setBulkSelectMode, selectedPlantingIds, setSelectedPlantingIds, onBulkLogEvent,
}) {
  const varietySummary = Object.values(
    plantings.filter(p => p.status !== 'failed').reduce((acc, p) => {
      if (!acc[p.seed_id]) acc[p.seed_id] = { name: p.seed_name, category: p.category, common_name: p.common_name || null, rows: 0, started: 0, planted: 0, statusMap: {} };
      acc[p.seed_id].rows += 1;
      acc[p.seed_id].started += p.qty_started || 0;
      acc[p.seed_id].planted += p.qty_planted || 0;
      const ds = deriveStatus(p);
      acc[p.seed_id].statusMap[ds.label] = ds;
      return acc;
    }, {})
  ).sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

  const [expandedVarietyGroups, setExpandedVarietyGroups] = React.useState(new Set());

  const toggleVarietyGroup = (key) => {
    setExpandedVarietyGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const togglePlanting = (id) => {
    setSelectedPlantingIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllInCategory = (catPlantings, shouldSelect) => {
    setSelectedPlantingIds(prev => {
      const next = new Set(prev);
      catPlantings.forEach(p => shouldSelect ? next.add(p.id) : next.delete(p.id));
      return next;
    });
  };

  const exitBulkMode = () => {
    setBulkSelectMode(false);
    setSelectedPlantingIds(new Set());
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Plantings</h1>
          <p className="page-sub">2026 Season</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={() => setShowPlantingSummary(s => !s)}>
            {showPlantingSummary ? 'Hide Summary' : 'Show Summary'}
          </button>
          <button
            className={bulkSelectMode ? 'btn btn-primary' : 'btn btn-secondary'}
            onClick={() => bulkSelectMode ? exitBulkMode() : setBulkSelectMode(true)}
          >
            {bulkSelectMode ? 'Cancel Select' : 'Select'}
          </button>
          <button className="btn btn-primary" onClick={() => { const today = new Date().toISOString().slice(0, 10); setEditData({ direct_sow_date: today, indoor_start_date: today }); setShowModal('planting'); }}>+ New Planting</button>
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
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(byCategory).map(([cat, varieties]) => {
                  const catStarted = varieties.reduce((s, v) => s + v.started, 0);
                  const catPlanted = varieties.reduce((s, v) => s + v.planted, 0);
                  const color = catColor(cat);
                  const hasAnyCommonName = varieties.some(v => v.common_name);

                  // Build common_name sub-groups if any are set
                  const cnGroups = {};
                  varieties.forEach(v => {
                    const cn = v.common_name || '__other__';
                    if (!cnGroups[cn]) cnGroups[cn] = [];
                    cnGroups[cn].push(v);
                  });
                  const sortedCns = Object.keys(cnGroups).filter(k => k !== '__other__').sort();
                  const unlabeled = cnGroups['__other__'] || [];

                  const renderVarietyRow = (v) => (
                    <tr key={v.name}>
                      <td style={{ fontWeight: 500, paddingLeft: 24 }}>{v.name}</td>
                      <td style={{ textAlign: 'right' }}>{v.started || '—'}</td>
                      <td style={{ textAlign: 'right' }}>{v.planted || '—'}</td>
                      <td>
                        {Object.values(v.statusMap).map(s => (
                          <span key={s.label} style={{
                            display: 'inline-block', padding: '1px 7px', borderRadius: 10,
                            background: s.color + '22', color: s.color,
                            fontSize: 11, marginRight: 3, fontWeight: 600, whiteSpace: 'nowrap'
                          }}>{s.emoji} {s.label}</span>
                        ))}
                      </td>
                    </tr>
                  );

                  return (
                    <React.Fragment key={cat}>
                      <tr style={{ background: color + '18' }}>
                        <td colSpan={4} style={{ fontWeight: 700, fontSize: 12, color, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '6px 12px' }}>
                          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, marginRight: 6 }} />
                          {cat} — {catStarted} started, {catPlanted} planted
                        </td>
                      </tr>
                      {!hasAnyCommonName
                        ? varieties.map(renderVarietyRow)
                        : [
                            ...sortedCns.flatMap(cn => [
                              <tr key={`sum-cn-${cat}-${cn}`} style={{ background: color + '09' }}>
                                <td colSpan={4} style={{ padding: '3px 12px 2px 20px', borderBottom: `1px solid ${color}22` }}>
                                  <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{cn}</span>
                                </td>
                              </tr>,
                              ...cnGroups[cn].map(renderVarietyRow),
                            ]),
                            ...(unlabeled.length ? [
                              ...(sortedCns.length > 0 ? [
                                <tr key={`sum-cn-${cat}-unlabeled`} style={{ background: color + '09' }}>
                                  <td colSpan={4} style={{ padding: '3px 12px 2px 20px', borderBottom: `1px solid ${color}22` }}>
                                    <span style={{ fontSize: 11, color: '#bbb', fontStyle: 'italic' }}>unlabeled</span>
                                  </td>
                                </tr>
                              ] : []),
                              ...unlabeled.map(renderVarietyRow),
                            ] : []),
                          ]
                      }
                    </React.Fragment>
                  );
                })}
                <tr style={{ borderTop: '2px solid #e8e4dd', fontWeight: 700 }}>
                  <td>Total — {grandVarieties} varieties</td>
                  <td style={{ textAlign: 'right' }}>{grandStarted}</td>
                  <td style={{ textAlign: 'right' }}>{grandPlanted}</td>
                  <td></td>
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
                  {bulkSelectMode && <th style={{ width: 40, paddingLeft: 16 }}></th>}
                  <th style={{ paddingLeft: bulkSelectMode ? 8 : 16 }}>Variety / Plants</th>
                  <th>Location</th>
                  <th>Started</th>
                  <th>Planted</th>
                  <th>Status</th>
                  <th>Start</th>
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
                    const allCatSelected = catPlantings.every(p => selectedPlantingIds.has(p.id));

                    const categoryRow = (
                      <tr key={`cat-${cat}`}
                        style={{ background: color + '14', cursor: bulkSelectMode ? 'default' : 'pointer', userSelect: 'none' }}
                        onClick={bulkSelectMode ? undefined : () => setCollapsedCategories(prev => {
                          const next = new Set(prev);
                          if (next.has(cat)) next.delete(cat); else next.add(cat);
                          return next;
                        })}>
                        {bulkSelectMode && (
                          <td style={{ paddingLeft: 16, width: 40 }} onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={allCatSelected}
                              onChange={e => selectAllInCategory(catPlantings, e.target.checked)}
                              style={{ cursor: 'pointer', width: 16, height: 16 }}
                              title={allCatSelected ? 'Deselect all' : 'Select all'}
                            />
                          </td>
                        )}
                        <td colSpan={bulkSelectMode ? 8 : 8} style={{ padding: '8px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {!bulkSelectMode && <span style={{ fontSize: 10, color, width: 12, textAlign: 'center' }}>{isCatCollapsed ? '▶' : '▼'}</span>}
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
                            <span style={{ fontWeight: 700, fontSize: 12, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{cat}</span>
                            <span style={{ fontSize: 12, color: '#8a8580', fontWeight: 400 }}>
                              {catPlantings.length} {catPlantings.length === 1 ? 'variety' : 'varieties'} · {catStarted} started · {catPlanted} planted
                            </span>
                          </div>
                        </td>
                      </tr>
                    );

                    if (!bulkSelectMode && isCatCollapsed) return [categoryRow];

                    // Helper to render a single planting row (used for both flat and sub-row)
                    const renderPlantingRow = (p, isSubRow = false) => {
                      const seed = seeds.find(sd => sd.id === p.seed_id);
                      const isExpanded = expandedPlantingIds.has(p.id);
                      const members = plantingMembersMap[p.id] || [];
                      const bedNames = (p.grid_structures || [])
                        .map(sid => structures.find(s => s.id === sid)?.name || sid)
                        .filter(Boolean);
                      const isProjected = p.transplant_date && new Date(p.transplant_date + 'T00:00:00') > new Date();
                      const isSelected = selectedPlantingIds.has(p.id);
                      const isFailed = p.status === 'failed';
                      const paddingLeft = isSubRow ? 32 : 8;

                      return (
                        <React.Fragment key={p.id}>
                          <tr
                            data-planting-id={p.id}
                            style={{
                              cursor: 'pointer',
                              opacity: isFailed ? 0.45 : 1,
                              background: isSelected ? '#f0ece6' : isSubRow ? color + '06' : isExpanded ? '#faf8f5' : undefined,
                              outline: isSelected ? '2px solid #8a6a4a' : undefined,
                              outlineOffset: -2,
                            }}
                            onClick={() => bulkSelectMode ? togglePlanting(p.id) : openPlantingDetail(p)}>
                            {bulkSelectMode && (
                              <td style={{ paddingLeft: 16, width: 40 }} onClick={e => e.stopPropagation()}>
                                <input type="checkbox" checked={isSelected} onChange={() => togglePlanting(p.id)}
                                  style={{ cursor: 'pointer', width: 16, height: 16 }} />
                              </td>
                            )}
                            <td style={{ paddingLeft }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {!bulkSelectMode && (
                                  <button
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', fontSize: 11, color: members.length > 0 ? '#8a8580' : 'transparent', flexShrink: 0, lineHeight: 1 }}
                                    onClick={e => {
                                      e.stopPropagation();
                                      if (members.length === 0) return;
                                      setExpandedPlantingIds(prev => {
                                        const next = new Set(prev);
                                        if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
                                        return next;
                                      });
                                    }}
                                    title={members.length > 0 ? (isExpanded ? 'Collapse' : `Expand (${members.length} plants)`) : undefined}>
                                    {members.length > 0 ? (isExpanded ? '▼' : '▶') : ' '}
                                  </button>
                                )}
                                {!isSubRow && <ThumbPreview url={seed?.image_url} alt={p.seed_name} color={catColor(p.category)} opacity={0.35} />}
                                <div>
                                  <div style={{ fontWeight: isSubRow ? 400 : 500, fontSize: 13 }}>
                                    {isSubRow
                                      ? <span style={{ fontFamily: 'monospace', color: '#8a6a4a' }}>#{p.id}</span>
                                      : p.seed_name}
                                  </div>
                                  {members.length > 0 && (
                                    <div style={{ fontSize: 11, color: '#8a8580' }}>{members.length} individual plants</div>
                                  )}
                                </div>
                                {!isSubRow && p.organic ? <span className="badge badge-organic" style={{ marginLeft: 4 }}>OG</span> : null}
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
                            {(() => {
                              const s = deriveStatus(p);
                              return (
                                <td>
                                  <span className="status-dot" style={{ background: s.color }} />
                                  <span style={{ fontSize: 13 }}>{s.emoji} {s.label}</span>
                                </td>
                              );
                            })()}
                            <td style={{ fontSize: 13 }}>{formatDate(p.indoor_start_date || p.direct_sow_date || p.planted_out_date)}</td>
                            <td style={{ fontSize: 13 }}>{formatDate(p.transplant_date || p.direct_sow_date || p.planted_out_date)}</td>
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

                          {!bulkSelectMode && isExpanded && members.map(m => {
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
                    };

                    // Group plantings by seed_id, sorted alphabetically by seed name
                    const bySeed = {};
                    catPlantings.forEach(p => {
                      if (!bySeed[p.seed_id]) bySeed[p.seed_id] = [];
                      bySeed[p.seed_id].push(p);
                    });
                    const seedGroups = Object.entries(bySeed)
                      .sort(([, a], [, b]) => a[0].seed_name.localeCompare(b[0].seed_name));

                    const plantingRows = seedGroups.flatMap(([seedId, groupPlantings]) => {
                      // Single planting → flat row, same as before
                      if (groupPlantings.length === 1 || bulkSelectMode) {
                        return groupPlantings.map(p => renderPlantingRow(p, false));
                      }

                      // Multiple plantings of same variety → group header + expandable sub-rows
                      const groupKey = `${cat}-${seedId}`;
                      const isGroupExpanded = expandedVarietyGroups.has(groupKey);
                      const seed = seeds.find(s => s.id === seedId);
                      const totalStarted = groupPlantings.reduce((s, p) => s + (p.qty_started || 0), 0);
                      const totalPlanted = groupPlantings.reduce((s, p) => s + (p.qty_planted || 0), 0);
                      const derivedStatuses = [...new Set(groupPlantings.map(p => {
                        const ds = deriveStatus(p);
                        return ds.label;
                      }))];
                      const derivedStatusObjs = Object.values(
                        groupPlantings.reduce((m, p) => {
                          const ds = deriveStatus(p);
                          m[ds.label] = ds;
                          return m;
                        }, {})
                      );

                      const groupHeaderRow = (
                        <tr key={`group-${groupKey}`}
                          style={{ background: color + '10', cursor: 'pointer' }}
                          onClick={() => toggleVarietyGroup(groupKey)}>
                          <td style={{ paddingLeft: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', fontSize: 11, color, flexShrink: 0, lineHeight: 1 }}>
                                {isGroupExpanded ? '▼' : '▶'}
                              </button>
                              <ThumbPreview url={seed?.image_url} alt={groupPlantings[0].seed_name} color={color} opacity={0.35} />
                              <div>
                                <div style={{ fontWeight: 500, fontSize: 13 }}>{groupPlantings[0].seed_name}</div>
                                  <div style={{ fontSize: 11, color }}>
                                  {groupPlantings.length} plantings
                                </div>
                              </div>
                              {groupPlantings[0].organic ? <span className="badge badge-organic" style={{ marginLeft: 4 }}>OG</span> : null}
                            </div>
                          </td>
                          <td><span style={{ color: '#ccc', fontSize: 13 }}>—</span></td>
                          <td style={{ fontSize: 13, fontWeight: 600 }}>{totalStarted || '—'}</td>
                          <td style={{ fontSize: 13, fontWeight: 600 }}>{totalPlanted || '—'}</td>
                          <td>
                            {derivedStatusObjs.map(s => (
                              <span key={s.label} style={{
                                display: 'inline-block', padding: '1px 7px', borderRadius: 10,
                                background: s.color + '22', color: s.color,
                                fontSize: 11, marginRight: 3, fontWeight: 600, whiteSpace: 'nowrap'
                              }}>{s.emoji} {s.label}</span>
                            ))}
                          </td>
                          <td colSpan={3}></td>
                          <td></td>
                        </tr>
                      );

                      const subRows = isGroupExpanded ? groupPlantings.map(p => renderPlantingRow(p, true)) : [];
                      return [groupHeaderRow, ...subRows];
                    });

                    // Sub-group plantingRows by common_name if any planting in this cat has one
                    const hasAnyCommonName = catPlantings.some(p => p.common_name);
                    if (!hasAnyCommonName || bulkSelectMode) {
                      return [categoryRow, ...plantingRows];
                    }

                    // Build seed_id → common_name map from this category's plantings
                    const cnBySeed = {};
                    catPlantings.forEach(p => { cnBySeed[p.seed_id] = p.common_name || '__other__'; });

                    // Assign each rendered group (may be 1 or more rows) to a common_name bucket
                    const cnBuckets = {};
                    seedGroups.forEach(([seedId, groupPlantings]) => {
                      const cn = cnBySeed[seedId] || '__other__';
                      if (!cnBuckets[cn]) cnBuckets[cn] = [];
                      // Find the rendered rows for this seedId in plantingRows
                      // (they were added by the flatMap above in the same order as seedGroups)
                    });

                    // Simpler: re-build grouping from seedGroups directly with cn sub-headers
                    const sortedCns = [...new Set(
                      seedGroups.map(([sid]) => cnBySeed[sid] || '__other__').filter(cn => cn !== '__other__')
                    )].sort();
                    const unlabeledSeedIds = seedGroups.filter(([sid]) => !cnBySeed[sid] || cnBySeed[sid] === '__other__').map(([sid]) => sid);

                    const subGrouped = [];
                    sortedCns.forEach(cn => {
                      subGrouped.push(
                        <tr key={`cn-${cat}-${cn}`} style={{ background: color + '09' }}>
                          <td colSpan={bulkSelectMode ? 9 : 9} style={{ padding: '4px 12px 3px 28px', borderBottom: `1px solid ${color}22` }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{cn}</span>
                          </td>
                        </tr>
                      );
                      seedGroups
                        .filter(([sid]) => cnBySeed[sid] === cn)
                        .forEach(([seedId, groupPlantings]) => {
                          if (groupPlantings.length === 1 || bulkSelectMode) {
                            groupPlantings.forEach(p => subGrouped.push(renderPlantingRow(p, false)));
                          } else {
                            const groupKey = `${cat}-${seedId}`;
                            const isGroupExpanded2 = expandedVarietyGroups.has(groupKey);
                            const seed = seeds.find(s => s.id === seedId);
                            const totalStarted2 = groupPlantings.reduce((s, p) => s + (p.qty_started || 0), 0);
                            const totalPlanted2 = groupPlantings.reduce((s, p) => s + (p.qty_planted || 0), 0);
                            const derivedStatusObjs2 = Object.values(groupPlantings.reduce((m, p) => { const ds = deriveStatus(p); m[ds.label] = ds; return m; }, {}));
                            subGrouped.push(
                              <tr key={`group2-${groupKey}`} style={{ background: color + '10', cursor: 'pointer' }} onClick={() => toggleVarietyGroup(groupKey)}>
                                <td style={{ paddingLeft: 8 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', fontSize: 11, color, flexShrink: 0, lineHeight: 1 }}>{isGroupExpanded2 ? '▼' : '▶'}</button>
                                    <ThumbPreview url={seed?.image_url} alt={groupPlantings[0].seed_name} color={color} opacity={0.35} />
                                    <div>
                                      <div style={{ fontWeight: 500, fontSize: 13 }}>{groupPlantings[0].seed_name}</div>
                                      <div style={{ fontSize: 11, color }}>{groupPlantings.length} plantings</div>
                                    </div>
                                    {groupPlantings[0].organic ? <span className="badge badge-organic" style={{ marginLeft: 4 }}>OG</span> : null}
                                  </div>
                                </td>
                                <td><span style={{ color: '#ccc', fontSize: 13 }}>—</span></td>
                                <td style={{ fontSize: 13, fontWeight: 600 }}>{totalStarted2 || '—'}</td>
                                <td style={{ fontSize: 13, fontWeight: 600 }}>{totalPlanted2 || '—'}</td>
                                <td>{derivedStatusObjs2.map(s => <span key={s.label} style={{ display: 'inline-block', padding: '1px 7px', borderRadius: 10, background: s.color + '22', color: s.color, fontSize: 11, marginRight: 3, fontWeight: 600, whiteSpace: 'nowrap' }}>{s.emoji} {s.label}</span>)}</td>
                                <td colSpan={3}></td><td></td>
                              </tr>
                            );
                            if (isGroupExpanded2) groupPlantings.forEach(p => subGrouped.push(renderPlantingRow(p, true)));
                          }
                        });
                    });
                    if (unlabeledSeedIds.length) {
                      if (sortedCns.length > 0) {
                        subGrouped.push(
                          <tr key={`cn-${cat}-unlabeled`} style={{ background: color + '09' }}>
                            <td colSpan={bulkSelectMode ? 9 : 9} style={{ padding: '4px 12px 3px 28px', borderBottom: `1px solid ${color}22` }}>
                              <span style={{ fontSize: 11, color: '#bbb', fontStyle: 'italic' }}>unlabeled</span>
                            </td>
                          </tr>
                        );
                      }
                      seedGroups.filter(([sid]) => unlabeledSeedIds.includes(sid)).forEach(([seedId, groupPlantings]) => {
                        groupPlantings.forEach(p => subGrouped.push(renderPlantingRow(p, false)));
                      });
                    }
                    return [categoryRow, ...subGrouped];
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
        {(() => {
          const sorted = [...plantings].sort((a, b) => a.category.localeCompare(b.category) || a.seed_name.localeCompare(b.seed_name));
          const byCategory = {};
          sorted.forEach(p => {
            const cat = p.category || 'Other';
            if (!byCategory[cat]) byCategory[cat] = [];
            byCategory[cat].push(p);
          });

          return Object.entries(byCategory).map(([cat, catPlantings]) => {
            const color = catColor(cat);
            const allCatSelected = catPlantings.every(p => selectedPlantingIds.has(p.id));
            const todayStr = new Date().toISOString().split('T')[0];

            return (
              <React.Fragment key={cat}>
                {bulkSelectMode ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 4px', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
                      <span style={{ fontWeight: 700, fontSize: 11, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{cat}</span>
                    </div>
                    <button
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#5a4a3a', padding: '2px 6px', fontWeight: 500 }}
                      onClick={() => selectAllInCategory(catPlantings, !allCatSelected)}
                    >
                      {allCatSelected ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                ) : null}

                {catPlantings.map(p => {
                  const nextDate = p.transplant_date || p.direct_sow_date || p.indoor_start_date;
                  const nextIcon = p.transplant_date ? '🏡' : p.direct_sow_date ? '🌿' : '🏠';
                  const isSelected = selectedPlantingIds.has(p.id);
                  const isFailed = p.status === 'failed';

                  return (
                    <div key={p.id} className="card"
                      style={{
                        marginBottom: 10, padding: '14px 16px', cursor: 'pointer',
                        opacity: isFailed ? 0.45 : 1,
                        background: isSelected ? '#f0ece6' : undefined,
                        border: isSelected ? '2px solid #8a6a4a' : undefined,
                      }}
                      onClick={() => bulkSelectMode ? togglePlanting(p.id) : openPlantingDetail(p)}>
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
                        {bulkSelectMode ? (
                          <div style={{ marginLeft: 12, flexShrink: 0, display: 'flex', alignItems: 'center' }}
                            onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => togglePlanting(p.id)}
                              style={{ width: 22, height: 22, cursor: 'pointer' }}
                            />
                          </div>
                        ) : (
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
                        )}
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            );
          });
        })()}
      </div>

      {/* Floating bulk action bar */}
      {bulkSelectMode && (
        <div style={{
          position: 'fixed',
          left: '50%',
          transform: 'translateX(-50%)',
          bottom: 'calc(60px + env(safe-area-inset-bottom))',
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: '#2d2a24',
          color: '#fff',
          borderRadius: 32,
          padding: '12px 20px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.28)',
          fontSize: 14,
          fontWeight: 500,
          whiteSpace: 'nowrap',
        }}
          className="bulk-action-bar"
        >
          <span style={{ color: selectedPlantingIds.size === 0 ? '#8a8580' : '#e8c89a' }}>
            {selectedPlantingIds.size === 0 ? 'Select plantings above' : `${selectedPlantingIds.size} planting${selectedPlantingIds.size !== 1 ? 's' : ''} selected`}
          </span>
          <button
            onClick={onBulkLogEvent}
            disabled={selectedPlantingIds.size === 0}
            style={{
              background: selectedPlantingIds.size === 0 ? '#4a4540' : '#8a6a4a',
              color: selectedPlantingIds.size === 0 ? '#8a8580' : '#fff',
              border: 'none', borderRadius: 20, padding: '8px 16px',
              cursor: selectedPlantingIds.size === 0 ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 600,
            }}
          >
            Log Event
          </button>
          <button
            onClick={exitBulkMode}
            style={{
              background: 'none', border: '1px solid #5a5550', color: '#c4b8a8',
              borderRadius: 20, padding: '8px 14px', cursor: 'pointer', fontSize: 13,
            }}
          >
            Cancel
          </button>
        </div>
      )}

      <style>{`
        @media (min-width: 769px) {
          .bulk-action-bar {
            bottom: 16px !important;
          }
        }
      `}</style>
    </div>
  );
}
