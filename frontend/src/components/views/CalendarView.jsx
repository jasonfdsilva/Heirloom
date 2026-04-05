import React from 'react';
import { MONTHS } from '../../lib/constants';
import { catColor } from '../../lib/colors';
import EmptyState from '../common/EmptyState';
import { mergeBars, planningBars } from '../../lib/calendarUtils';

export default function CalendarView({ plantings, onPlantingClick }) {
  const startMonth = 1; // Feb
  const endMonth = 11;  // Dec

  // Group by seed_name, preserving sort order within each group
  const grouped = {};
  [...plantings]
    .sort((a, b) => a.seed_name.localeCompare(b.seed_name))
    .forEach(p => {
      if (!grouped[p.seed_name]) grouped[p.seed_name] = [];
      grouped[p.seed_name].push(p);
    });

  const varietyRows = Object.entries(grouped);

  return (
    <div>
      <h1 className="page-title">Planting Plan</h1>
      <p className="page-sub">Zone 6b · Last Frost: April 15 · Planning view — date fields only</p>
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
          <span style={{ width: 24, height: 12, borderRadius: 3, background: '#16a34a30', border: '2px dashed #16a34a', boxSizing: 'border-box', display: 'inline-block' }}></span> Planned
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
            {varietyRows.map(([seedName, group]) => {
              // Collect all bars from all plantings of this variety onto one track,
              // then merge overlapping same-colour bars so fills don't compound.
              const allBars = mergeBars(group.flatMap(p => planningBars(p, startMonth, endMonth)));
              const category = group[0].category;
              const color = catColor(category);

              return (
                <div key={seedName} className="cal-row"
                  onClick={() => onPlantingClick(group[0])}
                  style={{ cursor: 'pointer' }}>
                  <div className="cal-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }}></span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{seedName}</span>
                  </div>
                  <div className="cal-track" style={{ background: '#faf8f5', borderRadius: 4, border: '1px solid #f0ece6' }}>
                    {MONTHS.slice(startMonth, endMonth + 1).map(m => (
                      <div key={m} className="cal-month" />
                    ))}
                    {allBars.map((bar, i) => (
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
            <EmptyState icon="📅" message="No plantings yet. Add some plantings to see your plan." />
          )}
        </div>
      </div>
    </div>
  );
}
