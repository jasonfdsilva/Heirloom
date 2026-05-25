import React, { useState } from 'react';
import api from '../../lib/api';
import { catColor } from '../../lib/colors';
import GardenMap from '../garden/GardenMap';
import PrintView from './PrintView';

export default function GardenMapView({
  // GardenMap props (forwarded)
  structures,
  plantings,
  seeds,
  mapGridCells,
  labelPositions,
  setLabelPositions,
  mapZoom,
  setMapZoom,
  mapEditMode,
  setMapEditMode,
  showMapThumbs,
  setShowMapThumbs,
  mapHighlight,
  setMapHighlight,
  draggingLabel,
  setDraggingLabel,
  isDirtyLabels,
  setIsDirtyLabels,
  openBedPlanner,
  openPlantPanel,
  // Structure summary
  plantingsByStructure,
}) {
  const [showPrint, setShowPrint] = useState(false);

  return (
    <div>
      {showPrint && (
        <PrintView
          structures={structures}
          plantings={plantings}
          seeds={seeds}
          mapGridCells={mapGridCells}
          labelPositions={labelPositions}
          onClose={() => setShowPrint(false)}
        />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 }}>
        <div>
          <h1 className="page-title">Garden Map</h1>
          <p className="page-sub" style={{ marginBottom: 0 }}>Click any bed or box to open the planner</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 24 }}>
          <button className="btn btn-secondary" onClick={() => setShowPrint(true)}>🖨️ Print</button>
          <button
            className="btn btn-secondary"
            style={{ background: mapEditMode ? '#2d2a24' : undefined, color: mapEditMode ? '#e8c56d' : undefined }}
            onClick={() => setMapEditMode(v => !v)}
          >
            {mapEditMode ? '✏️ Edit Mode' : '👁 View Mode'}
          </button>
          <button
            className="btn btn-secondary"
            style={{ background: showMapThumbs ? '#2d2a24' : undefined, color: showMapThumbs ? '#e8c56d' : undefined }}
            onClick={() => setShowMapThumbs(v => !v)}
          >
            {showMapThumbs ? '🖼️ Photos On' : '🎨 Show Photos'}
          </button>
          <button className="btn btn-secondary" onClick={() => setMapZoom(z => Math.min(z + 0.25, 2.5))} style={{ padding: '6px 12px', fontWeight: 700 }}>＋</button>
          <span style={{ fontSize: 12, color: '#8a8580', minWidth: 36, textAlign: 'center' }}>{Math.round(mapZoom * 100)}%</span>
          <button className="btn btn-secondary" onClick={() => setMapZoom(z => Math.max(z - 0.25, 0.5))} style={{ padding: '6px 12px', fontWeight: 700 }}>－</button>
          {isDirtyLabels && (
            <button className="btn btn-primary" onClick={async () => {
              const positions = Object.entries(labelPositions).map(([key, pos]) => {
                const colonIdx = key.indexOf(':');
                return { entity_type: key.slice(0, colonIdx), entity_id: key.slice(colonIdx + 1), label_x: pos.x, label_y: pos.y, orientation: pos.orientation || 'horizontal', hidden: !!pos.hidden, label_text: pos.label_text || null };
              });
              await api.put('/api/label-positions', positions);
              setIsDirtyLabels(false);
            }}>Save Labels</button>
          )}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div>
          <GardenMap
            structures={structures}
            plantings={plantings}
            seeds={seeds}
            mapGridCells={mapGridCells}
            labelPositions={labelPositions}
            setLabelPositions={setLabelPositions}
            mapZoom={mapZoom}
            mapEditMode={mapEditMode}
            showMapThumbs={showMapThumbs}
            mapHighlight={mapHighlight}
            draggingLabel={draggingLabel}
            setDraggingLabel={setDraggingLabel}
            setIsDirtyLabels={setIsDirtyLabels}
            openBedPlanner={openBedPlanner}
            openPlantPanel={openPlantPanel}
          />
        </div>
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 16 }}>Structure Summary</h3>
          {structures.map(s => {
            const planted = plantingsByStructure[s.id];
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f0ece6', gap: 8, cursor: 'pointer' }}
                onMouseEnter={() => setMapHighlight(s.id)} onMouseLeave={() => setMapHighlight(null)}
                onClick={() => openBedPlanner(s)}>
                <span style={{ fontWeight: 500, fontSize: 13, width: 80 }}>{s.name}</span>
                <span style={{ fontSize: 11, color: '#8a8580', width: 60 }}>{s.width}x{s.length} ft</span>
                <span style={{ fontSize: 12, flex: 1 }}>
                  {planted ? planted.map(p => (
                    <span key={p.id} className="badge badge-category" style={{ background: catColor(p.category), marginRight: 4, fontSize: 10 }}>{p.seed_name}</span>
                  )) : <span style={{ color: '#ccc' }}>Empty</span>}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
