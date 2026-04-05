import React, { useState, useRef } from 'react';
import api from '../../lib/api';
import { catColor } from '../../lib/colors';
import ThumbPreview from '../common/ThumbPreview';

export default function Seeds({
  seeds,
  lots = [],
  editData, setEditData,
  showModal, setShowModal,
  collapsedSeedCategories, setCollapsedSeedCategories,
  loadData,
  onAddLot,
  onEditLot,
  onDeleteLot,
}) {
  const [groupBy, setGroupBy] = useState('category'); // 'category' | 'year'
  const [suggestingName, setSuggestingName] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);
  const [showLotCode, setShowLotCode] = useState(
    () => localStorage.getItem('heirloom_seeds_showLotCode') === 'true'
  );
  const [expandedSeeds, setExpandedSeeds] = useState(new Set());

  const COL_COUNT = showLotCode ? 10 : 9;

  const categories = [...new Set(seeds.map(s => s.category))].sort();
  const allCategories = [...new Set([...categories, 'Flowers', 'Fruit', 'Other'])];

  const toggleLotCode = (val) => {
    setShowLotCode(val);
    localStorage.setItem('heirloom_seeds_showLotCode', String(val));
  };

  const toggleSeedExpand = (seedId) => {
    setExpandedSeeds(prev => {
      const next = new Set(prev);
      if (next.has(seedId)) next.delete(seedId); else next.add(seedId);
      return next;
    });
  };

  const handleEditSeed = (seed) => {
    // For seeds that use the new lot system, the legacy germ_rate/lot/supplier fields
    // on the seed record may be blank. Fall back to the most recent lot's data.
    const recentLot = (lotsBySeed[seed.id] || [])[0];
    setEditData({
      _editingSeed: true,
      _seedId: seed.id,
      _seedName: seed.name,
      _seedCategory: seed.category,
      _seedCommonName: seed.common_name || '',
      _seedSpecies: seed.species || '',
      _seedDays: seed.days_to_maturity || '',
      _seedOrganic: !!seed.organic,
      _seedSupplier: seed.supplier || recentLot?.supplier || '',
      _seedStartIndoors: !!seed.start_indoors,
      _seedDirectSow: !!seed.direct_sow,
      _seedIndoorWeeks: seed.suggested_indoor_weeks || 0,
      _seedGermRate: seed.germ_rate != null ? String(seed.germ_rate) : (recentLot?.germ_rate != null ? String(recentLot.germ_rate) : ''),
      _seedLot: seed.lot || recentLot?.supplier_lot || '',
      _seedSku: seed.sku || recentLot?.sku || '',
      _seedSpacing: seed.spacing_inches || 12,
      _seedImageUrl: seed.image_url || '',
      _seedImageLocked: !!seed.image_locked,
      _seedShortLabel: seed.short_label || '',
      _seedImageLoading: false,
    });
    setShowModal('edit-seed');
  };

  const handleSuggestCommonName = async () => {
    setSuggestingName(true);
    try {
      const res = await api.get(`/api/seeds/${editData._seedId}/suggest-common-name`);
      if (res.common_name) setEditData(d => ({ ...d, _seedCommonName: res.common_name }));
    } catch (_) {}
    setSuggestingName(false);
  };

  const handleSaveSeed = async () => {
    const cat = editData._seedCategory === '_custom' ? editData._seedCategoryText : editData._seedCategory;
    await api.put(`/api/seeds/${editData._seedId}`, {
      name: editData._seedName,
      category: cat,
      common_name: editData._seedCommonName || null,
      species: editData._seedSpecies || null,
      days_to_maturity: editData._seedDays || null,
      organic: editData._seedOrganic,
      supplier: editData._seedSupplier || null,
      start_indoors: editData._seedStartIndoors,
      direct_sow: editData._seedDirectSow,
      suggested_indoor_weeks: editData._seedIndoorWeeks || 0,
      spacing_inches: editData._seedSpacing || 12,
      germ_rate: editData._seedGermRate ? parseFloat(editData._seedGermRate) : null,
      lot: editData._seedLot || null,
      sku: editData._seedSku || null,
      image_url: editData._seedImageUrl || null,
      image_locked: !!editData._seedImageLocked,
      short_label: editData._seedShortLabel || null,
    });
    setShowModal(null);
    setEditData({});
    loadData();
  };

  // Build lot lookup: seedId → [lots]
  const lotsBySeed = {};
  lots.forEach(l => {
    if (!lotsBySeed[l.seed_id]) lotsBySeed[l.seed_id] = [];
    lotsBySeed[l.seed_id].push(l);
  });

  // Get packed_for_year values for a seed
  const yearsForSeed = (seedId) => {
    const seedLots = lotsBySeed[seedId] || [];
    if (!seedLots.length) return null;
    const years = [...new Set(seedLots.map(l => l.packed_for_year).filter(Boolean))].sort();
    return years.join(', ');
  };

  const renderLotSubRows = (seedId, color) => {
    const seedLots = lotsBySeed[seedId] || [];
    if (!seedLots.length) return null;
    const parentSeed = seeds.find(s => s.id === seedId);
    return seedLots.map(lot => (
      <tr key={`lot-${lot.id}`} style={{ background: color + '08' }}
        title={lot.notes || undefined}>
        {/* Variety col → indent only */}
        <td style={{ paddingLeft: 40 }}></td>
        {/* Year */}
        <td style={{ fontSize: 12, color: '#5a6a8a' }}>{lot.packed_for_year || '—'}</td>
        {/* Packet ID col → our generated code (optional) */}
        {showLotCode && (
          <td style={{ fontSize: 11, fontFamily: 'monospace', color: '#5a7a5a', fontWeight: 600 }}>{lot.lot_code}</td>
        )}
        {/* Lot # col → this lot's supplier_lot */}
        <td style={{ fontSize: 12, color: '#5a5550' }}>
          {lot.supplier_lot
            ? <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{lot.supplier_lot}</span>
            : <span style={{ color: '#ccc' }}>—</span>}
        </td>
        {/* Packets count col → reuse for supplier */}
        <td style={{ fontSize: 12, color: '#8a8580' }}>{lot.supplier || '—'}</td>
        {/* Species col → from parent variety */}
        <td style={{ fontStyle: 'italic', fontSize: 12, color: '#b0a898' }}>{parentSeed?.species || ''}</td>
        {/* Days col → from parent variety */}
        <td style={{ fontSize: 12, color: '#b0a898' }}>{parentSeed?.days_to_maturity || ''}</td>
        {/* Germ% */}
        <td style={{ fontSize: 12 }}>{lot.germ_rate != null ? `${lot.germ_rate}%` : '—'}</td>
        {/* Method col → from parent variety */}
        <td style={{ fontSize: 12 }}>
          {parentSeed?.start_indoors ? '🏠 Indoor' : ''}
          {parentSeed?.start_indoors && parentSeed?.direct_sow ? ' / ' : ''}
          {parentSeed?.direct_sow ? '🌿 Direct' : ''}
        </td>
        {/* Actions */}
        <td>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-secondary btn-sm" style={{ fontSize: 10, padding: '2px 6px' }}
              onClick={() => onEditLot && onEditLot(lot)}>Edit</button>
            <button className="btn btn-sm" style={{ fontSize: 10, padding: '2px 6px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5' }}
              onClick={() => { if (window.confirm(`Delete packet ${lot.lot_code}?`)) onDeleteLot && onDeleteLot(lot.id); }}>
              ✕
            </button>
          </div>
        </td>
      </tr>
    ));
  };

  const renderSeedRow = (s, color) => {
    const seedLots = lotsBySeed[s.id] || [];
    const isExpanded = expandedSeeds.has(s.id);
    const yearStr = yearsForSeed(s.id);
    // Fall back to the most recent lot's germ_rate if the variety has none set
    const displayGermRate = s.germ_rate != null
      ? s.germ_rate
      : (seedLots.find(l => l.germ_rate != null)?.germ_rate ?? null);

    return [
      <tr key={s.id}>
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {seedLots.length > 0 && (
              <button onClick={() => toggleSeedExpand(s.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 10, color, width: 14 }}>
                {isExpanded ? '▼' : '▶'}
              </button>
            )}
            {!seedLots.length && <span style={{ width: 14 }} />}
            <ThumbPreview url={s.image_url} alt={s.name} color={color} />
            <div>
              <span style={{ fontWeight: 500 }}>{s.name}</span>
              {s.organic ? <span className="badge badge-organic" style={{ marginLeft: 4 }}>OG</span> : null}
              {s.common_name && groupBy === 'year' && (
                <div style={{ fontSize: 11, color: '#8a8580', marginTop: 1 }}>{s.common_name}</div>
              )}
            </div>
          </div>
        </td>
        {/* Year */}
        <td style={{ fontSize: 12, color: '#5a6a8a' }}>{yearStr || '—'}</td>
        {showLotCode && (
          <td style={{ fontSize: 11, color: '#5a7a5a', fontFamily: 'monospace' }}>
            {seedLots.length > 0 ? seedLots.map(l => l.lot_code).join(', ') : ''}
          </td>
        )}
        {/* Lot # col → supplier lot numbers, always visible */}
        <td style={{ fontSize: 12, color: '#5a5550' }}>
          {seedLots.length > 0
            ? seedLots.map(l => l.supplier_lot).filter(Boolean).join(', ') || <span style={{ color: '#ccc' }}>—</span>
            : <span style={{ color: '#ccc' }}>—</span>}
        </td>
        <td>
          {seedLots.length > 0 ? (
            <span style={{ background: color + '22', color, fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 10 }}>
              {seedLots.length}
            </span>
          ) : <span style={{ color: '#ccc', fontSize: 11 }}>—</span>}
        </td>
        <td style={{ fontStyle: 'italic', fontSize: 12, color: '#8a8580' }}>{s.species}</td>
        <td>{s.days_to_maturity}</td>
        <td style={{ fontSize: 12 }}>{displayGermRate != null ? `${displayGermRate}%` : ''}</td>
        <td style={{ fontSize: 12 }}>
          {s.start_indoors ? '🏠 Indoor' : ''}{s.start_indoors && s.direct_sow ? ' / ' : ''}{s.direct_sow ? '🌿 Direct' : ''}
        </td>
        <td>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => handleEditSeed(s)}>Edit</button>
            <button className="btn btn-primary btn-sm" onClick={() => onAddLot && onAddLot(s.id)} title="Add packet">+ Packet</button>
          </div>
        </td>
      </tr>,
      ...(isExpanded ? (renderLotSubRows(s.id, color) || []) : []),
    ];
  };

  // ── Group by Category (with common_name sub-groups) ───────────────────────
  const renderByCategory = () => {
    const byCategory = {};
    seeds.forEach(s => {
      const cat = s.category || 'Other';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(s);
    });
    return Object.keys(byCategory).sort().flatMap(cat => {
      const catSeeds = byCategory[cat];
      const isCatCollapsed = collapsedSeedCategories.has(cat);
      const color = catColor(cat);
      const categoryRow = (
        <tr key={`cat-${cat}`}
          style={{ background: color + '14', cursor: 'pointer', userSelect: 'none' }}
          onClick={() => setCollapsedSeedCategories(prev => {
            const next = new Set(prev);
            if (next.has(cat)) next.delete(cat); else next.add(cat);
            return next;
          })}>
          <td colSpan={COL_COUNT} style={{ padding: '8px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, color, width: 12, textAlign: 'center' }}>{isCatCollapsed ? '▶' : '▼'}</span>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
              <span style={{ fontWeight: 700, fontSize: 12, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{cat}</span>
              <span style={{ fontSize: 12, color: '#8a8580', fontWeight: 400 }}>{catSeeds.length} {catSeeds.length === 1 ? 'variety' : 'varieties'}</span>
            </div>
          </td>
        </tr>
      );
      if (isCatCollapsed) return [categoryRow];

      // Sub-group by common_name if any seeds in this category have one set
      const hasAnyCommonName = catSeeds.some(s => s.common_name);
      if (!hasAnyCommonName) {
        return [categoryRow, ...catSeeds.flatMap(s => renderSeedRow(s, color))];
      }

      const byCommonName = {};
      catSeeds.forEach(s => {
        const cn = s.common_name || '__other__';
        if (!byCommonName[cn]) byCommonName[cn] = [];
        byCommonName[cn].push(s);
      });
      const sortedCns = Object.keys(byCommonName).filter(k => k !== '__other__').sort();
      const unlabeled = byCommonName['__other__'] || [];

      const subRows = [];
      sortedCns.forEach(cn => {
        subRows.push(
          <tr key={`cn-${cat}-${cn}`} style={{ background: color + '09' }}>
            <td colSpan={COL_COUNT} style={{ padding: '5px 12px 3px 28px', borderBottom: `1px solid ${color}22` }}>
              <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{cn}</span>
              <span style={{ fontSize: 11, color: '#aaa', marginLeft: 6 }}>{byCommonName[cn].length} {byCommonName[cn].length === 1 ? 'variety' : 'varieties'}</span>
            </td>
          </tr>
        );
        byCommonName[cn].forEach(s => subRows.push(...renderSeedRow(s, color)));
      });
      if (unlabeled.length) {
        if (sortedCns.length > 0) {
          subRows.push(
            <tr key={`cn-${cat}-unlabeled`} style={{ background: color + '09' }}>
              <td colSpan={COL_COUNT} style={{ padding: '5px 12px 3px 28px', borderBottom: `1px solid ${color}22` }}>
                <span style={{ fontSize: 11, color: '#bbb', fontStyle: 'italic' }}>unlabeled</span>
              </td>
            </tr>
          );
        }
        unlabeled.forEach(s => subRows.push(...renderSeedRow(s, color)));
      }
      return [categoryRow, ...subRows];
    });
  };

  // ── Group by Year ──────────────────────────────────────────────────────────
  const renderByYear = () => {
    // Collect all packed_for_years across all lots
    const allYears = new Set();
    lots.forEach(l => { if (l.packed_for_year) allYears.add(l.packed_for_year); });
    const sortedYears = [...allYears].sort((a, b) => b - a);

    // Seeds with no lots → "Unlotted"
    const lotlessSeeds = seeds.filter(s => !lotsBySeed[s.id] || !lotsBySeed[s.id].length);

    return [
      ...sortedYears.flatMap(year => {
        // Seeds that have ≥1 lot with this packed_for_year
        const yearSeeds = seeds.filter(s => (lotsBySeed[s.id] || []).some(l => l.packed_for_year === year));
        if (!yearSeeds.length) return [];
        const color = '#5a7a5a';
        const yearRow = (
          <tr key={`year-${year}`} style={{ background: '#f0f4f0', cursor: 'default' }}>
            <td colSpan={COL_COUNT} style={{ padding: '8px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 12, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  📦 {year}
                </span>
                <span style={{ fontSize: 12, color: '#8a8580', fontWeight: 400 }}>{yearSeeds.length} {yearSeeds.length === 1 ? 'variety' : 'varieties'}</span>
              </div>
            </td>
          </tr>
        );
        return [yearRow, ...yearSeeds.flatMap(s => renderSeedRow(s, catColor(s.category)))];
      }),
      ...(lotlessSeeds.length ? [
        <tr key="unlotted" style={{ background: '#fafaf8', cursor: 'default' }}>
          <td colSpan={COL_COUNT} style={{ padding: '8px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 12, color: '#8a8580', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Unlotted
              </span>
              <span style={{ fontSize: 12, color: '#8a8580', fontWeight: 400 }}>{lotlessSeeds.length} {lotlessSeeds.length === 1 ? 'variety' : 'varieties'}</span>
            </div>
          </td>
        </tr>,
        ...lotlessSeeds.flatMap(s => renderSeedRow(s, catColor(s.category))),
      ] : []),
    ];
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 2 }}>Seed Inventory</h1>
          <p className="page-sub">{seeds.length} varieties · {lots.length} packets</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Group by toggle */}
          <div style={{ display: 'flex', gap: 2 }}>
            <button className={`btn btn-sm ${groupBy === 'category' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setGroupBy('category')}>By Category</button>
            <button className={`btn btn-sm ${groupBy === 'year' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setGroupBy('year')}>By Year</button>
          </div>
          {/* Show Packet ID toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, cursor: 'pointer', color: '#5a5550' }}>
            <input type="checkbox" checked={showLotCode} onChange={e => toggleLotCode(e.target.checked)} />
            Show Packet ID
          </label>
          {/* New Packet button */}
          <button className="btn btn-primary btn-sm" onClick={() => onAddLot && onAddLot(null)}>
            + New Packet
          </button>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Variety</th>
              <th style={{ fontSize: 11 }}>Year</th>
              {showLotCode && <th style={{ fontSize: 11 }}>Packet ID</th>}
              <th style={{ fontSize: 11 }}>Lot #</th>
              <th style={{ fontSize: 11 }}>Packets</th>
              <th>Species</th>
              <th>Days</th>
              <th>Germ%</th>
              <th>Method</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {groupBy === 'category' ? renderByCategory() : renderByYear()}
          </tbody>
        </table>
      </div>

      {showModal === 'edit-seed' && (
        <div className="modal-overlay" onClick={() => setShowModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Edit Seed / Plant Variety</h3>
            <div className="form-group">
              <label className="form-label">Short Label for Map <span style={{ fontSize: 11, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(shown on garden map cells, keep under 8 chars)</span></label>
              <input type="text" className="form-input" maxLength={10}
                value={editData._seedShortLabel || ''}
                onChange={e => setEditData(d => ({ ...d, _seedShortLabel: e.target.value }))}
                placeholder={editData._seedName ? editData._seedName.split(' ')[0].slice(0, 8) : 'e.g. Shishito'}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Common Name <span style={{ fontSize: 11, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(plant type — used for grouping &amp; image search)</span></label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="text" className="form-input" style={{ flex: 1 }}
                  value={editData._seedCommonName || ''}
                  onChange={e => setEditData(d => ({ ...d, _seedCommonName: e.target.value }))}
                  placeholder="e.g. Kale, Spinach, Romaine Lettuce, Onion, Cilantro"
                />
                <button type="button" className="btn btn-secondary btn-sm"
                  disabled={suggestingName} onClick={handleSuggestCommonName}
                  title="Ask Claude to suggest a common name" style={{ flexShrink: 0 }}>
                  {suggestingName ? '…' : '✨ Suggest'}
                </button>
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Name</label>
                <input type="text" className="form-input" value={editData._seedName || ''} onChange={e => setEditData(d => ({ ...d, _seedName: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-input" value={editData._seedCategory || ''} onChange={e => setEditData(d => ({ ...d, _seedCategory: e.target.value }))}>
                  {allCategories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="_custom">Other (type below)</option>
                </select>
                {editData._seedCategory === '_custom' && (
                  <input type="text" className="form-input" style={{ marginTop: 4 }} value={editData._seedCategoryText || ''} onChange={e => setEditData(d => ({ ...d, _seedCategoryText: e.target.value }))} placeholder="New category name" />
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Species</label>
                <input type="text" className="form-input" value={editData._seedSpecies || ''} onChange={e => setEditData(d => ({ ...d, _seedSpecies: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Days to Maturity</label>
                <input type="text" className="form-input" value={editData._seedDays || ''} onChange={e => setEditData(d => ({ ...d, _seedDays: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Germination %</label>
                <input type="number" className="form-input" value={editData._seedGermRate || ''} onChange={e => setEditData(d => ({ ...d, _seedGermRate: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Supplier</label>
                <input type="text" className="form-input" value={editData._seedSupplier || ''} onChange={e => setEditData(d => ({ ...d, _seedSupplier: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Lot</label>
                <input type="text" className="form-input" value={editData._seedLot || ''} onChange={e => setEditData(d => ({ ...d, _seedLot: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">SKU</label>
                <input type="text" className="form-input" value={editData._seedSku || ''} onChange={e => setEditData(d => ({ ...d, _seedSku: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 8, marginBottom: 16 }}>
              <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={editData._seedOrganic || false} onChange={e => setEditData(d => ({ ...d, _seedOrganic: e.target.checked }))} /> Organic
              </label>
              <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={editData._seedStartIndoors || false} onChange={e => setEditData(d => ({ ...d, _seedStartIndoors: e.target.checked }))} /> Start Indoors
              </label>
              <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={editData._seedDirectSow || false} onChange={e => setEditData(d => ({ ...d, _seedDirectSow: e.target.checked }))} /> Direct Sow
              </label>
            </div>
            {editData._seedStartIndoors && (
              <div className="form-group">
                <label className="form-label">Weeks before last frost to start indoors</label>
                <input type="number" className="form-input" value={editData._seedIndoorWeeks || ''} onChange={e => setEditData(d => ({ ...d, _seedIndoorWeeks: parseInt(e.target.value) || 0 }))} />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Plant Spacing (inches)</label>
              <input type="number" className="form-input" value={editData._seedSpacing || ''} onChange={e => setEditData(d => ({ ...d, _seedSpacing: parseInt(e.target.value) || 12 }))} placeholder="12" />
              <div style={{ fontSize: 11, color: '#8a8580', marginTop: 4 }}>Used in the bed planner grid. Common values: 3" carrots/radish, 6" lettuce/onions, 12" herbs/cucumbers, 18" peppers/kale, 24" tomatoes</div>
            </div>
            <div className="form-group">
              <label className="form-label">Plant Photo</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {editData._seedImageUrl ? (
                    <img src={editData._seedImageUrl} alt={editData._seedName} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid #e8e4dd' }} onError={e => { e.target.style.display = 'none'; }} />
                  ) : (
                    <div style={{ width: 64, height: 64, borderRadius: 8, border: '2px dashed #e8e4dd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#ccc' }}>🌿</div>
                  )}
                  {editData._seedImageLocked && (
                    <div style={{ position: 'absolute', bottom: -4, right: -4, background: '#2d2a24', color: '#fff', borderRadius: 4, fontSize: 9, padding: '1px 4px', lineHeight: 1.5 }}>🔒</div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary btn-sm" disabled={editData._seedImageLoading} onClick={async () => {
                      setEditData(d => ({ ...d, _seedImageLoading: true }));
                      const params = new URLSearchParams({ q: editData._seedName || '' });
                      if (editData._seedCommonName) params.set('common_name', editData._seedCommonName);
                      if (editData._seedSpecies) params.set('species', editData._seedSpecies);
                      const cat = editData._seedCategory === '_custom' ? editData._seedCategoryText : editData._seedCategory;
                      if (cat) params.set('category', cat);
                      const res = await api.get(`/api/seeds/image-search?${params.toString()}`);
                      setEditData(d => ({ ...d, _seedImageUrl: res.image_url || d._seedImageUrl, _seedImageLoading: false }));
                    }}>
                      {editData._seedImageLoading ? 'Searching...' : '🔍 Find Image'}
                    </button>
                    <button className="btn btn-secondary btn-sm" disabled={uploadingImage} onClick={() => fileInputRef.current?.click()}>
                      {uploadingImage ? 'Uploading...' : '📷 Upload'}
                    </button>
                    {editData._seedImageUrl && (
                      <button className="btn btn-sm" style={{ background: 'none', border: 'none', color: '#8a8580', cursor: 'pointer', fontSize: 12 }} onClick={() => setEditData(d => ({ ...d, _seedImageUrl: '' }))}>✕ Remove</button>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => {
                    const file = e.target.files[0];
                    if (!file || !editData._seedId) return;
                    setUploadingImage(true);
                    const formData = new FormData();
                    formData.append('file', file);
                    try {
                      const res = await api.upload(`/api/seeds/${editData._seedId}/image`, formData);
                      if (res.image_url) setEditData(d => ({ ...d, _seedImageUrl: res.image_url, _seedImageLocked: true }));
                    } catch (_) {}
                    setUploadingImage(false);
                    e.target.value = '';
                  }} />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, cursor: 'pointer', fontSize: 12, color: '#2d2a24' }}>
                    <input type="checkbox" checked={!!editData._seedImageLocked}
                      onChange={e => setEditData(d => ({ ...d, _seedImageLocked: e.target.checked }))} />
                    🔒 Lock image — Fetch Images will never overwrite this
                  </label>
                  <div style={{ fontSize: 11, color: '#8a8580', marginTop: 2 }}>
                    Uploads are locked automatically.
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveSeed}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
