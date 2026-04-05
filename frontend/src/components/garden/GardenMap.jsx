import React, { useRef, useState } from 'react';
import { catColor } from '../../lib/colors';

export default function GardenMap({
  structures,
  plantings,
  seeds,
  mapGridCells,
  labelPositions,
  setLabelPositions,
  mapZoom,
  mapEditMode,
  showMapThumbs,
  mapHighlight,
  draggingLabel,
  setDraggingLabel,
  setIsDirtyLabels,
  openBedPlanner,
  openPlantPanel,
}) {
  const mapSvgRef = useRef(null);
  const [hoveredImg, setHoveredImg] = useState(null);

  const W = 680, H = 880;
  const PX_PER_FT = 26;
  const CELL_SIZE = 6; // 6-inch grid cells (matches bed planner)

  const MAP_BG = '#4a6e42';
  const MAP_PATIO = '#c8b89a';
  const BED_FILL = '#f8f4ec';
  const BOX_FILL = '#f2ede3';
  const BED_BORDER = '#7a5c40';
  const BOX_BORDER = '#9a8070';
  const FENCE = '#2a2420';
  const STRIP_FILL = '#9a8060';

  const getSVGCoords = (e) => {
    const svg = mapSvgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (W / rect.width), y: (e.clientY - rect.top) * (H / rect.height) };
  };

  const startDrag = (e, key, curX, curY) => {
    e.stopPropagation();
    const coords = getSVGCoords(e);
    setDraggingLabel({ key, offsetX: coords.x - curX, offsetY: coords.y - curY });
  };

  return (
    <div className="garden-map" style={{ overflowY: 'auto', overflowX: 'auto' }}>
      <svg ref={mapSvgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: mapZoom === 1 ? '100%' : `${W * mapZoom}px`, height: 'auto', display: 'block', cursor: draggingLabel ? 'grabbing' : 'default' }}
        xmlns="http://www.w3.org/2000/svg"
        onMouseMove={e => {
          if (!draggingLabel) return;
          const coords = getSVGCoords(e);
          setLabelPositions(prev => ({ ...prev, [draggingLabel.key]: { x: coords.x - draggingLabel.offsetX, y: coords.y - draggingLabel.offsetY } }));
          setIsDirtyLabels(true);
        }}
        onMouseUp={() => setDraggingLabel(null)}
        onMouseLeave={() => setDraggingLabel(null)}>

        {/* Garden ground */}
        <rect x="20" y="20" width="640" height="840" fill={MAP_BG} rx="8"/>
        {/* Patio / top deck */}
        <rect x="20" y="20" width="640" height="100" fill={MAP_PATIO} opacity="0.55" rx="8"/>
        {/* Right fence */}
        <rect x="640" y="120" width="20" height="740" fill={FENCE} opacity="0.8"/>
        {/* Left path strip */}
        <rect x="20" y="200" width="30" height="400" fill="#6a5a3a" opacity="0.2" rx="4"/>

        {/* Pass 1: bed backgrounds and grid cells */}
        {structures.map(s => {
          const x = s.map_x;
          const y = s.map_y;
          const w = s.width * PX_PER_FT;
          const h = s.length * PX_PER_FT;
          const isBox = s.type === 'box';
          const isStrip = s.type === 'strip';
          const isBed = s.type === 'bed';
          const isHighlighted = mapHighlight === s.id;
          const cx = x + w / 2;
          const cy = y + h / 2;

          const rx = isStrip ? 2 : (isBox ? 3 : 4);
          const bedFill = isStrip ? STRIP_FILL : (isBox ? BOX_FILL : BED_FILL);
          const stroke = isHighlighted ? '#e8c56d' : (isBox ? BOX_BORDER : BED_BORDER);
          const strokeWidth = isHighlighted ? 2.5 : (isBed ? 2 : 1.5);

          const bedCols = Math.floor(s.width * 12 / CELL_SIZE);
          const bedRows = Math.floor(s.length * 12 / CELL_SIZE);
          const cellPxW = bedCols > 0 ? w / bedCols : w;
          const cellPxH = bedRows > 0 ? h / bedRows : h;

          const cells = mapGridCells[s.id] || [];
          const hasCells = cells.length > 0;

          const pInfoMap = {};
          cells.forEach(c => {
            if (!pInfoMap[c.planting_id]) {
              const p = plantings.find(pl => pl.id === c.planting_id);
              const seed = p ? seeds.find(sd => sd.id === p.seed_id) : null;
              pInfoMap[c.planting_id] = {
                color: catColor(p?.category),
                imgUrl: showMapThumbs ? seed?.image_url : null,
              };
            }
          });

          return (
            <g key={s.id} className="map-bed" onClick={() => {
              const structObj = structures.find(st => st.id === s.id);
              if (structObj) openBedPlanner(structObj);
            }}>
              <rect x={x} y={y} width={w} height={h} fill={bedFill} stroke={stroke} strokeWidth={strokeWidth} rx={rx}/>
              {isBed && <>
                <rect x={x-2} y={y-2} width={7} height={7} fill={BED_BORDER} rx={1.5}/>
                <rect x={x+w-5} y={y-2} width={7} height={7} fill={BED_BORDER} rx={1.5}/>
                <rect x={x-2} y={y+h-5} width={7} height={7} fill={BED_BORDER} rx={1.5}/>
                <rect x={x+w-5} y={y+h-5} width={7} height={7} fill={BED_BORDER} rx={1.5}/>
              </>}
              {isStrip && (
                <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
                  fill="rgba(255,255,255,0.75)" fontSize={8} fontWeight="600" fontFamily="DM Sans"
                  transform={`rotate(-90,${cx},${cy})`}>{s.name}</text>
              )}
              {!isStrip && cells.map(c => {
                const info = pInfoMap[c.planting_id];
                const cellX = x + c.col * cellPxW;
                const cellY = y + c.row * cellPxH;
                return (
                  <g key={`${c.row}-${c.col}`}
                    onDoubleClick={e => { e.stopPropagation(); if (c.plant_guid) openPlantPanel(c.plant_guid); }}
                    onMouseEnter={e => { if (info?.imgUrl) setHoveredImg({ url: info.imgUrl, x: e.clientX + 14, y: e.clientY }); }}
                    onMouseLeave={() => setHoveredImg(null)}
                    style={{ cursor: c.plant_guid ? 'pointer' : 'default' }}>
                    {info?.imgUrl ? (
                      <>
                        <image href={info.imgUrl} x={cellX} y={cellY} width={cellPxW} height={cellPxH} preserveAspectRatio="xMidYMid slice"/>
                        <rect x={cellX} y={cellY} width={cellPxW} height={cellPxH} fill={info.color} opacity={0.4}/>
                      </>
                    ) : (
                      <rect x={cellX} y={cellY} width={cellPxW} height={cellPxH} fill={info?.color || '#888'} opacity={0.75}/>
                    )}
                    {c.short_label && cellPxW >= 14 && (
                      <text x={cellX + cellPxW / 2} y={cellY + cellPxH / 2}
                        textAnchor="middle" dominantBaseline="middle"
                        fill="#fff" fontSize={Math.min(cellPxW * 0.38, 7)}
                        fontFamily="DM Sans" fontWeight="700"
                        style={{ pointerEvents: 'none', filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.9))', userSelect: 'none' }}>
                        {c.short_label}
                      </text>
                    )}
                  </g>
                );
              })}
              {!isStrip && !hasCells && (
                <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
                  fill={isBox ? '#b8a898' : '#c4b8a8'} fontSize={isBox ? 7 : 8}
                  fontFamily="DM Sans" fontStyle="italic">empty</text>
              )}
            </g>
          );
        })}

        {/* Pass 2: all labels on top — never covered by bed backgrounds */}
        <g>
          {structures.map(s => {
            const x = s.map_x;
            const y = s.map_y;
            const w = s.width * PX_PER_FT;
            const h = s.length * PX_PER_FT;
            const isBox = s.type === 'box';
            const isStrip = s.type === 'strip';
            const cx = x + w / 2;

            const bedCols = Math.floor(s.width * 12 / CELL_SIZE);
            const bedRows = Math.floor(s.length * 12 / CELL_SIZE);
            const cellPxW = bedCols > 0 ? w / bedCols : w;
            const cellPxH = bedRows > 0 ? h / bedRows : h;

            const cells = mapGridCells[s.id] || [];
            // Group cells by display name so same-variety plantings share a cluster label
            const byName = {};
            cells.forEach(c => {
              const name = c.short_label || c.seed_name;
              if (!byName[name]) byName[name] = [];
              byName[name].push(c);
            });
            const plantingClusters = [];
            Object.entries(byName).forEach(([name, groupCells]) => {
              const minR = Math.min(...groupCells.map(c => c.row));
              const maxR = Math.max(...groupCells.map(c => c.row));
              const minC = Math.min(...groupCells.map(c => c.col));
              const maxC = Math.max(...groupCells.map(c => c.col));
              plantingClusters.push({ pid: name, name, minR, maxR, minC, maxC });
            });
            // Stagger labels whose column spans overlap (for below-bed placement)
            plantingClusters.forEach((cl, i) => {
              cl.stackIndex = 0;
              for (let j = 0; j < i; j++) {
                const other = plantingClusters[j];
                const colOverlap = !(cl.maxC < other.minC || cl.minC > other.maxC);
                if (colOverlap && other.stackIndex >= cl.stackIndex) {
                  cl.stackIndex = other.stackIndex + 1;
                }
              }
            });

            const toggleOrientation = (key) => {
              setLabelPositions(prev => {
                const cur = prev[key] || {};
                return { ...prev, [key]: { ...cur, orientation: (cur.orientation || 'horizontal') === 'horizontal' ? 'vertical' : 'horizontal' } };
              });
              setIsDirtyLabels(true);
            };
            const toggleHidden = (key, defaultPos) => {
              setLabelPositions(prev => {
                const cur = prev[key] || defaultPos;
                return { ...prev, [key]: { ...cur, hidden: !cur.hidden } };
              });
              setIsDirtyLabels(true);
            };
            const renderLabel = (key, lx, ly, defaultText, fill, fontSize, textAnchor, defaultPos) => {
              const pos = labelPositions[key] || defaultPos;
              const isHidden = pos.hidden;
              const isVertical = (pos.orientation || 'horizontal') === 'vertical';
              const displayText = pos.label_text || defaultText;
              const px = pos.x ?? lx, py = pos.y ?? ly;

              // View mode: hidden labels are invisible, visible labels render text-only
              if (!mapEditMode) {
                if (isHidden) return null;
                const transform = isVertical ? `rotate(-90,${px},${py})` : undefined;
                return (
                  <text key={key} x={px} y={py}
                    textAnchor={textAnchor} dominantBaseline="middle"
                    fill={fill} fontSize={fontSize} fontFamily="DM Sans" fontWeight="600"
                    transform={transform}
                    style={{ pointerEvents: 'none', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.9))', userSelect: 'none' }}>
                    {displayText}
                  </text>
                );
              }

              // Edit mode: hidden labels show as draggable dot
              if (isHidden) {
                return (
                  <g key={key}
                    onClick={e => { e.stopPropagation(); toggleHidden(key, defaultPos); }}
                    onMouseDown={e => startDrag(e, key, px, py)}
                    style={{ cursor: 'pointer' }}>
                    <circle cx={px} cy={py} r={5} fill={fill} opacity={0.6}/>
                    <circle cx={px} cy={py} r={5} fill="none" stroke={fill} strokeWidth={1} opacity={0.9}/>
                  </g>
                );
              }

              const transform = isVertical ? `rotate(-90,${px},${py})` : undefined;
              const btnOffset = textAnchor === 'middle'
                ? displayText.length * fontSize * 0.3 + 10
                : displayText.length * fontSize * 0.58 + 12;
              return (
                <g key={key}>
                  <text x={px} y={py}
                    textAnchor={textAnchor} dominantBaseline="middle"
                    fill={fill} fontSize={fontSize} fontFamily="DM Sans" fontWeight="600"
                    transform={transform}
                    style={{ cursor: 'grab', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.9))', userSelect: 'none' }}
                    onMouseDown={e => startDrag(e, key, px, py)}
                    onClick={e => e.stopPropagation()}
                    onDoubleClick={e => {
                      e.stopPropagation();
                      const newText = window.prompt('Label text:', displayText);
                      if (newText !== null) {
                        setLabelPositions(prev => ({ ...prev, [key]: { ...(prev[key] || defaultPos), label_text: newText.trim() || null } }));
                        setIsDirtyLabels(true);
                      }
                    }}>
                    {displayText}
                  </text>
                  {/* Toggle hide button */}
                  <g onClick={e => { e.stopPropagation(); toggleHidden(key, defaultPos); }}
                    style={{ cursor: 'pointer' }}>
                    <circle cx={px + btnOffset} cy={py} r={6} fill="#1f2937" opacity={0.75}/>
                    <text x={px + btnOffset} y={py} textAnchor="middle" dominantBaseline="middle"
                      fill="white" fontSize={8} fontFamily="DM Sans" fontWeight="700"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}>
                      –
                    </text>
                  </g>
                  {/* Toggle orientation button */}
                  <g onClick={e => { e.stopPropagation(); toggleOrientation(key); }}
                    style={{ cursor: 'pointer' }}>
                    <circle cx={px + btnOffset + 15} cy={py} r={6} fill="#1f2937" opacity={0.75}/>
                    <text x={px + btnOffset + 15} y={py} textAnchor="middle" dominantBaseline="middle"
                      fill="white" fontSize={8} fontFamily="DM Sans" fontWeight="700"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}>
                      {isVertical ? '↔' : '↕'}
                    </text>
                  </g>
                </g>
              );
            };

            return (
              <g key={s.id} style={{ pointerEvents: 'all' }}>
                {/* Structure name label — amber */}
                {!isStrip && (() => {
                  const sKey = `struct:${s.id}`;
                  return renderLabel(sKey, cx, y - 4, s.name, '#fbbf24', isBox ? 8 : 10, 'middle', { x: cx, y: y - 4, orientation: 'horizontal', hidden: false });
                })()}
                {/* Plant labels — one per cluster, mint green, with bracket + dashed leader line */}
                {!isStrip && plantingClusters.map(({ pid, name, minR, maxR, minC, maxC, stackIndex }) => {
                  const spanLeft = x + minC * cellPxW;
                  const spanRight = x + (maxC + 1) * cellPxW;
                  const clusterMidX = (spanLeft + spanRight) / 2;
                  const clusterBottom = y + (maxR + 1) * cellPxH;
                  const spanW = spanRight - spanLeft;
                  const defaultX = clusterMidX;
                  const defaultY = y + h + 10 + (stackIndex || 0) * 14;
                  const pKey = `cluster:${s.id}:${pid}:${minR}-${maxR}-${minC}-${maxC}`;
                  const pos = labelPositions[pKey] || {};
                  const isHidden = pos.hidden;
                  const lx = pos.x ?? defaultX;
                  const ly = pos.y ?? defaultY;
                  return (
                    <g key={pKey}>
                      {!isHidden && (
                        <g style={{ pointerEvents: 'none' }}>
                          {/* Column-span bracket at cluster bottom edge */}
                          {spanW > 3 && <>
                            <line x1={spanLeft + 1} y1={clusterBottom + 2} x2={spanRight - 1} y2={clusterBottom + 2}
                              stroke="#86efac" strokeWidth={1.2} opacity={0.5}/>
                            <line x1={spanLeft + 1} y1={clusterBottom} x2={spanLeft + 1} y2={clusterBottom + 4}
                              stroke="#86efac" strokeWidth={0.9} opacity={0.45}/>
                            <line x1={spanRight - 1} y1={clusterBottom} x2={spanRight - 1} y2={clusterBottom + 4}
                              stroke="#86efac" strokeWidth={0.9} opacity={0.45}/>
                          </>}
                          {/* Dashed leader from bracket midpoint to label */}
                          <line x1={clusterMidX} y1={clusterBottom + 4} x2={lx} y2={ly - 5}
                            stroke="#86efac" strokeWidth={0.8} opacity={0.35} strokeDasharray="2 3"/>
                        </g>
                      )}
                      {renderLabel(pKey, defaultX, defaultY, name, '#86efac', 8, 'middle', { x: defaultX, y: defaultY, orientation: 'horizontal', hidden: false })}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </g>

      </svg>
      {hoveredImg && (
        <div style={{
          position: 'fixed',
          top: hoveredImg.y,
          left: hoveredImg.x,
          transform: 'translateY(-50%)',
          zIndex: 9999,
          background: '#fff',
          borderRadius: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          padding: 4,
          pointerEvents: 'none',
        }}>
          <img src={hoveredImg.url} alt="" style={{ width: 180, height: 180, objectFit: 'cover', borderRadius: 8, display: 'block' }} />
        </div>
      )}
    </div>
  );
}
