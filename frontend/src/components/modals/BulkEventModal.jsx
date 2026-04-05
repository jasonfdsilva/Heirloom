import React, { useState } from 'react';
import { EVENT_TYPES } from '../../lib/constants';

// All event types available in bulk mode; germination simply omits the per-planting quantity field
const BULK_EVENT_TYPES = EVENT_TYPES;

export default function BulkEventModal({
  editData,
  setEditData,
  modalError,
  setModalError,
  onSubmit,
  onClose,
  selectedPlantings,  // array of planting objects { id, seed_name }
}) {
  const today = new Date().toISOString().split('T')[0];
  const [namesExpanded, setNamesExpanded] = useState(false);
  const count = selectedPlantings.length;

  return (
    <div className="modal-overlay" onClick={() => { onClose(); setModalError(null); }}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">Log Event — {count} planting{count !== 1 ? 's' : ''}</h3>

        {/* Collapsible list of selected planting names */}
        <div style={{
          background: '#f8f6f1', border: '1px solid #e8e4dd', borderRadius: 8,
          padding: '8px 12px', marginBottom: 16, fontSize: 13,
        }}>
          <button
            style={{
              background: 'none', border: 'none', cursor: 'pointer', width: '100%',
              textAlign: 'left', display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', padding: 0, font: 'inherit', color: '#2d2a24',
            }}
            onClick={() => setNamesExpanded(e => !e)}
          >
            <span style={{ fontWeight: 500 }}>
              {namesExpanded ? 'Hide' : 'Show'} selected plantings
            </span>
            <span style={{ fontSize: 11, color: '#8a8580' }}>{namesExpanded ? '▲' : '▼'}</span>
          </button>
          {namesExpanded && (
            <ul style={{ margin: '8px 0 0', padding: '0 0 0 16px', color: '#4a4540', lineHeight: 1.8 }}>
              {selectedPlantings.map(p => <li key={p.id}>{p.seed_name}</li>)}
            </ul>
          )}
        </div>

        {modalError && (
          <div style={{ background: '#fef2f2', color: '#dc2626', padding: '8px 12px', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
            {modalError}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Event Type <span style={{ color: '#dc2626' }}>*</span></label>
          <select className="form-input" value={editData.event_type || ''} onChange={e => { setModalError(null); setEditData(d => ({ ...d, event_type: e.target.value })); }}>
            <option value="">Select type...</option>
            {BULK_EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Date</label>
          <input type="date" className="form-input" value={editData.event_date || today} onChange={e => setEditData(d => ({ ...d, event_date: e.target.value }))} />
        </div>

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

        <div className="form-group">
          <label className="form-label">Attach Photo <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(optional — one copy stored, linked to all plantings)</span></label>
          <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', marginBottom: 6 }}>
            📷 Choose Photo
            <input type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => setEditData(d => ({ ...d, _photos: e.target.files[0] ? [e.target.files[0]] : [] }))} />
          </label>
          {editData._photos?.length > 0 && (
            <div style={{ fontSize: 12, color: '#16a34a', marginTop: 4 }}>
              ✓ {editData._photos[0].name}
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={onSubmit}>
            Log Event for {count} planting{count !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
