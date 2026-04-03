import React from 'react';
import { EVENT_TYPES } from '../../lib/constants';

export default function EventModal({ editData, setEditData, modalError, setModalError, onSubmit, onClose, selectedPlanting }) {
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="modal-overlay" onClick={() => { onClose(); setModalError(null); }}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">Log Event</h3>

        {modalError && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '8px 12px', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{modalError}</div>}

        <div className="form-group">
          <label className="form-label">Event Type <span style={{ color: '#dc2626' }}>*</span></label>
          <select className="form-input" value={editData.event_type || ''} onChange={e => { setModalError(null); setEditData(d => ({ ...d, event_type: e.target.value })); }}>
            <option value="">Select type...</option>
            {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Date</label>
          <input type="date" className="form-input" value={editData.event_date || today} onChange={e => setEditData(d => ({ ...d, event_date: e.target.value }))} />
        </div>

        {editData.event_type === 'germination' && (
          <div className="form-group">
            <label className="form-label">Seeds Sprouted (count)</label>
            <input type="number" min="1" className="form-input"
              value={editData.quantity || ''}
              onChange={e => setEditData(d => ({ ...d, quantity: parseInt(e.target.value) || null }))}
              placeholder="e.g. 8" />
            {selectedPlanting?.qty_started && (
              <div style={{ fontSize: 11, color: '#8a8580', marginTop: 4 }}>
                {editData.quantity
                  ? `${Math.round(editData.quantity / selectedPlanting.qty_started * 100)}% of ${selectedPlanting.qty_started} started (this batch)`
                  : `${selectedPlanting.qty_started} seeds started total`}
              </div>
            )}
          </div>
        )}

        {(editData.event_type === 'disease' || editData.event_type === 'pest') && (
          <div className="form-group">
            <label className="form-label">Severity</label>
            <select className="form-input" value={editData.severity || ''} onChange={e => setEditData(d => ({ ...d, severity: e.target.value }))}>
              <option value="">Select...</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        )}

        {(editData.event_type === 'fertilize' || editData.event_type === 'disease' || editData.event_type === 'pest') && (
          <div className="form-group">
            <label className="form-label">Product Used</label>
            <input type="text" className="form-input" value={editData.product_used || ''} onChange={e => setEditData(d => ({ ...d, product_used: e.target.value }))} placeholder="e.g., Fish emulsion, Neem oil..." />
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Details</label>
          <textarea className="form-input" value={editData.details || ''} onChange={e => setEditData(d => ({ ...d, details: e.target.value }))} placeholder={editData.event_type === 'note' ? "What's on your mind…" : "What happened..."} />
        </div>

        {!editData.id && (
          <div className="form-group">
            <label className="form-label">Attach Photos <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(optional)</span></label>
            <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', marginBottom: 6 }}>
              📷 Choose Photos
              <input type="file" accept="image/*" multiple style={{ display: 'none' }}
                onChange={e => setEditData(d => ({ ...d, _photos: Array.from(e.target.files) }))} />
            </label>
            {editData._photos?.length > 0 && (
              <div style={{ fontSize: 12, color: '#16a34a', marginTop: 4 }}>
                ✓ {editData._photos.length} photo{editData._photos.length !== 1 ? 's' : ''} selected
              </div>
            )}
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={onSubmit}>{editData.id ? 'Save Changes' : 'Log Event'}</button>
        </div>
      </div>
    </div>
  );
}
