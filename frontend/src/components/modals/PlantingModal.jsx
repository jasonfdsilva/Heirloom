import React from 'react';
import api from '../../lib/api';
import { STATUS_LABELS } from '../../lib/constants';
import { getSuggestedDates } from '../../lib/algorithms';

export default function PlantingModal({ editData, setEditData, seeds, setSeeds, structures, modalError, setModalError, onSubmit, onClose, isEdit = false, title = null }) {
  const categories = [...new Set(seeds.map(s => s.category))].sort();
  const allCategories = [...new Set([...categories, 'Flowers', 'Fruit', 'Other'])];

  return (
    <div className="modal-overlay" onClick={() => { onClose(); setModalError(null); }}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">{title || (isEdit ? 'Edit Planting' : 'New Planting')}</h3>

        {!isEdit && (
          <div className="form-group">
            <label className="form-label">Seed or Plant Variety</label>
            {editData._addingCustom ? (
              <div style={{ border: '1px solid #e8e4dd', borderRadius: 8, padding: 16, background: '#faf8f5' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontWeight: 500, fontSize: 14 }}>Add Custom Variety</span>
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditData(d => ({ ...d, _addingCustom: false }))}>Cancel</button>
                </div>
                <div className="grid-2">
                  <div className="form-group" style={{ marginBottom: 8 }}>
                    <label className="form-label">Name *</label>
                    <input type="text" className="form-input" value={editData._customName || ''} onChange={e => setEditData(d => ({ ...d, _customName: e.target.value }))} placeholder="e.g., Cherokee Purple" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 8 }}>
                    <label className="form-label">Category *</label>
                    <select className="form-input" value={editData._customCategory || ''} onChange={e => setEditData(d => ({ ...d, _customCategory: e.target.value }))}>
                      <option value="">Select...</option>
                      {allCategories.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="_custom">Other (type below)</option>
                    </select>
                    {editData._customCategory === '_custom' && (
                      <input type="text" className="form-input" style={{ marginTop: 4 }} value={editData._customCategoryText || ''} onChange={e => setEditData(d => ({ ...d, _customCategoryText: e.target.value }))} placeholder="Category name" />
                    )}
                  </div>
                  <div className="form-group" style={{ marginBottom: 8 }}>
                    <label className="form-label">Days to Maturity</label>
                    <input type="text" className="form-input" value={editData._customDays || ''} onChange={e => setEditData(d => ({ ...d, _customDays: e.target.value }))} placeholder="e.g., 75" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 8 }}>
                    <label className="form-label">Planting Method</label>
                    <select className="form-input" value={editData._customMethod || ''} onChange={e => setEditData(d => ({ ...d, _customMethod: e.target.value }))}>
                      <option value="">Select...</option>
                      <option value="indoor">Start Indoors</option>
                      <option value="direct">Direct Sow</option>
                      <option value="both">Both</option>
                      <option value="transplant">Transplant (bought starts)</option>
                    </select>
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 8 }}>
                  <label className="form-label">Supplier</label>
                  <input type="text" className="form-input" value={editData._customSupplier || ''} onChange={e => setEditData(d => ({ ...d, _customSupplier: e.target.value }))} placeholder="e.g., Local nursery, Home Depot" />
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="checkbox" checked={editData._customOrganic || false} onChange={e => setEditData(d => ({ ...d, _customOrganic: e.target.checked }))} /> Organic
                  </label>
                </div>
                {modalError && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 8 }}>{modalError}</div>}
                <div style={{ marginTop: 8 }}>
                  <button className="btn btn-primary btn-sm" disabled={!editData._customName || (!editData._customCategory || (editData._customCategory === '_custom' && !editData._customCategoryText))} onClick={async () => {
                    setModalError(null);
                    try {
                      const category = editData._customCategory === '_custom' ? editData._customCategoryText : editData._customCategory;
                      const method = editData._customMethod || '';
                      const res = await api.post('/api/seeds', {
                        name: editData._customName,
                        category: category,
                        days_to_maturity: editData._customDays || null,
                        organic: editData._customOrganic || false,
                        supplier: editData._customSupplier || null,
                        start_indoors: method === 'indoor' || method === 'both',
                        direct_sow: method === 'direct' || method === 'both',
                        suggested_indoor_weeks: (method === 'indoor' || method === 'both') ? 6 : 0,
                      });
                      if (res.id) {
                        const updatedSeeds = await api.get('/api/seeds');
                        setSeeds(updatedSeeds);
                        setEditData(d => ({
                          ...d,
                          seed_id: res.id,
                          _addingCustom: false,
                          _customName: '', _customCategory: '', _customCategoryText: '',
                          _customDays: '', _customMethod: '', _customSupplier: '', _customOrganic: false,
                        }));
                      } else {
                        setModalError(res.detail ? JSON.stringify(res.detail) : 'Failed to save variety. Check all fields.');
                      }
                    } catch (err) {
                      setModalError(`Error: ${err.message}`);
                    }
                  }}>Save and Select</button>
                </div>
              </div>
            ) : (
              <div>
                <select className="form-input" value={editData.seed_id || ''} onChange={e => {
                  if (e.target.value === '_add_custom') {
                    setEditData(d => ({ ...d, _addingCustom: true, seed_id: '' }));
                    return;
                  }
                  const seed = seeds.find(s => s.id === e.target.value);
                  if (seed) {
                    const suggested = getSuggestedDates(seed);
                    setEditData(d => ({ ...d, seed_id: e.target.value, ...suggested }));
                  }
                }}>
                  <option value="">Select a variety...</option>
                  <option value="_add_custom">+ Add custom variety...</option>
                  {categories.map(cat => (
                    <optgroup key={cat} label={cat}>
                      {seeds.filter(s => s.category === cat).map(s => (
                        <option key={s.id} value={s.id}>{s.name} {s.organic ? '(OG)' : ''}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Assign to Bed/Box</label>
          <select className="form-input" value={editData.structure_id || ''} onChange={e => setEditData(d => ({ ...d, structure_id: e.target.value || null }))}>
            <option value="">Unassigned</option>
            <optgroup label="Beds">
              {structures.filter(s => s.type === 'bed').map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.width}x{s.length} ft)</option>
              ))}
            </optgroup>
            <optgroup label="Inground">
              {structures.filter(s => s.type === 'strip').map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.width}x{s.length} ft)</option>
              ))}
            </optgroup>
            <optgroup label="Boxes">
              {structures.filter(s => s.type === 'box').map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </optgroup>
          </select>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Started (under lights)</label>
            <input type="number" className="form-input" value={editData.qty_started || ''} onChange={e => setEditData(d => ({ ...d, qty_started: parseInt(e.target.value) || null }))} placeholder="e.g. 12" />
          </div>
          <div className="form-group">
            <label className="form-label">Planted / Projected</label>
            <input type="number" className="form-input" value={editData.qty_planted || ''} onChange={e => setEditData(d => ({ ...d, qty_planted: parseInt(e.target.value) || null }))} placeholder="e.g. 6" />
            <div style={{ fontSize: 11, color: '#8a8580', marginTop: 4 }}>Can set ahead of transplant date as a projection</div>
          </div>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Start Indoors</label>
            <input type="date" className="form-input" value={editData.indoor_start_date || ''} onChange={e => setEditData(d => ({ ...d, indoor_start_date: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Harden Off</label>
            <input type="date" className="form-input" value={editData.hardening_date || ''} onChange={e => setEditData(d => ({ ...d, hardening_date: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Transplant</label>
            <input type="date" className="form-input" value={editData.transplant_date || ''} onChange={e => setEditData(d => ({ ...d, transplant_date: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Direct Sow</label>
            <input type="date" className="form-input" value={editData.direct_sow_date || ''} onChange={e => setEditData(d => ({ ...d, direct_sow_date: e.target.value }))} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">First Harvest</label>
          <input type="date" className="form-input" value={editData.first_harvest_date || ''} onChange={e => setEditData(d => ({ ...d, first_harvest_date: e.target.value }))} />
        </div>

        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-input" value={editData.status || 'planned'} onChange={e => setEditData(d => ({ ...d, status: e.target.value }))}>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea className="form-input" value={editData.notes || ''} onChange={e => setEditData(d => ({ ...d, notes: e.target.value }))} placeholder="Any observations..." />
        </div>

        {editData.seed_id && (() => {
          const thumbSeed = seeds.find(s => s.id === editData.seed_id);
          if (!thumbSeed) return null;
          return (
            <div className="form-group">
              <label className="form-label">Plant Thumbnail</label>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                {thumbSeed.image_url ? (
                  <img src={thumbSeed.image_url} alt={thumbSeed.name}
                    style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, border: '1px solid #e8e4dd', flexShrink: 0 }}
                    onError={e => { e.target.style.display = 'none'; }} />
                ) : (
                  <div style={{ width: 56, height: 56, borderRadius: 6, border: '2px dashed #e8e4dd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🌿</div>
                )}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary btn-sm" disabled={editData._thumbSearching}
                      onClick={async () => {
                        setEditData(d => ({ ...d, _thumbSearching: true }));
                        const res = await api.get(`/api/seeds/image-search?q=${encodeURIComponent(thumbSeed.name)}`);
                        if (res.image_url) {
                          await api.patch(`/api/seeds/${thumbSeed.id}/image`, { image_url: res.image_url });
                          setSeeds(await api.get('/api/seeds'));
                        }
                        setEditData(d => ({ ...d, _thumbSearching: false }));
                      }}>
                      {editData._thumbSearching ? 'Searching…' : '🔍 Find Image'}
                    </button>
                    <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
                      📁 Upload
                      <input type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={async e => {
                          const file = e.target.files[0];
                          if (!file) return;
                          const formData = new FormData();
                          formData.append('file', file);
                          const res = await api.upload(`/api/seeds/${thumbSeed.id}/image`, formData);
                          if (res.image_url) setSeeds(await api.get('/api/seeds'));
                        }} />
                    </label>
                  </div>
                  <input type="text" className="form-input"
                    placeholder="Or paste image URL…"
                    defaultValue={thumbSeed.image_url || ''}
                    style={{ fontSize: 11 }}
                    onBlur={async e => {
                      const url = e.target.value.trim();
                      if (url !== (thumbSeed.image_url || '')) {
                        await api.patch(`/api/seeds/${thumbSeed.id}/image`, { image_url: url || null });
                        setSeeds(await api.get('/api/seeds'));
                      }
                    }} />
                  {thumbSeed.image_url && (
                    <button className="btn btn-sm" style={{ background: 'none', border: 'none', color: '#8a8580', cursor: 'pointer', fontSize: 12, textAlign: 'left', padding: 0 }}
                      onClick={async () => {
                        await api.patch(`/api/seeds/${thumbSeed.id}/image`, { image_url: null });
                        setSeeds(await api.get('/api/seeds'));
                      }}>✕ Remove image</button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => { onClose(); setModalError(null); }}>Cancel</button>
          <button className="btn btn-primary" onClick={onSubmit}>
            {isEdit ? 'Save Changes' : 'Create Planting'}
          </button>
        </div>
      </div>
    </div>
  );
}
