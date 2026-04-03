import React from 'react';
import { formatDate } from '../../lib/formatters';

const btnStyle = {
  border: 'none', color: '#fff', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

export default function Lightbox({ photos, index, onClose, onPrev, onNext, onDelete, titleKey }) {
  const photo = photos[index];
  if (!photo) return null;
  const total = photos.length;

  return (
    <div className="lightbox" onClick={onClose}>
      <button onClick={e => { e.stopPropagation(); onClose(); }}
        style={{ ...btnStyle, position: 'absolute', top: 16, left: 16, background: 'rgba(255,255,255,0.15)', fontSize: 20, width: 40, height: 40, borderRadius: '50%' }}>✕</button>

      {onDelete && (
        <button onClick={e => { e.stopPropagation(); if (window.confirm('Delete this photo?')) onDelete(photo.id); }}
          style={{ ...btnStyle, position: 'absolute', top: 16, right: 16, background: 'rgba(220,38,38,0.7)', fontSize: 16, width: 40, height: 40, borderRadius: '50%' }}
          title="Delete photo">🗑</button>
      )}

      {titleKey && photo[titleKey] && (
        <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.75)', fontSize: 13, pointerEvents: 'none', whiteSpace: 'nowrap' }}>{photo[titleKey]}</div>
      )}

      {index > 0 && (
        <button onClick={e => { e.stopPropagation(); onPrev(); }}
          style={{ ...btnStyle, position: 'absolute', left: 24, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', fontSize: 32, width: 52, height: 52, borderRadius: '50%' }}>‹</button>
      )}

      <img src={`/photos/${photo.filename}`} alt={photo.caption || ''} onClick={e => e.stopPropagation()} />

      {index < total - 1 && (
        <button onClick={e => { e.stopPropagation(); onNext(); }}
          style={{ ...btnStyle, position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', fontSize: 32, width: 52, height: 52, borderRadius: '50%' }}>›</button>
      )}

      <div style={{ position: 'absolute', bottom: 24, textAlign: 'center', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {photo.caption && <div className="lightbox-caption">{photo.caption}</div>}
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 }}>{index + 1} / {total} · {formatDate(photo.taken_date)}</div>
      </div>
    </div>
  );
}
