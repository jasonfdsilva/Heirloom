import React from 'react';

export default function EmptyState({ icon, message, style }) {
  return (
    <div className="empty" style={style}>
      {icon && <div className="empty-icon">{icon}</div>}
      <p>{message}</p>
    </div>
  );
}
