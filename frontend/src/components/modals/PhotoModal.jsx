import React from 'react';

export default function PhotoModal({ onSubmit, onClose }) {
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">Upload Photos</h3>
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label className="form-label">Photos (select one or multiple)</label>
            <input type="file" name="file" accept="image/*" multiple className="form-input" required />
          </div>
          <div className="form-group">
            <label className="form-label">Date Taken</label>
            <input type="date" name="taken_date" className="form-input" defaultValue={today} />
          </div>
          <div className="form-group">
            <label className="form-label">Caption (optional)</label>
            <input type="text" name="caption" className="form-input" placeholder="What are we looking at..." />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Upload</button>
          </div>
        </form>
      </div>
    </div>
  );
}
