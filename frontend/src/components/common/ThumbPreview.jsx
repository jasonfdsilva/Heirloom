import React, { useState } from 'react';

/**
 * Thumbnail image with a hover-to-preview popup (180×180).
 * Renders a colour placeholder when no url is provided.
 */
export default function ThumbPreview({ url, alt = '', color = '#888', opacity = 0.3, size = 44, locked = false }) {
  const [popup, setPopup] = useState(null);

  const handleEnter = (e) => {
    if (!url) return;
    const r = e.currentTarget.getBoundingClientRect();
    // Flip to left if the popup would overflow the right edge
    const x = r.right + 8 + 188 > window.innerWidth ? r.left - 188 : r.right + 8;
    setPopup({ x, y: r.top + r.height / 2 });
  };

  return (
    <div style={{ flexShrink: 0, position: 'relative' }} onMouseEnter={handleEnter} onMouseLeave={() => setPopup(null)}>
      {url ? (
        <img
          src={url} alt={alt}
          style={{ width: size, height: size, objectFit: 'cover', borderRadius: 6, display: 'block', border: '1px solid #e8e4dd' }}
          onError={e => { e.target.style.display = 'none'; }}
        />
      ) : (
        <div style={{ width: size, height: size, borderRadius: 6, background: color, opacity }} />
      )}
      {locked && (
        <div style={{
          position: 'absolute', bottom: -3, right: -3,
          background: '#2d2a24', color: '#fff',
          borderRadius: 4, fontSize: 9, padding: '1px 3px', lineHeight: 1.5,
          pointerEvents: 'none', zIndex: 1,
        }}>🔒</div>
      )}
      {popup && url && (
        <div style={{
          position: 'fixed',
          top: popup.y,
          left: popup.x,
          transform: 'translateY(-50%)',
          zIndex: 9999,
          background: '#fff',
          borderRadius: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          padding: 4,
          pointerEvents: 'none',
        }}>
          <img src={url} alt={alt} style={{ width: 180, height: 180, objectFit: 'cover', borderRadius: 8, display: 'block' }} />
        </div>
      )}
    </div>
  );
}
