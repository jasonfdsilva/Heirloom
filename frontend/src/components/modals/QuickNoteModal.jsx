import React from 'react';

export default function QuickNoteModal({ selectedPlanting, editData, setEditData, onClose, onSave }) {
  return (
    <div className="modal-overlay" onClick={() => { onClose(); setEditData({}); }}>
      <div className="modal quick-action-modal" onClick={e => e.stopPropagation()}>
        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 12 }}>
          📝 Note — {selectedPlanting?.seed_name}
        </div>
        <textarea
          autoFocus
          placeholder="What's on your mind…"
          value={editData.details || ''}
          onChange={e => setEditData(d => ({ ...d, details: e.target.value }))}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => { onClose(); setEditData({}); }}>Cancel</button>
          <button className="btn btn-primary"
            disabled={!editData.details?.trim()}
            onClick={onSave}>
            Save Note
          </button>
        </div>
      </div>
    </div>
  );
}
