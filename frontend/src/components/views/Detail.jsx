import React from 'react';
import { STATUS_LABELS, EVENT_TYPES } from '../../lib/constants';
import { catColor, statusColor } from '../../lib/colors';
import { formatDate } from '../../lib/formatters';
import EmptyState from '../common/EmptyState';

const MILESTONES = [
  { key: 'indoor_start_date',  label: '🏠 Started Indoors', color: '#7c3aed' },
  { key: 'hardening_date',     label: '🌤️ Hardening Off',   color: '#f59e0b' },
  { key: 'transplant_date',    label: '🏡 Transplanted',     color: '#16a34a' },
  { key: 'direct_sow_date',    label: '🌿 Direct Sowed',     color: '#059669' },
  { key: 'first_harvest_date', label: '🍅 First Harvest',    color: '#ca8a04' },
];

const MO_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function Detail({
  selectedPlanting,
  seeds,
  plantingPhotos,
  setView,
  backView = 'plantings',
  handleDuplicatePlanting,
  handleDeleteEvent,
  handleDeletePhoto,
  setEditData,
  setShowModal,
  setLightboxIndex,
}) {
  if (!selectedPlanting) return null;
  const p = selectedPlanting;
  const seed = seeds.find(s => s.id === p.seed_id);

  // Photos linked to a specific event shown inline with that event
  const eventPhotoMap = {};
  plantingPhotos.forEach((photo, idx) => {
    if (photo.event_id) {
      if (!eventPhotoMap[photo.event_id]) eventPhotoMap[photo.event_id] = [];
      eventPhotoMap[photo.event_id].push({ photo, idx });
    }
  });
  const standalonePhotos = plantingPhotos.map((photo, idx) => ({ photo, idx })).filter(({ photo }) => !photo.event_id);

  const timelineEntries = [
    ...MILESTONES.filter(m => p[m.key]).map(m => ({ type: 'milestone', date: p[m.key], label: m.label, color: m.color })),
    ...(p.events || []).map(ev => ({ type: 'event', date: ev.event_date, ev })),
    ...standalonePhotos.map(({ photo, idx }) => ({ type: 'photo', date: photo.taken_date, photo, idx })),
  ].filter(e => e.date).sort((a, b) => a.date.localeCompare(b.date));

  const today = new Date().toISOString().split('T')[0];

  const allDates = [
    p.indoor_start_date, p.direct_sow_date, p.hardening_date,
    p.transplant_date, p.first_harvest_date,
    ...(p.events || []).map(e => e.event_date),
    ...plantingPhotos.map(ph => ph.taken_date),
  ].filter(Boolean).sort();

  // Gantt chart date range calculation
  const buildGanttMonths = () => {
    if (allDates.length === 0) return null;
    const earliest = allDates[0];
    const latest = allDates[allDates.length - 1];
    const startD = new Date(earliest + 'T00:00:00');
    const endD = new Date(latest + 'T00:00:00');

    let sYear = startD.getFullYear(), sMo = startD.getMonth() - 1;
    if (sMo < 0) { sMo = 11; sYear--; }
    let eYear = endD.getFullYear(), eMo = endD.getMonth() + 1;
    if (eMo > 11) { eMo = 0; eYear++; }

    const months = [];
    let yr = sYear, mo = sMo;
    while (yr < eYear || (yr === eYear && mo <= eMo)) {
      months.push({ year: yr, month: mo });
      mo++;
      if (mo > 11) { mo = 0; yr++; }
    }
    while (months.length < 4) {
      const last = months[months.length - 1];
      const nm = last.month === 11 ? 0 : last.month + 1;
      const ny = last.month === 11 ? last.year + 1 : last.year;
      months.push({ year: ny, month: nm });
    }
    return months;
  };

  const months = buildGanttMonths();
  const rangeStart = months ? new Date(months[0].year, months[0].month, 1) : null;
  const rangeEnd = months ? new Date(months[months.length - 1].year, months[months.length - 1].month + 1, 0) : null;
  const totalDays = rangeStart && rangeEnd ? Math.floor((rangeEnd - rangeStart) / 86400000) + 1 : 1;

  const datePct = (dateStr) => {
    if (!dateStr || !rangeStart) return null;
    const d = new Date(dateStr + 'T00:00:00');
    const offset = Math.floor((d - rangeStart) / 86400000);
    return Math.max(0, Math.min(100, (offset / totalDays) * 100));
  };

  const latest = allDates[allDates.length - 1];
  const bars = [];
  if (p.indoor_start_date) {
    const s = datePct(p.indoor_start_date);
    const e = datePct(p.hardening_date || p.transplant_date || p.indoor_start_date);
    if (s !== null) bars.push({ left: s, width: Math.max(e - s, 1.5), color: '#8b5cf6', label: '🏠 Started Indoors', projected: false });
  }
  if (p.hardening_date) {
    const s = datePct(p.hardening_date);
    const e = datePct(p.transplant_date || p.hardening_date);
    if (s !== null) bars.push({ left: s, width: Math.max(e - s, 1.5), color: '#f59e0b', label: '🌤️ Hardening Off', projected: false });
  }
  if (p.transplant_date || p.direct_sow_date) {
    const startDate = p.transplant_date || p.direct_sow_date;
    const isProj = new Date(startDate + 'T00:00:00') > new Date();
    const s = datePct(startDate);
    const e = datePct(p.first_harvest_date || latest);
    if (s !== null) bars.push({ left: s, width: Math.max(e - s, 2), color: '#16a34a', label: isProj ? '🌿 Growing (projected)' : '🌿 Growing', projected: isProj });
  }

  const germEvents = (p.events || []).filter(e => e.event_type === 'germinated').sort((a, b) => a.event_date.localeCompare(b.event_date));
  const totalGerm = germEvents.reduce((s, e) => s + (e.quantity || 0), 0);
  const expectedRate = seed?.germ_rate;
  const actualRate = p.qty_started ? Math.round(totalGerm / p.qty_started * 100) : null;

  return (
    <div>
      <button className="btn btn-secondary" style={{ marginBottom: 16 }} onClick={() => setView(backView)}>
        {backView === 'bed-planner' ? '← Back to Bed Planner' : '← Back to Plantings'}
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">{p.seed_name}</h1>
          <p className="page-sub">
            <span className="badge badge-category" style={{ background: catColor(p.category) }}>{p.category}</span>
            {p.organic ? <span className="badge badge-organic" style={{ marginLeft: 8 }}>Organic</span> : null}
            {p.structure_name && <span style={{ marginLeft: 12 }}>📍 {p.structure_name}</span>}
            {p.supplier && <span style={{ marginLeft: 12 }}>🏪 {p.supplier}</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => { setEditData(p); setShowModal('edit-planting'); }}>Edit</button>
          <button className="btn btn-secondary" onClick={() => { handleDuplicatePlanting(p.id); }}>Duplicate</button>
          <button className="btn btn-primary" onClick={() => { setEditData({ event_date: new Date().toISOString().split('T')[0], event_type: 'note' }); setShowModal('event'); }}>+ Log Event</button>
          <button className="btn btn-primary" onClick={() => setShowModal('photo')}>📷 Add Photo</button>
        </div>
      </div>

      <div>
        {/* Dates card */}
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 16 }}>Key Dates</h3>
          <div className="grid-2" style={{ gap: 12 }}>
            {[
              ['indoor_start_date', '🏠 Started Indoors'],
              ['hardening_date', '🌤️ Hardening Off'],
              ['transplant_date', '🏡 Transplanted'],
              ['direct_sow_date', '🌿 Direct Sowed'],
              ['purchased_date', '🛒 Purchased'],
              ['planted_out_date', '🌳 Planted Out'],
              ['first_harvest_date', '🍅 First Harvest'],
            ].filter(([key]) => p[key]).map(([key, label]) => (
              <div key={key} style={{ padding: '8px 12px', background: p[key] ? '#faf8f5' : 'transparent', borderRadius: 8, border: p[key] ? '1px solid #e8e4dd' : '1px dashed #e8e4dd' }}>
                <div style={{ fontSize: 11, color: '#8a8580', marginBottom: 2 }}>{label}</div>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{p[key] ? formatDate(p[key]) : 'Not set'}</div>
              </div>
            ))}
            <div style={{ padding: '8px 12px', background: '#faf8f5', borderRadius: 8, border: '1px solid #e8e4dd' }}>
              <div style={{ fontSize: 11, color: '#8a8580', marginBottom: 2 }}>Status</div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>
                <span className="status-dot" style={{ background: statusColor(p.status) }}></span>
                {STATUS_LABELS[p.status] || p.status}
              </div>
            </div>
          </div>
          {p.notes && <div style={{ marginTop: 16, padding: 12, background: '#faf8f5', borderRadius: 8, fontSize: 13 }}>{p.notes}</div>}
        </div>

        {/* Seed details */}
        {seed && (
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 12 }}>Seed Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px', fontSize: 13 }}>
              <div><span style={{ color: '#8a8580' }}>Species:</span> <em>{seed.species}</em></div>
              <div><span style={{ color: '#8a8580' }}>Days to Maturity:</span> {seed.days_to_maturity}</div>
              <div><span style={{ color: '#8a8580' }}>Germination:</span> {seed.germ_rate}%</div>
              <div><span style={{ color: '#8a8580' }}>Lot:</span> {seed.lot}</div>
              <div><span style={{ color: '#8a8580' }}>SKU:</span> {seed.sku}</div>
              <div><span style={{ color: '#8a8580' }}>Supplier:</span> {seed.supplier}</div>
            </div>
          </div>
        )}

        {/* Germination log */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Germination</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => { setEditData({ event_date: new Date().toISOString().split('T')[0], event_type: 'germinated' }); setShowModal('event'); }}>+ Log</button>
          </div>
          <div style={{ display: 'flex', gap: 16, marginBottom: germEvents.length ? 12 : 0 }}>
            <div style={{ flex: 1, padding: '8px 12px', background: '#faf8f5', borderRadius: 8, border: '1px solid #e8e4dd' }}>
              <div style={{ fontSize: 11, color: '#8a8580', marginBottom: 2 }}>Expected</div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{expectedRate != null ? `${expectedRate}%` : '—'}</div>
            </div>
            <div style={{ flex: 1, padding: '8px 12px', background: actualRate == null ? 'transparent' : actualRate >= (expectedRate || 0) ? '#f0fdf4' : actualRate >= (expectedRate || 0) * 0.5 ? '#fffbeb' : '#fef2f2', borderRadius: 8, border: `1px solid ${actualRate == null ? '#e8e4dd' : actualRate >= (expectedRate || 0) ? '#bbf7d0' : actualRate >= (expectedRate || 0) * 0.5 ? '#fde68a' : '#fecaca'}` }}>
              <div style={{ fontSize: 11, color: '#8a8580', marginBottom: 2 }}>Actual</div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{actualRate != null ? `${actualRate}%` : '—'}</div>
              {totalGerm > 0 && <div style={{ fontSize: 11, color: '#8a8580' }}>{totalGerm} of {p.qty_started || '?'} sprouted</div>}
            </div>
          </div>
          {germEvents.length > 0 && (
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e8e4dd' }}>
                  <th style={{ textAlign: 'left', padding: '4px 0', color: '#8a8580', fontWeight: 500 }}>Date</th>
                  <th style={{ textAlign: 'right', padding: '4px 0', color: '#8a8580', fontWeight: 500 }}>Sprouted</th>
                  <th style={{ textAlign: 'right', padding: '4px 0', color: '#8a8580', fontWeight: 500 }}>Cumulative %</th>
                </tr>
              </thead>
              <tbody>
                {germEvents.reduce((acc, ev) => {
                  const running = (acc.running || 0) + (ev.quantity || 0);
                  const pct = p.qty_started ? Math.round(running / p.qty_started * 100) : null;
                  acc.rows.push(
                    <tr key={ev.id} style={{ borderBottom: '1px solid #f0ede8' }}>
                      <td style={{ padding: '5px 0' }}>{formatDate(ev.event_date)}</td>
                      <td style={{ textAlign: 'right', padding: '5px 0' }}>{ev.quantity ?? '—'}</td>
                      <td style={{ textAlign: 'right', padding: '5px 0', color: pct != null && pct >= (expectedRate || 0) ? '#16a34a' : '#8a8580' }}>{pct != null ? `${pct}%` : '—'}</td>
                    </tr>
                  );
                  acc.running = running;
                  return acc;
                }, { rows: [], running: 0 }).rows}
              </tbody>
            </table>
          )}
          {germEvents.length === 0 && (
            <div style={{ fontSize: 13, color: '#8a8580' }}>No germination events logged. Seeds not yet sprouted (or assumed 0%).</div>
          )}
        </div>
      </div>

      {/* Full-width Gantt Timeline */}
      {allDates.length === 0 ? (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Timeline</h3>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowModal('photo')}>📷</button>
              <button className="btn btn-secondary btn-sm" onClick={() => { setEditData({ event_date: today, event_type: 'note' }); setShowModal('event'); }}>+ Log Event</button>
            </div>
          </div>
          <EmptyState style={{ padding: 16 }} message="No dates or events yet. Add key dates to see the timeline." />
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Timeline</h3>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 10, marginRight: 8 }}>
                {[{ color: '#8b5cf6', label: 'Indoor' }, { color: '#f59e0b', label: 'Hardening' }, { color: '#16a34a', label: 'Outdoor' }].map(({ color, label }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#8a8580' }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: 'inline-block' }} />{label}
                  </div>
                ))}
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowModal('photo')}>📷</button>
              <button className="btn btn-secondary btn-sm" onClick={() => { setEditData({ event_date: today, event_type: 'note' }); setShowModal('event'); }}>+ Log Event</button>
            </div>
          </div>

          {/* Gantt chart */}
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 500 }}>
              {/* Month headers */}
              <div style={{ display: 'flex', marginBottom: 4 }}>
                {months.map(({ year, month }) => (
                  <div key={`${year}-${month}`} style={{ flex: 1, fontSize: 11, color: '#8a8580', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                    {MO_NAMES[month]}
                  </div>
                ))}
              </div>

              {/* Phase bars */}
              <div className="cal-track" style={{ background: '#faf8f5', borderRadius: 4, border: '1px solid #f0ece6', marginBottom: 6 }}>
                {months.map(({ year, month }) => <div key={`${year}-${month}`} className="cal-month" />)}
                {bars.map((bar, i) => (
                  <div key={i} className="cal-bar" style={{
                    left: bar.left + '%', width: bar.width + '%',
                    background: bar.projected ? `${bar.color}30` : bar.color,
                    border: bar.projected ? `2px dashed ${bar.color}` : 'none',
                    boxSizing: bar.projected ? 'border-box' : undefined,
                  }} title={bar.label} />
                ))}
              </div>

              {/* Event / milestone / photo marker row */}
              <div style={{ position: 'relative', height: 20, marginBottom: 12 }}>
                <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
                  {months.map(({ year, month }) => (
                    <div key={`${year}-${month}`} style={{ flex: 1, borderRight: '1px solid #e8e4dd' }} />
                  ))}
                </div>
                {timelineEntries.map((entry, i) => {
                  const pct = datePct(entry.date);
                  if (pct === null) return null;
                  const isFuture = entry.date > today;
                  if (entry.type === 'milestone') {
                    return (
                      <div key={`m-${i}`} title={`${entry.label}: ${formatDate(entry.date)}`} style={{
                        position: 'absolute', left: `${pct}%`, top: '50%',
                        transform: 'translate(-50%, -50%) rotate(45deg)',
                        width: 9, height: 9, borderRadius: 2, background: entry.color, zIndex: 2,
                        border: '1.5px solid white', opacity: isFuture ? 0.4 : 1,
                      }} />
                    );
                  }
                  if (entry.type === 'event') {
                    const evType = EVENT_TYPES.find(t => t.value === entry.ev.event_type);
                    const tip = `${evType?.label || entry.ev.event_type}: ${formatDate(entry.ev.event_date)}${entry.ev.details ? ' — ' + entry.ev.details.slice(0, 60) : ''}`;
                    return (
                      <div key={`ev-${entry.ev.id}`} title={tip} style={{
                        position: 'absolute', left: `${pct}%`, top: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 8, height: 8, borderRadius: '50%',
                        background: evType?.color || '#6b7280', zIndex: 2, border: '1.5px solid white',
                        opacity: isFuture ? 0.4 : 1,
                      }} />
                    );
                  }
                  if (entry.type === 'photo') {
                    return (
                      <div key={`ph-${entry.photo.id}`}
                        title={`📷 Photo: ${formatDate(entry.photo.taken_date)}${entry.photo.caption ? ' — ' + entry.photo.caption : ''}`}
                        onClick={() => setLightboxIndex(entry.idx)}
                        style={{
                          position: 'absolute', left: `${pct}%`, top: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: 8, height: 8, borderRadius: '50%',
                          background: '#94a3b8', zIndex: 2, border: '1.5px solid white', cursor: 'pointer',
                          opacity: isFuture ? 0.4 : 1,
                        }} />
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          </div>

          {/* Chronological event list */}
          <div style={{ borderTop: '1px solid #f0ece6', paddingTop: 12 }}>
            {timelineEntries.map((entry, i) => {
              const isFuture = entry.date > today;
              const futureStyle = isFuture ? { opacity: 0.45 } : {};
              if (entry.type === 'milestone') {
                return (
                  <div key={`m-${entry.date}-${i}`} className="timeline-item" style={futureStyle}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: entry.color, transform: 'rotate(45deg)', marginTop: 3, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div className="timeline-date">{formatDate(entry.date)}</div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{entry.label}</div>
                    </div>
                  </div>
                );
              }
              if (entry.type === 'event') {
                const ev = entry.ev;
                const evType = EVENT_TYPES.find(t => t.value === ev.event_type);
                const eventActions = (
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 8, opacity: 0, transition: 'opacity 0.15s' }} className="event-actions">
                    <button title="Edit" onClick={() => { setEditData({ ...ev }); setShowModal('event'); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a8580', padding: '2px 4px', fontSize: 13, borderRadius: 4 }}>✏️</button>
                    <button title="Delete" onClick={() => { if (window.confirm('Delete this event?')) handleDeleteEvent(ev.id); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '2px 4px', fontSize: 13, borderRadius: 4 }}>🗑</button>
                  </div>
                );
                const linkedPhotos = eventPhotoMap[ev.id] || [];
                const inlinePhotos = linkedPhotos.length > 0 ? (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                    {linkedPhotos.map(({ photo, idx }) => (
                      <div key={photo.id} style={{ position: 'relative', display: 'inline-block' }}>
                        <img
                          src={`/photos/${photo.filename}`}
                          style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6, cursor: 'pointer', border: '1px solid #e8e4dd', display: 'block' }}
                          onClick={() => setLightboxIndex(idx)}
                        />
                        <button title="Delete photo" onClick={() => { if (window.confirm('Delete this photo?')) handleDeletePhoto(photo.id); }}
                          style={{ position: 'absolute', top: 3, right: 3, width: 18, height: 18, borderRadius: '50%', background: 'rgba(220,38,38,0.8)', border: 'none', color: '#fff', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                      </div>
                    ))}
                  </div>
                ) : null;

                if (ev.event_type === 'note') {
                  return (
                    <div key={`ev-${ev.id}`} className="timeline-item event-row" style={futureStyle}>
                      <div className="timeline-dot" style={{ background: '#c4b8a8' }} />
                      <div style={{ flex: 1 }}>
                        <div className="timeline-date">{formatDate(ev.event_date)}</div>
                        <div style={{ fontSize: 13, color: '#4a4540', fontStyle: 'italic' }}>{ev.details}</div>
                        {inlinePhotos}
                      </div>
                      {eventActions}
                    </div>
                  );
                }
                return (
                  <div key={`ev-${ev.id}`} className="timeline-item event-row" style={futureStyle}>
                    <div className="timeline-dot" style={{ background: evType?.color || '#6b7280' }} />
                    <div style={{ flex: 1 }}>
                      <div className="timeline-date">{formatDate(ev.event_date)}</div>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{evType?.label || ev.event_type}</div>
                      {ev.quantity != null && ev.event_type === 'germinated' && <div style={{ fontSize: 11, color: '#8a8580' }}>{ev.quantity} sprouted</div>}
                      {ev.details && <div className="timeline-detail">{ev.details}</div>}
                      {ev.product_used && <div style={{ fontSize: 11, color: '#8a8580', marginTop: 2 }}>Product: {ev.product_used}</div>}
                      {ev.severity && <div style={{ fontSize: 11, color: ev.severity === 'high' ? '#dc2626' : ev.severity === 'medium' ? '#f59e0b' : '#16a34a', marginTop: 2 }}>Severity: {ev.severity}</div>}
                      {inlinePhotos}
                    </div>
                    {eventActions}
                  </div>
                );
              }
              if (entry.type === 'photo') {
                return (
                  <div key={`ph-${entry.photo.id}`} className="timeline-item" style={{ alignItems: 'flex-start', ...futureStyle }}>
                    <div className="timeline-dot" style={{ background: '#94a3b8', marginTop: 6 }} />
                    <div style={{ flex: 1 }}>
                      <div className="timeline-date">{formatDate(entry.photo.taken_date)}</div>
                      <div style={{ position: 'relative', display: 'inline-block', marginTop: 4 }}>
                        <img
                          src={`/photos/${entry.photo.filename}`}
                          style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 6, cursor: 'pointer', border: '1px solid #e8e4dd', display: 'block' }}
                          onClick={() => setLightboxIndex(entry.idx)}
                        />
                        <button
                          title="Delete photo"
                          onClick={() => { if (window.confirm('Delete this photo?')) handleDeletePhoto(entry.photo.id); }}
                          style={{ position: 'absolute', top: 3, right: 3, width: 20, height: 20, borderRadius: '50%', background: 'rgba(220,38,38,0.8)', border: 'none', color: '#fff', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>✕</button>
                      </div>
                      {entry.photo.caption && <div style={{ fontSize: 11, color: '#8a8580', marginTop: 4 }}>{entry.photo.caption}</div>}
                    </div>
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
