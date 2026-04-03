import React from 'react';
import EmptyState from '../common/EmptyState';
import { formatDate } from '../../lib/formatters';
import { catColor } from '../../lib/colors';

const formatMonthHeader = (yyyymm) => {
  if (yyyymm === 'unknown') return 'Date Unknown';
  const [year, month] = yyyymm.split('-');
  const d = new Date(parseInt(year), parseInt(month) - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

export default function Photos({ allPhotos, photosGrouping, setPhotosGrouping, setPhotosLightboxIndex }) {
  if (allPhotos.length === 0) {
    return (
      <div>
        <h1 className="page-title">Photos</h1>
        <p className="page-sub">All garden photos across all plantings</p>
        <EmptyState icon="📷" message="No photos yet. Add photos from a planting's detail view or use the 📷 button on the Plants tab." />
      </div>
    );
  }

  const renderPhotoCard = (photo) => {
    const flatIndex = allPhotos.findIndex(p => p.id === photo.id);
    const label = photosGrouping === 'planting'
      ? formatDate(photo.taken_date)
      : (photo.seed_name || 'Unknown');
    return (
      <div key={photo.id} className="photo-thumb" onClick={() => setPhotosLightboxIndex(flatIndex)}>
        <img src={`/photos/${photo.filename}`} alt={photo.caption || ''} loading="lazy" />
        <div className="photo-thumb-info">
          {label && <div className="photo-thumb-label">{label}</div>}
          {photo.caption && <div className="photo-thumb-caption">{photo.caption}</div>}
        </div>
      </div>
    );
  };

  const timeGroups = (() => {
    const map = {};
    allPhotos.forEach(photo => {
      const key = photo.taken_date ? photo.taken_date.substring(0, 7) : 'unknown';
      if (!map[key]) map[key] = [];
      map[key].push(photo);
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  })();

  const categoryGroups = (() => {
    const plantingMap = {};
    allPhotos.forEach(photo => {
      const key = photo.planting_id ?? 'unknown';
      if (!plantingMap[key]) plantingMap[key] = { label: photo.seed_name || 'Unknown Planting', category: photo.category || 'Other', photos: [] };
      plantingMap[key].photos.push(photo);
    });
    const catMap = {};
    Object.entries(plantingMap).forEach(([pid, group]) => {
      const cat = group.category || 'Other';
      if (!catMap[cat]) catMap[cat] = [];
      catMap[cat].push({ pid, label: group.label, photos: group.photos });
    });
    return Object.entries(catMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([cat, plantings]) => ([cat, plantings.sort((a, b) => a.label.localeCompare(b.label))]));
  })();

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
        <div>
          <h1 className="page-title">Photos</h1>
          <p className="page-sub">{allPhotos.length} photo{allPhotos.length !== 1 ? 's' : ''} across all plantings</p>
        </div>
        <div className="photos-toggle">
          <button className={`photos-toggle-btn ${photosGrouping === 'time' ? 'active' : ''}`} onClick={() => setPhotosGrouping('time')}>By Time</button>
          <button className={`photos-toggle-btn ${photosGrouping === 'planting' ? 'active' : ''}`} onClick={() => setPhotosGrouping('planting')}>By Planting</button>
        </div>
      </div>

      {photosGrouping === 'time' && timeGroups.map(([monthKey, photos]) => (
        <div key={monthKey} className="photos-group">
          <div className="photos-group-header">
            {formatMonthHeader(monthKey)}
            <span className="photos-group-sub">{photos.length} photo{photos.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="photos-grid">{photos.map(renderPhotoCard)}</div>
        </div>
      ))}

      {photosGrouping === 'planting' && categoryGroups.map(([cat, plantingList]) => {
        const color = catColor(cat);
        const totalPhotos = plantingList.reduce((s, p) => s + p.photos.length, 0);
        return (
          <div key={cat} className="photos-group">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: color + '14', borderRadius: 8, marginBottom: 12, borderBottom: `2px solid ${color}30` }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
              <span style={{ fontWeight: 700, fontSize: 12, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{cat}</span>
              <span style={{ fontSize: 12, color: '#8a8580', fontWeight: 400 }}>
                {plantingList.length} {plantingList.length === 1 ? 'variety' : 'varieties'} · {totalPhotos} photo{totalPhotos !== 1 ? 's' : ''}
              </span>
            </div>
            {plantingList.map(({ pid, label, photos }) => (
              <div key={pid} style={{ marginBottom: 20, paddingLeft: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ fontWeight: 600, fontSize: 14, color: '#2d2a24' }}>{label}</span>
                  <span style={{ fontSize: 12, color: '#8a8580' }}>{photos.length} photo{photos.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="photos-grid">{photos.map(renderPhotoCard)}</div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
