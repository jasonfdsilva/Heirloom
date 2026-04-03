import React from 'react';
import api from '../../lib/api';
import { PLANT_STATUSES } from '../../lib/constants';
import { formatDate } from '../../lib/formatters';

export default function PlantPanel({
  selectedPlantGuid,
  plantDetail, setPlantDetail,
  plantPanelLoading,
  plantHarvests, setPlantHarvests,
  plantPhotos, setPlantPhotos,
  closePlantPanel,
  refreshPlantMapCells,
  setLightboxPhoto,
  setEditData, setShowModal,
}) {
  return (
    <div className={`plant-panel ${selectedPlantGuid ? 'open' : ''}`}>
      <div className="plant-panel-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600 }}>
              {plantDetail?.short_id || (plantPanelLoading ? '…' : '—')}
            </div>
            <div style={{ fontSize: 13, color: '#8a8580', marginTop: 2 }}>
              {plantDetail?.seed_name}
              {plantDetail?.structure_name && <span style={{ color: '#ccc' }}> · {plantDetail.structure_name}</span>}
            </div>
          </div>
          <button onClick={closePlantPanel}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#8a8580', lineHeight: 1, padding: '0 0 0 12px' }}>✕</button>
        </div>
      </div>

      {plantPanelLoading && (
        <div style={{ padding: 28, color: '#8a8580', textAlign: 'center', fontSize: 13 }}>Loading plant details…</div>
      )}

      {!plantPanelLoading && plantDetail && (
        <>
          {/* ── This Plant ── */}
          <div className="plant-section-header individual">This Plant</div>
          <div className="plant-section-body">
            {/* Map label (short_label on the seed) */}
            <div className="form-group" style={{ marginBottom: 12 }}>
              <div className="form-label">Map Label <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>(shared with all {plantDetail.seed_name} plants)</span></div>
              <input type="text" className="form-input" maxLength={10}
                key={plantDetail.plant_guid + '-sl'}
                defaultValue={plantDetail.short_label || ''}
                placeholder={plantDetail.seed_name?.split(' ')[0]?.slice(0, 8) || 'e.g. Shishito'}
                onBlur={async e => {
                  const val = e.target.value.trim() || null;
                  await api.patch(`/api/seeds/${plantDetail.seed_id}/label`, { short_label: val });
                  setPlantDetail(d => ({ ...d, short_label: val }));
                  await refreshPlantMapCells(plantDetail.structure_id);
                }}
              />
            </div>
            {/* Health status */}
            <div className="form-group" style={{ marginBottom: 12 }}>
              <div className="form-label">Health Status</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {PLANT_STATUSES.map(s => (
                  <span key={s.value}
                    className={`status-pill ${plantDetail.plant_status === s.value ? 'active' : ''}`}
                    style={{ background: s.color + '20', color: s.color }}
                    onClick={async () => {
                      await api.patch(`/api/plants/${plantDetail.plant_guid}`, { plant_status: s.value });
                      setPlantDetail(d => ({ ...d, plant_status: s.value }));
                    }}>
                    {s.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Individual notes */}
            <div className="form-group" style={{ marginBottom: 12 }}>
              <div className="form-label">Notes for this plant</div>
              <textarea className="form-input" style={{ minHeight: 64, fontSize: 13 }}
                key={plantDetail.plant_guid}
                defaultValue={plantDetail.plant_notes || ''}
                onBlur={async e => {
                  const val = e.target.value;
                  await api.patch(`/api/plants/${plantDetail.plant_guid}`, { plant_notes: val });
                  setPlantDetail(d => ({ ...d, plant_notes: val }));
                }}
                placeholder="Observations specific to this plant…"
              />
            </div>

            {/* Label visibility */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, fontSize: 13 }}>
              <input type="checkbox"
                id="hide-label"
                checked={!plantDetail.label_visible}
                onChange={async e => {
                  const hidden = e.target.checked;
                  await api.patch(`/api/plants/${plantDetail.plant_guid}`, { label_visible: !hidden });
                  setPlantDetail(d => ({ ...d, label_visible: hidden ? 0 : 1 }));
                  await refreshPlantMapCells(plantDetail.structure_id);
                }}
              />
              <label htmlFor="hide-label" style={{ cursor: 'pointer', color: '#8a8580', fontSize: 12 }}>
                Hide label on map
              </label>
            </div>

            {/* Photos */}
            <div className="form-group" style={{ marginBottom: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div className="form-label" style={{ marginBottom: 0 }}>Photos</div>
                <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
                  + Add Photo
                  <input type="file" accept="image/*" multiple style={{ display: 'none' }}
                    onChange={async e => {
                      const files = e.target.files;
                      for (let i = 0; i < files.length; i++) {
                        const fd = new FormData();
                        fd.append('file', files[i]);
                        fd.append('taken_date', new Date().toISOString().split('T')[0]);
                        await api.upload(`/api/plants/${plantDetail.plant_guid}/photos`, fd);
                      }
                      const updated = await api.get(`/api/plants/${plantDetail.plant_guid}/photos`);
                      setPlantPhotos(updated);
                    }}
                  />
                </label>
              </div>
              {plantPhotos.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {plantPhotos.map(ph => (
                    <div key={ph.id} style={{ borderRadius: 6, overflow: 'hidden', border: '1px solid #e8e4dd', cursor: 'pointer' }}
                      onClick={() => setLightboxPhoto(ph)}>
                      <img src={`/photos/${ph.filename}`} alt={ph.caption || ''} style={{ width: '100%', height: 72, objectFit: 'cover', display: 'block' }} />
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#a8a399' }}>No photos yet.</div>
              )}
            </div>
          </div>

          {/* ── Harvest Log ── */}
          <div className="plant-section-header harvest">Harvest Log</div>
          <div className="plant-section-body">
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
              <button className="btn btn-secondary btn-sm"
                onClick={() => {
                  setEditData({ _harvestGuid: plantDetail.plant_guid, harvest_date: new Date().toISOString().split('T')[0] });
                  setShowModal('plant-harvest');
                }}>+ Add Harvest</button>
            </div>
            {plantHarvests.length === 0 && (
              <div style={{ fontSize: 12, color: '#a8a399', paddingBottom: 8 }}>No harvests recorded yet.</div>
            )}
            {plantHarvests.map(h => (
              <div key={h.id} style={{ padding: '6px 0', borderBottom: '1px solid #f0ece6', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{formatDate(h.harvest_date)}</div>
                  {(h.weight_oz || h.count) && (
                    <div style={{ fontSize: 11, color: '#8a8580' }}>
                      {h.count ? `${h.count} picked` : ''}
                      {h.count && h.weight_oz ? ' · ' : ''}
                      {h.weight_oz ? `${h.weight_oz} oz` : ''}
                    </div>
                  )}
                  {h.notes && <div style={{ fontSize: 11, color: '#8a8580' }}>{h.notes}</div>}
                </div>
                <button style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 13, flexShrink: 0 }}
                  onClick={async () => {
                    await api.del(`/api/plant-harvests/${h.id}`);
                    setPlantHarvests(prev => prev.filter(x => x.id !== h.id));
                  }}>✕</button>
              </div>
            ))}
          </div>

          {/* ── Family Notes ── */}
          <div className="plant-section-header family">Family Notes</div>
          <div className="plant-section-body" style={{ paddingBottom: 24 }}>
            <div style={{ fontSize: 11, color: '#b45309', marginBottom: 8 }}>
              Shared with all {plantDetail.seed_name} plants in this planting (#{plantDetail.planting_id})
            </div>
            <textarea className="form-input" style={{ minHeight: 80, fontSize: 13 }}
              key={`family-${plantDetail.planting_id}`}
              defaultValue={plantDetail.family_notes || ''}
              onBlur={async e => {
                const val = e.target.value;
                await api.patch(`/api/plantings/${plantDetail.planting_id}/family-notes`, { notes: val });
                setPlantDetail(d => ({ ...d, family_notes: val }));
              }}
              placeholder="Notes about this entire planting group…"
            />
          </div>
        </>
      )}
    </div>
  );
}
