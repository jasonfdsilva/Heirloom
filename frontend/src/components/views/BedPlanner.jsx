import React from 'react';
import { catColor } from '../../lib/colors';

export default function BedPlanner({
  selectedBed,
  setSelectedBed,
  gridCells,
  setGridCells,
  activePaintPlanting,
  setActivePaintPlanting,
  isDragging,
  setIsDragging,
  plantings,
  seeds,
  setEditData,
  setShowModal,
  openPlantPanel,
  handleCellPaint,
  handleCellDrag,
  handleClearPlanting,
  loadData,
  setView,
}) {
  if (!selectedBed) return null;
  const bed = selectedBed;
  const CELL_SIZE = 6; // 6 inch base grid
  const cols = Math.floor(bed.width * 12 / CELL_SIZE);
  const rows = Math.floor(bed.length * 12 / CELL_SIZE);
  const cellPx = Math.min(40, Math.floor(560 / Math.max(cols, 1)));
  const gridW = cols * cellPx;
  const gridH = rows * cellPx;

  // Plantings assigned to this bed
  const bedPlantings = plantings.filter(p => p.structure_id === bed.id);

  // Build cell lookup
  const cellMap = {};
  gridCells.forEach(c => {
    cellMap[`${c.row}-${c.col}`] = c;
  });

  // Count cells per planting
  const cellCounts = {};
  gridCells.forEach(c => {
    cellCounts[c.planting_id] = (cellCounts[c.planting_id] || 0) + 1;
  });

  return (
    <div>
      <button className="btn btn-secondary" style={{ marginBottom: 16 }} onClick={() => { setSelectedBed(null); setView('map'); }}>← Back to Garden Map</button>
      <div style={{ marginBottom: 16 }}>
        <h1 className="page-title">{bed.name} Planner</h1>
        <p className="page-sub">{bed.width}x{bed.length} ft, {cols}x{rows} grid (6" cells)</p>
      </div>

      <div style={{ display: 'flex', gap: 24 }}>
        {/* Grid */}
        <div>
          {(() => {
            // Build image map: planting_id → image_url (via seeds lookup)
            const plantingImageMap = {};
            plantings.forEach(p => {
              const seed = seeds.find(s => s.id === p.seed_id);
              if (seed?.image_url) plantingImageMap[p.id] = seed.image_url;
            });

            // Find leftmost cell per (planting, row) for labels — one label per row per planting
            const rowLabelMap = {};
            gridCells.forEach(cell => {
              const key = `${cell.planting_id}-${cell.row}`;
              if (!rowLabelMap[key] || cell.col < rowLabelMap[key].c) {
                rowLabelMap[key] = { r: cell.row, c: cell.col, name: cell.seed_name };
              }
            });
            const labelCells = Object.values(rowLabelMap);

            return (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <div style={{ border: '2px solid #5a4a2e', borderRadius: 4, display: 'inline-block', background: '#e8dcc8' }}>
                  {/* Column markers */}
                  <div style={{ display: 'flex', paddingLeft: 28 }}>
                    {Array.from({ length: cols }).map((_, c) => (
                      <div key={c} style={{ width: cellPx, textAlign: 'center', fontSize: 8, color: '#8a8580', height: 14, lineHeight: '14px' }}>
                        {(c * CELL_SIZE) % 12 === 0 ? `${c * CELL_SIZE / 12}ft` : ''}
                      </div>
                    ))}
                  </div>
                  {Array.from({ length: rows }).map((_, r) => (
                    <div key={r} style={{ display: 'flex' }}>
                      <div style={{ width: 28, fontSize: 8, color: '#8a8580', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 4 }}>
                        {(r * CELL_SIZE) % 12 === 0 ? `${r * CELL_SIZE / 12}ft` : ''}
                      </div>
                      {Array.from({ length: cols }).map((_, c) => {
                        const cell = cellMap[`${r}-${c}`];
                        const isActive = activePaintPlanting && cell && cell.planting_id === activePaintPlanting.id;
                        const imageUrl = cell ? plantingImageMap[cell.planting_id] : null;
                        const useThumb = imageUrl && cellPx >= 24;
                        return (
                          <div
                            key={c}
                            style={{
                              width: cellPx, height: cellPx,
                              border: '0.5px solid rgba(90,74,46,0.2)',
                              background: cell && !useThumb ? catColor(cell.category) : (!cell ? ((r + c) % 2 === 0 ? 'rgba(139,115,85,0.08)' : 'transparent') : 'transparent'),
                              backgroundImage: useThumb ? `url(${imageUrl})` : 'none',
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              opacity: cell ? 0.92 : 1,
                              cursor: activePaintPlanting ? 'crosshair' : 'default',
                              position: 'relative',
                              overflow: 'hidden',
                              outline: isActive ? '2px solid #e8c56d' : 'none',
                              transition: 'outline 0.1s',
                            }}
                            title={cell ? `${cell.short_id || ''} ${cell.seed_name}` : `Empty`}
                            onMouseDown={() => { setIsDragging(true); handleCellPaint(r, c); }}
                            onMouseEnter={() => handleCellDrag(r, c)}
                            onMouseUp={() => { setIsDragging(false); loadData(); }}
                            onDoubleClick={e => { e.stopPropagation(); if (!activePaintPlanting && cell?.plant_guid) openPlantPanel(cell.plant_guid); }}
                          >
                            {cell && useThumb && (
                              <div style={{ position: 'absolute', inset: 0, background: catColor(cell.category), opacity: 0.45 }} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
                {/* Plant name labels — one per row per planting at leftmost cell */}
                {cellPx >= 20 && labelCells.map(({ r, c, name }, i) => {
                  const TOP_OFFSET = 14; // column marker height
                  const top = TOP_OFFSET + r * cellPx + 2;
                  const left = 28 + c * cellPx + 2; // 28px = row gutter
                  return (
                    <div key={`label-${i}`} style={{
                      position: 'absolute', top, left,
                      background: 'rgba(20,16,12,0.72)', color: '#fff',
                      fontSize: 9, fontWeight: 600, letterSpacing: 0.2,
                      padding: '1px 5px', borderRadius: 4,
                      pointerEvents: 'none', whiteSpace: 'nowrap',
                      maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis',
                      zIndex: 2,
                    }}>
                      {name.length > 16 ? name.slice(0, 15) + '…' : name}
                    </div>
                  );
                })}
              </div>
            );
          })()}
          <div style={{ fontSize: 11, color: '#8a8580', marginTop: 8 }}>
            {activePaintPlanting ? `Painting: ${activePaintPlanting.seed_name}. Click or drag cells to fill. Click filled cells to erase.` : 'Select a planting from the sidebar to start painting.'}
          </div>
        </div>

        {/* Sidebar — unified paint palette */}
        <div style={{ width: 280, flexShrink: 0 }}>
          <div className="card" style={{ padding: 16, maxHeight: 580, overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h4 style={{ fontSize: 14, fontFamily: 'Fraunces, serif', margin: 0 }}>Paint Palette</h4>
              <button className="btn btn-primary btn-sm" onClick={() => setShowModal('quick-plant')}>+ New</button>
            </div>
            <div style={{ fontSize: 11, color: '#8a8580', marginBottom: 10 }}>Click a planting to select it, then paint cells on the grid. A planting can span multiple beds.</div>
            {plantings.length === 0 && (
              <div style={{ color: '#8a8580', fontSize: 13, padding: '12px 0' }}>No plantings yet. Create one to get started.</div>
            )}
            {(() => {
              const inThisBed = plantings.filter(p => (p.grid_structures || []).includes(bed.id));
              const notInThisBed = plantings.filter(p => !(p.grid_structures || []).includes(bed.id));
              const unassigned = notInThisBed.filter(p => (p.unplaced_count || 0) > 0);
              const otherBeds = notInThisBed.filter(p => (p.unplaced_count || 0) === 0 && (p.grid_structures || []).length > 0);

              // Group a list of plantings by category, sorted alpha within each category
              const groupByCategory = (list) => {
                const byCategory = {};
                list.forEach(p => {
                  const cat = p.category || 'Other';
                  if (!byCategory[cat]) byCategory[cat] = [];
                  byCategory[cat].push(p);
                });
                Object.values(byCategory).forEach(arr =>
                  arr.sort((a, b) => a.seed_name.localeCompare(b.seed_name))
                );
                return Object.entries(byCategory).sort(([a], [b]) => a.localeCompare(b));
              };

              // Detect if there are multiple plantings of the same seed in the same list
              const seedCounts = (list) => {
                const counts = {};
                list.forEach(p => { counts[p.seed_id] = (counts[p.seed_id] || 0) + 1; });
                return counts;
              };

              const renderPaintable = (p, showId = false) => {
                const isActive = activePaintPlanting?.id === p.id;
                const count = cellCounts[p.id] || 0;
                const seed = seeds.find(s => s.id === p.seed_id);
                const imageUrl = seed?.image_url;
                // Format start date short: "Mar 30"
                const startLabel = p.indoor_start_date
                  ? new Date(p.indoor_start_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : null;
                return (
                  <div key={p.id}
                    style={{
                      padding: '7px 10px', marginBottom: 5, borderRadius: 8, cursor: 'pointer',
                      border: isActive ? '2px solid #e8c56d' : '1px solid #e8e4dd',
                      background: isActive ? '#faf5e8' : '#fff',
                    }}
                    onClick={() => setActivePaintPlanting(isActive ? null : p)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {imageUrl ? (
                        <div style={{ width: 36, height: 36, borderRadius: 6, overflow: 'hidden', flexShrink: 0, position: 'relative', border: `2px solid ${catColor(p.category)}` }}>
                          <img src={imageUrl} alt={p.seed_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
                        </div>
                      ) : (
                        <div style={{ width: 36, height: 36, borderRadius: 6, background: catColor(p.category), flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                          🌱
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, minWidth: 0 }}>
                          <span style={{ fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.seed_name}</span>
                          {showId && <span style={{ fontSize: 10, color: '#a8a399', fontFamily: 'monospace', flexShrink: 0 }}>#{p.id}</span>}
                        </div>
                        <div style={{ fontSize: 11, color: '#8a8580', marginTop: 1 }}>
                          {seed?.spacing_inches || 12}" spacing
                          {p.qty_started != null && <span style={{ marginLeft: 5 }}>{p.qty_started} started</span>}
                          {startLabel && <span style={{ marginLeft: 5 }}>{startLabel}</span>}
                          {count > 0 && <span style={{ marginLeft: 5 }}>{count} cells</span>}
                          {p.unplaced_count > 0 && <span style={{ color: '#e8a020', marginLeft: 5 }}>{p.unplaced_count} unplaced</span>}
                        </div>
                      </div>
                    </div>
                    {isActive && count > 0 && (
                      <button className="btn btn-danger btn-sm" style={{ marginTop: 6, width: '100%' }} onClick={(e) => { e.stopPropagation(); handleClearPlanting(p.id); }}>Clear cells here</button>
                    )}
                  </div>
                );
              };

              const renderSection = (label, list, labelColor = '#8a8580') => {
                if (!list.length) return null;
                const counts = seedCounts(list);
                const groups = groupByCategory(list);
                return (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: labelColor, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 0 4px' }}>{label}</div>
                    {groups.map(([cat, catPlantings]) => (
                      <div key={cat}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 0 3px' }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: catColor(cat), display: 'inline-block', flexShrink: 0 }} />
                          <span style={{ fontSize: 10, color: catColor(cat), fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{cat}</span>
                        </div>
                        {catPlantings.map(p => renderPaintable(p, counts[p.seed_id] > 1))}
                      </div>
                    ))}
                  </div>
                );
              };

              return (
                <>
                  {renderSection(`In ${bed.name}`, inThisBed)}
                  {renderSection('Unassigned', unassigned, '#e8a020')}
                  {renderSection('Other Beds', otherBeds)}
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
