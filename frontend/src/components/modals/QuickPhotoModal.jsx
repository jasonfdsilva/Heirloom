import React from 'react';

export default function QuickPhotoModal({ selectedPlanting, onClose, onUpload }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal quick-action-modal" onClick={e => e.stopPropagation()}>
        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 12 }}>
          📷 Photo — {selectedPlanting?.seed_name}
        </div>
        <p style={{ fontSize: 13, color: '#8a8580', marginBottom: 16 }}>
          Select an image or tap to open your camera.
        </p>
        <input
          type="file"
          accept="image/*"
          style={{ fontSize: 14, marginBottom: 16, width: '100%', display: 'block' }}
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
          }}
        />
        <button className="btn btn-secondary" style={{ width: '100%' }} onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
