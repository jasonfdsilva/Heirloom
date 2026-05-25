import React, { useEffect } from 'react';
import { catColor } from '../../lib/colors';

const PX_PER_FT = 26;
const MAP_W = 680;
const MAP_H = 880;
const CELL_SIZE = 6;
const BED_FILL = '#f8f4ec';
const BOX_FILL = '#f2ede3';
const STRIP_FILL = '#9a8060';
const BED_BORDER = '#7a5c40';
const BOX_BORDER = '#9a8070';

const LEGEND_CATS = [
  'Tomatoes', 'Peppers', 'Cucumbers', 'Leafy Greens', 'Herbs',
  'Brassicas', 'Beans', 'Squash', 'Root Vegetables', 'Flowers',
];

const METHOD_LABEL = { indoors: 'Indoors', direct: 'Direct', nursery: 'Nursery' };
const STATUS_LABEL = {
  planned: 'Planned', started: 'Started', transplanted: 'Transplanted',
  harvesting: 'Harvesting', done: 'Done', failed: 'Failed',
};

const TH = {
  padding: '3px 5px',
  textAlign: 'left',
  fontWeight: 700,
  fontSize: 9,
  borderBottom: '2px solid #c4b8a8',
  color: '#444',
  background: '#f8f4ec',
};
const TD = {
  padding: '2px 5px',
  borderBottom: '1px solid #f0ece6',
  verticalAlign: 'top',
  fontSize: 9,
};

function fmt(dateStr) {
  if (!dateStr) return '—';
  const [, m, d] = dateStr.split('-');
  return `${m}/${d}`;
}

function PrintMapSvg({ structures, mapGridCells, plantings, labelPositions }) {
  return (
    <svg
      viewBox={`0 0 ${MAP_W} ${MAP_H}`}
      className="print-map-svg"
      style={{ width: '100%', display: 'block' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Ground + patio */}
      <rect x="20" y="20" width="640" height="840" fill="#4a6e42" rx="8" />
      <rect x="20" y="20" width="640" height="100" fill="#c8b89a" opacity="0.55" rx="8" />
      {/* Right fence */}
      <rect x="640" y="120" width="20" height="740" fill="#2a2420" opacity="0.8" />

      {structures.map(s => {
        const x = s.map_x, y = s.map_y;
        const w = s.width * PX_PER_FT;
        const h = s.length * PX_PER_FT;
        const isBox = s.type === 'box';
        const isStrip = s.type === 'strip';
        const isBed = s.type === 'bed';
        const cx = x + w / 2, cy = y + h / 2;

        const rx = isStrip ? 2 : (isBox ? 3 : 4);
        const fill = isStrip ? STRIP_FILL : (isBox ? BOX_FILL : BED_FILL);
        const stroke = isBox ? BOX_BORDER : BED_BORDER;
        const strokeWidth = isBed ? 2 : 1.5;

        const bedCols = Math.floor(s.width * 12 / CELL_SIZE);
        const bedRows = Math.floor(s.length * 12 / CELL_SIZE);
        const cellPxW = bedCols > 0 ? w / bedCols : w;
        const cellPxH = bedRows > 0 ? h / bedRows : h;
        const cells = mapGridCells[s.id] || [];

        // Build color map once per planting_id
        const pColorMap = {};
        cells.forEach(c => {
          if (!pColorMap[c.planting_id]) {
            const p = plantings.find(pl => pl.id === c.planting_id);
            pColorMap[c.planting_id] = catColor(p?.category);
          }
        });

        // Build plant clusters: group cells by seed_name, track bounding box
        const byName = {};
        cells.forEach(c => {
          const name = c.short_label || c.seed_name || `P${c.planting_id}`;
          if (!byName[name]) byName[name] = [];
          byName[name].push(c);
        });
        const clusters = Object.entries(byName).map(([name, cs]) => ({
          name,
          minR: Math.min(...cs.map(c => c.row)),
          maxR: Math.max(...cs.map(c => c.row)),
          minC: Math.min(...cs.map(c => c.col)),
          maxC: Math.max(...cs.map(c => c.col)),
        }));
        // Stagger overlapping labels vertically
        clusters.forEach((cl, i) => {
          cl.stackIndex = 0;
          for (let j = 0; j < i; j++) {
            const other = clusters[j];
            if (!(cl.maxC < other.minC || cl.minC > other.maxC) && other.stackIndex >= cl.stackIndex) {
              cl.stackIndex = other.stackIndex + 1;
            }
          }
        });

        return (
          <g key={s.id}>
            {/* Structure background */}
            <rect x={x} y={y} width={w} height={h} fill={fill} stroke={stroke} strokeWidth={strokeWidth} rx={rx} />
            {/* Bed corner bolts */}
            {isBed && <>
              <rect x={x - 2} y={y - 2} width={7} height={7} fill={BED_BORDER} rx={1.5} />
              <rect x={x + w - 5} y={y - 2} width={7} height={7} fill={BED_BORDER} rx={1.5} />
              <rect x={x - 2} y={y + h - 5} width={7} height={7} fill={BED_BORDER} rx={1.5} />
              <rect x={x + w - 5} y={y + h - 5} width={7} height={7} fill={BED_BORDER} rx={1.5} />
            </>}
            {/* Colored grid cells */}
            {cells.map(c => (
              <rect
                key={`${c.row}-${c.col}`}
                x={x + c.col * cellPxW}
                y={y + c.row * cellPxH}
                width={cellPxW}
                height={cellPxH}
                fill={pColorMap[c.planting_id] || '#888'}
                opacity={0.75}
              />
            ))}
            {/* Structure name label — honour saved position/hidden */}
            {(() => {
              const sKey = `struct:${s.id}`;
              const sPos = (labelPositions && labelPositions[sKey]) || {};
              if (sPos.hidden) return null;
              const lx = sPos.x ?? cx;
              const ly = sPos.y ?? (y - 4);
              const isVertical = (sPos.orientation || 'horizontal') === 'vertical';
              if (isStrip) {
                return (
                  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
                    fill="rgba(255,255,255,0.85)" fontSize={8} fontWeight="600" fontFamily="sans-serif"
                    transform={`rotate(-90,${cx},${cy})`}>{s.name}</text>
                );
              }
              return (
                <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
                  fill="#fbbf24" fontSize={isBox ? 8 : 10} fontWeight="600" fontFamily="sans-serif"
                  transform={isVertical ? `rotate(-90,${lx},${ly})` : undefined}>
                  {sPos.label_text || s.name}
                </text>
              );
            })()}
            {/* Plant cluster labels — honour saved position/hidden */}
            {clusters.map(({ name, minR, minC, maxC, maxR, stackIndex }) => {
              const spanLeft = x + minC * cellPxW;
              const spanRight = x + (maxC + 1) * cellPxW;
              const spanW = spanRight - spanLeft;
              const clusterMidX = (spanLeft + spanRight) / 2;
              const clusterBottom = y + (maxR + 1) * cellPxH;
              const defaultX = clusterMidX;
              const defaultY = y + h + 10 + stackIndex * 13;
              const pKey = `cluster:${s.id}:${name}:${minR}-${maxR}-${minC}-${maxC}`;
              const pos = (labelPositions && labelPositions[pKey]) || {};
              if (pos.hidden) return null;
              const labelX = pos.x ?? defaultX;
              const labelY = pos.y ?? defaultY;
              return (
                <g key={name} style={{ pointerEvents: 'none' }}>
                  {/* Bracket */}
                  {spanW > 3 && <>
                    <line x1={spanLeft + 1} y1={clusterBottom + 2} x2={spanRight - 1} y2={clusterBottom + 2}
                      stroke="#86efac" strokeWidth={1.2} opacity={0.6} />
                    <line x1={spanLeft + 1} y1={clusterBottom} x2={spanLeft + 1} y2={clusterBottom + 4}
                      stroke="#86efac" strokeWidth={0.9} opacity={0.5} />
                    <line x1={spanRight - 1} y1={clusterBottom} x2={spanRight - 1} y2={clusterBottom + 4}
                      stroke="#86efac" strokeWidth={0.9} opacity={0.5} />
                  </>}
                  {/* Leader line */}
                  <line x1={clusterMidX} y1={clusterBottom + 4} x2={labelX} y2={labelY - 5}
                    stroke="#86efac" strokeWidth={0.8} opacity={0.4} strokeDasharray="2 3" />
                  {/* Name */}
                  <text x={labelX} y={labelY}
                    textAnchor="middle" dominantBaseline="middle"
                    fill="#86efac" fontSize={8} fontWeight="600" fontFamily="sans-serif"
                    style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.9))' }}>
                    {pos.label_text || name}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

export default function PrintView({ structures, plantings, seeds, mapGridCells, labelPositions, onClose }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Active placed plantings only, beds → boxes → strip order
  const activePlaced = plantings.filter(p => p.status !== 'failed' && p.structure_id);

  const typeOrder = { bed: 0, box: 1, strip: 2 };
  const sortedStructures = [...structures].sort((a, b) => {
    const td = (typeOrder[a.type] ?? 9) - (typeOrder[b.type] ?? 9);
    if (td !== 0) return td;
    return a.name.localeCompare(b.name, undefined, { numeric: true });
  });

  const byStructure = {};
  activePlaced.forEach(p => {
    (byStructure[p.structure_id] ??= []).push(p);
  });

  const filledStructures = sortedStructures.filter(s => byStructure[s.id]?.length);

  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="print-root-overlay" style={{ position: 'fixed', inset: 0, background: '#fff', zIndex: 9999, overflowY: 'auto' }}>
      <style>{`
        @media print {
          /* Hide every element on the page, then reveal only the print overlay */
          body * { visibility: hidden !important; }
          .print-root-overlay,
          .print-root-overlay * { visibility: visible !important; }
          /* Sit at document top without repeating (position:fixed repeats, position:static shows app behind) */
          .print-root-overlay {
            position: absolute !important;
            top: 0 !important; left: 0 !important; right: 0 !important; bottom: auto !important;
            width: 100% !important;
            overflow: visible !important;
            background: white !important;
          }
          .no-print { display: none !important; visibility: hidden !important; }
          .print-page-break { page-break-after: always; break-after: page; }
          .print-map-svg {
            width: 100% !important;
            height: auto !important;
            display: block !important;
          }
          @page { margin: 0.5in; size: portrait; }
          body { background: #fff !important; }
        }
        @media screen {
          .print-body { max-width: 760px; margin: 0 auto; padding: 24px 24px 48px; }
        }
      `}</style>

      {/* Screen-only toolbar */}
      <div
        className="no-print"
        style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: '#1c1a15', padding: '10px 20px',
          display: 'flex', gap: 10, alignItems: 'center',
        }}
      >
        <span style={{ color: '#e8c56d', fontWeight: 600, fontSize: 14, flex: 1 }}>
          🖨️ Print Preview
        </span>
        <button className="btn btn-primary" onClick={() => window.print()}>Print / Save PDF</button>
        <button className="btn btn-secondary" onClick={onClose}>✕ Close</button>
      </div>

      <div className="print-body">
        {/* ── PAGE 1: Garden Map ── */}
        <div className="print-page-break">
          {/* Compact single-line header — keeps vertical space for the map */}
          <p style={{ margin: '0 0 6px', fontSize: 11, fontFamily: 'sans-serif', fontWeight: 600, textAlign: 'center' }}>
            Heirloom Garden · 2026 Season · Berkeley Heights NJ · Zone 6b · {today}
          </p>
          <PrintMapSvg
            structures={structures}
            mapGridCells={mapGridCells}
            plantings={plantings}
            seeds={seeds}
            labelPositions={labelPositions}
          />
        </div>

        {/* ── PAGE 2: Planting Tables ── */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 6 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, fontFamily: 'sans-serif' }}>Planting Reference</h2>
              <p style={{ margin: '2px 0 0', fontSize: 10, color: '#666', fontFamily: 'sans-serif' }}>Placed · active · {today}</p>
            </div>
            {/* Color legend on page 2 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 10px', justifyContent: 'flex-end' }}>
              {LEGEND_CATS.map(cat => (
                <span key={cat} style={{ fontSize: 9, display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'sans-serif' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: catColor(cat), display: 'inline-block', flexShrink: 0 }} />
                  {cat}
                </span>
              ))}
            </div>
          </div>

          {filledStructures.length === 0 && (
            <p style={{ color: '#999', fontStyle: 'italic', fontSize: 11 }}>No plantings placed in any structure yet.</p>
          )}

          {filledStructures.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}>Plant</th>
                  <th style={{ ...TH, width: 30, textAlign: 'center' }}>Qty</th>
                  <th style={{ ...TH, width: 56 }}>Method</th>
                  <th style={{ ...TH, width: 48 }}>Indoors</th>
                  <th style={{ ...TH, width: 64 }}>Plant Out / Sow</th>
                  <th style={{ ...TH, width: 62 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filledStructures.flatMap(s => {
                  const ps = byStructure[s.id];
                  return [
                    <tr key={`div-${s.id}`}>
                      <td colSpan={6} style={{
                        fontWeight: 700, fontSize: 9, padding: '3px 5px',
                        borderTop: '2px solid #7a5c40', borderBottom: '1px solid #c4b8a8',
                        background: '#f0ece4', fontFamily: 'sans-serif',
                      }}>
                        {s.name}
                        <span style={{ fontWeight: 400, color: '#888', marginLeft: 6, fontSize: 8 }}>
                          {s.width}×{s.length} ft
                        </span>
                      </td>
                    </tr>,
                    ...ps.map((p, i) => {
                      const plantOut = p.transplant_date || p.direct_sow_date;
                      return (
                        <tr key={p.id} style={{ background: i % 2 === 0 ? '#fff' : '#faf8f5' }}>
                          <td style={TD}>
                            <span style={{ fontWeight: 600 }}>{p.seed_name}</span>
                            {p.common_name && p.common_name !== p.seed_name && (
                              <span style={{ color: '#888', fontSize: 8, marginLeft: 3 }}>({p.common_name})</span>
                            )}
                          </td>
                          <td style={{ ...TD, textAlign: 'center' }}>
                            {p.qty_planted ?? p.qty_started ?? p.quantity ?? '—'}
                          </td>
                          <td style={TD}>{METHOD_LABEL[p.method] || p.method || '—'}</td>
                          <td style={TD}>{fmt(p.indoor_start_date)}</td>
                          <td style={{ ...TD, fontWeight: 600 }}>{fmt(plantOut)}</td>
                          <td style={TD}>{STATUS_LABEL[p.status] || p.status}</td>
                        </tr>
                      );
                    }),
                  ];
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
