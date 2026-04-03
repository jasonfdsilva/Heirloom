import React from 'react';
import api from '../../lib/api';
import { catColor } from '../../lib/colors';

export default function Seeds({
  seeds,
  editData, setEditData,
  showModal, setShowModal,
  collapsedSeedCategories, setCollapsedSeedCategories,
  loadData,
}) {
  const categories = [...new Set(seeds.map(s => s.category))].sort();
  const allCategories = [...new Set([...categories, 'Flowers', 'Fruit', 'Other'])];

  const handleEditSeed = (seed) => {
    setEditData({
      _editingSeed: true,
      _seedId: seed.id,
      _seedName: seed.name,
      _seedCategory: seed.category,
      _seedSpecies: seed.species || '',
      _seedDays: seed.days_to_maturity || '',
      _seedOrganic: !!seed.organic,
      _seedSupplier: seed.supplier || '',
      _seedStartIndoors: !!seed.start_indoors,
      _seedDirectSow: !!seed.direct_sow,
      _seedIndoorWeeks: seed.suggested_indoor_weeks || 0,
      _seedGermRate: seed.germ_rate || '',
      _seedLot: seed.lot || '',
      _seedSku: seed.sku || '',
      _seedSpacing: seed.spacing_inches || 12,
      _seedImageUrl: seed.image_url || '',
      _seedShortLabel: seed.short_label || '',
      _seedImageLoading: false,
    });
    setShowModal('edit-seed');
  };

  const handleSaveSeed = async () => {
    const cat = editData._seedCategory === '_custom' ? editData._seedCategoryText : editData._seedCategory;
    await api.put(`/api/seeds/${editData._seedId}`, {
      name: editData._seedName,
      category: cat,
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
      short_label: editData._seedShortLabel || null,
    });
    setShowModal(null);
    setEditData({});
    loadData();
  };

  return (
    <div>
      <h1 className="page-title">Seed Inventory</h1>
      <p className="page-sub">{seeds.length} varieties</p>
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Variety</th>
              <th>Species</th>
              <th>Days</th>
              <th>Germ%</th>
              <th>Lot</th>
              <th>Method</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(() => {
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
                    <td colSpan={7} style={{ padding: '8px 12px' }}>
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
                return [categoryRow, ...catSeeds.map(s => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {s.image_url ? (
                          <img src={s.image_url} alt={s.name} style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4, flexShrink: 0, border: '1px solid #e8e4dd' }} onError={e => { e.target.style.display = 'none'; }} />
                        ) : (
                          <div style={{ width: 32, height: 32, borderRadius: 4, background: color, opacity: 0.35, flexShrink: 0 }} />
                        )}
                        <span style={{ fontWeight: 500 }}>{s.name}</span>
                        {s.organic ? <span className="badge badge-organic" style={{ marginLeft: 4 }}>OG</span> : null}
                      </div>
                    </td>
                    <td style={{ fontStyle: 'italic', fontSize: 12, color: '#8a8580' }}>{s.species}</td>
                    <td>{s.days_to_maturity}</td>
                    <td>{s.germ_rate ? `${s.germ_rate}%` : ''}</td>
                    <td style={{ fontSize: 12, color: '#8a8580' }}>{s.lot}</td>
                    <td style={{ fontSize: 12 }}>
                      {s.start_indoors ? '🏠 Indoor' : ''}{s.start_indoors && s.direct_sow ? ' / ' : ''}{s.direct_sow ? '🌿 Direct' : ''}
                    </td>
                    <td><button className="btn btn-secondary btn-sm" onClick={() => handleEditSeed(s)}>Edit</button></td>
                  </tr>
                ))];
              });
            })()}
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
                {editData._seedImageUrl ? (
                  <img src={editData._seedImageUrl} alt={editData._seedName} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid #e8e4dd', flexShrink: 0 }} onError={e => { e.target.style.display = 'none'; }} />
                ) : (
                  <div style={{ width: 64, height: 64, borderRadius: 8, border: '2px dashed #e8e4dd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#ccc', flexShrink: 0 }}>🌿</div>
                )}
                <div style={{ flex: 1 }}>
                  <button className="btn btn-secondary btn-sm" disabled={editData._seedImageLoading} onClick={async () => {
                    setEditData(d => ({ ...d, _seedImageLoading: true }));
                    const res = await api.get(`/api/seeds/image-search?q=${encodeURIComponent(editData._seedName || '')}`);
                    setEditData(d => ({ ...d, _seedImageUrl: res.image_url || d._seedImageUrl, _seedImageLoading: false }));
                  }}>
                    {editData._seedImageLoading ? 'Searching...' : '🔍 Find Image'}
                  </button>
                  {editData._seedImageUrl && (
                    <button className="btn btn-sm" style={{ marginLeft: 8, background: 'none', border: 'none', color: '#8a8580', cursor: 'pointer', fontSize: 12 }} onClick={() => setEditData(d => ({ ...d, _seedImageUrl: '' }))}>✕ Remove</button>
                  )}
                  <div style={{ fontSize: 11, color: '#8a8580', marginTop: 4 }}>Auto-fetched from Wikipedia. Shown in bed planner grid.</div>
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
