import React from 'react';
import { MONTHS } from '../../lib/constants';
import { catColor } from '../../lib/colors';
import EmptyState from '../common/EmptyState';

const dateToPercent = (dateStr, startMonth = 1, endMonth = 11) => {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  const startDay = new Date(2026, startMonth, 1);
  const endDay = new Date(2026, endMonth + 1, 0);
  const totalDays = Math.floor((endDay - startDay) / 86400000);
  const offset = Math.floor((d - startDay) / 86400000);
  return Math.max(0, Math.min(100, (offset / totalDays) * 100));
};

export default function CalendarView({ plantings, onPlantingClick }) {
  const startMonth = 1; // Feb
  const endMonth = 11;  // Dec

  return (
    <div>
      <h1 className="page-title">Planting Calendar</h1>
      <p className="page-sub">Zone 6b, Last Frost: April 15</p>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: '#8b5cf6', display: 'inline-block' }}></span> Indoors
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: '#f59e0b', display: 'inline-block' }}></span> Hardening Off
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: '#16a34a', display: 'inline-block' }}></span> Growing / Transplanted
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: '#0891b2', display: 'inline-block' }}></span> Nursery
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <span style={{ width: 24, height: 12, borderRadius: 3, background: '#16a34a30', border: '2px dashed #16a34a', boxSizing: 'border-box', display: 'inline-block' }}></span> Projected
        </div>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 700 }}>
          <div className="cal-header">
            <div className="cal-header-label"></div>
            <div className="cal-header-months">
              {MONTHS.slice(startMonth, endMonth + 1).map(m => <span key={m}>{m}</span>)}
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            {plantings.map(p => {
              const bars = [];
              const method = p.method || 'indoors';
              const harvestEnd = p.first_harvest_date || '2026-09-30';

              if (method === 'indoors') {
                // Purple bar: indoor start → hardening or transplant
                if (p.indoor_start_date) {
                  const start = dateToPercent(p.indoor_start_date, startMonth, endMonth);
                  const end = dateToPercent(p.hardening_date || p.transplant_date || p.indoor_start_date, startMonth, endMonth);
                  if (start !== null) bars.push({ left: start, width: Math.max(end - start, 1.5), color: '#8b5cf6', label: 'Indoors' });
                }
                // Amber bar: hardening → transplant
                if (p.hardening_date) {
                  const start = dateToPercent(p.hardening_date, startMonth, endMonth);
                  const end = dateToPercent(p.transplant_date || p.hardening_date, startMonth, endMonth);
                  if (start !== null) bars.push({ left: start, width: Math.max(end - start, 1.5), color: '#f59e0b', label: 'Hardening Off' });
                }
                // Green bar: transplant → harvest
                if (p.transplant_date) {
                  const isProjected = new Date(p.transplant_date + 'T00:00:00') > new Date();
                  const start = dateToPercent(p.transplant_date, startMonth, endMonth);
                  const end = dateToPercent(harvestEnd, startMonth, endMonth);
                  if (start !== null) bars.push({ left: start, width: Math.max(end - start, 2), color: '#16a34a', label: isProjected ? 'Transplanted (projected)' : 'Transplanted', projected: isProjected });
                }
              } else if (method === 'direct') {
                // Find germination event date
                const germEvent = Array.isArray(p.events)
                  ? p.events.find(e => e.event_type === 'germinated')
                  : null;
                const germDate = germEvent ? germEvent.event_date : null;

                if (p.direct_sow_date) {
                  // Dashed green bar: sow date → germination (or sow+10 days)
                  const sowDateObj = new Date(p.direct_sow_date + 'T00:00:00');
                  const projGermDate = germDate || (() => {
                    const d = new Date(sowDateObj);
                    d.setDate(d.getDate() + 10);
                    return d.toISOString().split('T')[0];
                  })();
                  const start = dateToPercent(p.direct_sow_date, startMonth, endMonth);
                  const end = dateToPercent(projGermDate, startMonth, endMonth);
                  if (start !== null) bars.push({ left: start, width: Math.max(end - start, 1.5), color: '#16a34a', label: 'Sowed (projected germination)', projected: !germDate });

                  // Solid green bar: germination → harvest
                  if (germDate) {
                    const gStart = dateToPercent(germDate, startMonth, endMonth);
                    const gEnd = dateToPercent(harvestEnd, startMonth, endMonth);
                    if (gStart !== null) bars.push({ left: gStart, width: Math.max(gEnd - gStart, 2), color: '#16a34a', label: 'Growing' });
                  }
                }
              } else if (method === 'nursery') {
                // Teal bar: purchased → planted out
                if (p.purchased_date) {
                  const start = dateToPercent(p.purchased_date, startMonth, endMonth);
                  const end = dateToPercent(p.planted_out_date || p.purchased_date, startMonth, endMonth);
                  if (start !== null) bars.push({ left: start, width: Math.max(end - start, 1.5), color: '#0891b2', label: 'At Nursery / Purchased' });
                }
                // Green bar: planted out → harvest
                if (p.planted_out_date) {
                  const isProjected = new Date(p.planted_out_date + 'T00:00:00') > new Date();
                  const start = dateToPercent(p.planted_out_date, startMonth, endMonth);
                  const end = dateToPercent(harvestEnd, startMonth, endMonth);
                  if (start !== null) bars.push({ left: start, width: Math.max(end - start, 2), color: '#059669', label: isProjected ? 'Planted Out (projected)' : 'Planted Out', projected: isProjected });
                }
              }

              return (
                <div key={p.id} className="cal-row" onClick={() => onPlantingClick(p)} style={{ cursor: 'pointer' }}>
                  <div className="cal-label">
                    <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: catColor(p.category), marginRight: 6 }}></span>
                    {p.seed_name}
                  </div>
                  <div className="cal-track" style={{ background: '#faf8f5', borderRadius: 4, border: '1px solid #f0ece6' }}>
                    {MONTHS.slice(startMonth, endMonth + 1).map(m => (
                      <div key={m} className="cal-month" />
                    ))}
                    {bars.map((bar, i) => (
                      <div key={i} className="cal-bar" style={{
                        left: bar.left + '%',
                        width: bar.width + '%',
                        background: bar.projected ? `${bar.color}30` : bar.color,
                        border: bar.projected ? `2px dashed ${bar.color}` : 'none',
                        boxSizing: bar.projected ? 'border-box' : undefined,
                        opacity: 1,
                      }} title={bar.label} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {plantings.length === 0 && (
            <EmptyState icon="📅" message="No plantings yet. Add some plantings to see your calendar." />
          )}
        </div>
      </div>
    </div>
  );
}
