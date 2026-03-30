import React, { useState, useEffect, useCallback, useRef } from 'react'

// ── API helpers ──────────────────────────────────────────────────────────────

const api = {
  get: async (url) => { const r = await fetch(url); return r.json(); },
  post: async (url, data) => {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    return r.json();
  },
  put: async (url, data) => {
    const r = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    return r.json();
  },
  del: async (url) => { const r = await fetch(url, { method: 'DELETE' }); return r.json(); },
  upload: async (url, formData) => {
    const r = await fetch(url, { method: 'POST', body: formData });
    return r.json();
  }
};

// ── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_COLORS = {
  Peppers: '#dc2626', Herbs: '#16a34a', Greens: '#65a30d', Tomatoes: '#ea580c',
  Beans: '#ca8a04', Brassicas: '#0891b2', Alliums: '#7c3aed',
  Cucurbits: '#059669', 'Root Vegetables': '#b45309',
};

const STATUS_LABELS = {
  planned: '📋 Planned', started: '🌱 Started Indoors', hardening: '🌤️ Hardening Off',
  transplanted: '🏡 Transplanted', growing: '🌿 Growing', harvesting: '🍅 Harvesting', done: '✅ Done'
};

const EVENT_TYPES = [
  { value: 'fertilize', label: '🧪 Fertilize', color: '#7c3aed' },
  { value: 'disease', label: '🦠 Disease', color: '#dc2626' },
  { value: 'pest', label: '🐛 Pest', color: '#ea580c' },
  { value: 'prune', label: '✂️ Prune', color: '#16a34a' },
  { value: 'water', label: '💧 Water', color: '#0891b2' },
  { value: 'harvest', label: '🧺 Harvest', color: '#ca8a04' },
  { value: 'observation', label: '👁️ Observation', color: '#6b7280' },
  { value: 'weather', label: '⛈️ Weather', color: '#4b5563' },
];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'DM Sans', sans-serif; background: #f8f6f1; color: #2d2a24; }
  h1, h2, h3, h4 { font-family: 'Fraunces', serif; font-weight: 500; }

  .app { min-height: 100vh; }

  /* Nav */
  .nav { background: #2d2a24; padding: 0 24px; display: flex; align-items: center; gap: 0; height: 56px; position: sticky; top: 0; z-index: 100; }
  .nav-logo { font-family: 'Fraunces', serif; color: #e8c56d; font-size: 20px; font-weight: 700; margin-right: 32px; letter-spacing: -0.5px; }
  .nav-link { color: #a8a399; padding: 16px 16px; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; font-weight: 500; }
  .nav-link:hover { color: #f8f6f1; }
  .nav-link.active { color: #e8c56d; border-bottom-color: #e8c56d; }
  .nav-right { margin-left: auto; display: flex; gap: 8px; }
  .nav-btn { background: #3d3a34; color: #a8a399; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; font-family: 'DM Sans', sans-serif; }
  .nav-btn:hover { background: #4d4a44; color: #f8f6f1; }

  /* Layout */
  .content { max-width: 1280px; margin: 0 auto; padding: 24px; }
  .page-title { font-size: 28px; color: #2d2a24; margin-bottom: 4px; }
  .page-sub { color: #8a8580; font-size: 14px; margin-bottom: 24px; }

  /* Cards */
  .card { background: #fff; border-radius: 12px; border: 1px solid #e8e4dd; padding: 20px; margin-bottom: 16px; }
  .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
  .card-title { font-size: 18px; }

  /* Grid */
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
  .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }

  /* Stats */
  .stat-card { background: #fff; border-radius: 12px; border: 1px solid #e8e4dd; padding: 20px; }
  .stat-value { font-family: 'Fraunces', serif; font-size: 36px; font-weight: 700; color: #2d2a24; }
  .stat-label { color: #8a8580; font-size: 13px; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }

  /* Table */
  .table { width: 100%; border-collapse: collapse; }
  .table th { text-align: left; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #8a8580; border-bottom: 2px solid #e8e4dd; font-weight: 600; }
  .table td { padding: 10px 12px; border-bottom: 1px solid #f0ece6; font-size: 14px; vertical-align: middle; }
  .table tr:hover td { background: #faf8f5; }

  /* Badges */
  .badge { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 11px; font-weight: 600; letter-spacing: 0.3px; }
  .badge-organic { background: #d1fae5; color: #065f46; }
  .badge-category { padding: 3px 10px; border-radius: 99px; font-size: 11px; font-weight: 600; color: #fff; }

  /* Buttons */
  .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; border: none; font-family: 'DM Sans', sans-serif; transition: all 0.15s; }
  .btn-primary { background: #2d2a24; color: #f8f6f1; }
  .btn-primary:hover { background: #3d3a34; }
  .btn-secondary { background: #f0ece6; color: #2d2a24; }
  .btn-secondary:hover { background: #e8e4dd; }
  .btn-danger { background: #fef2f2; color: #dc2626; }
  .btn-danger:hover { background: #fee2e2; }
  .btn-sm { padding: 4px 10px; font-size: 12px; }

  /* Forms */
  .form-group { margin-bottom: 16px; }
  .form-label { display: block; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #8a8580; margin-bottom: 6px; }
  .form-input { width: 100%; padding: 8px 12px; border: 1px solid #e8e4dd; border-radius: 8px; font-size: 14px; font-family: 'DM Sans', sans-serif; background: #fff; }
  .form-input:focus { outline: none; border-color: #2d2a24; box-shadow: 0 0 0 3px rgba(45,42,36,0.1); }
  select.form-input { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%238a8580' d='M6 8L1 3h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px; }
  textarea.form-input { resize: vertical; min-height: 60px; }

  /* Modal */
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 24px; }
  .modal { background: #fff; border-radius: 16px; width: 100%; max-width: 560px; max-height: 90vh; overflow-y: auto; padding: 28px; }
  .modal-title { font-size: 22px; margin-bottom: 20px; }
  .modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px; }

  /* Garden Map */
  .garden-map { background: #4a7c4f; border-radius: 12px; padding: 20px; position: relative; overflow: hidden; }
  .garden-map svg { width: 100%; height: auto; }
  .map-bed { cursor: pointer; transition: opacity 0.2s; }
  .map-bed:hover { opacity: 0.85; }

  /* Calendar */
  .cal-row { display: flex; align-items: center; margin-bottom: 2px; }
  .cal-label { width: 180px; font-size: 12px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 8px; flex-shrink: 0; }
  .cal-track { flex: 1; display: flex; height: 24px; position: relative; }
  .cal-month { flex: 1; border-right: 1px solid #e8e4dd; }
  .cal-bar { position: absolute; height: 18px; top: 3px; border-radius: 4px; opacity: 0.85; }
  .cal-header { display: flex; margin-bottom: 8px; }
  .cal-header-label { width: 180px; flex-shrink: 0; }
  .cal-header-months { flex: 1; display: flex; }
  .cal-header-months span { flex: 1; font-size: 11px; color: #8a8580; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }

  /* Photo grid */
  .photo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
  .photo-card { border-radius: 8px; overflow: hidden; border: 1px solid #e8e4dd; cursor: pointer; }
  .photo-card img { width: 100%; height: 120px; object-fit: cover; display: block; }
  .photo-card-info { padding: 8px; font-size: 11px; color: #8a8580; }

  /* Photo lightbox */
  .lightbox { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 300; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; }
  .lightbox img { max-width: 90vw; max-height: 80vh; object-fit: contain; border-radius: 8px; }
  .lightbox-caption { color: #fff; margin-top: 12px; font-size: 14px; }

  /* Status dot */
  .status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 6px; }

  /* Detail sidebar */
  .detail-layout { display: grid; grid-template-columns: 1fr 360px; gap: 24px; }
  .timeline-item { display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid #f0ece6; }
  .timeline-dot { width: 10px; height: 10px; border-radius: 50%; margin-top: 4px; flex-shrink: 0; }
  .timeline-date { font-size: 11px; color: #8a8580; }
  .timeline-detail { font-size: 13px; }

  /* Empty state */
  .empty { text-align: center; padding: 48px 24px; color: #8a8580; }
  .empty-icon { font-size: 48px; margin-bottom: 12px; }

  @media (max-width: 768px) {
    .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; }
    .detail-layout { grid-template-columns: 1fr; }
    .cal-label { width: 100px; font-size: 10px; }
  }
`;

// ── App Component ────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState('dashboard');
  const [seeds, setSeeds] = useState([]);
  const [structures, setStructures] = useState([]);
  const [plantings, setPlantings] = useState([]);
  const [selectedPlanting, setSelectedPlanting] = useState(null);
  const [showModal, setShowModal] = useState(null); // 'planting', 'event', 'photo'
  const [editData, setEditData] = useState({});
  const [loading, setLoading] = useState(true);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [plantingPhotos, setPlantingPhotos] = useState([]);
  const [mapHighlight, setMapHighlight] = useState(null);
  const [selectedBed, setSelectedBed] = useState(null);
  const [gridCells, setGridCells] = useState([]);
  const [activePaintPlanting, setActivePaintPlanting] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [s, st, p] = await Promise.all([
        api.get('/api/seeds'),
        api.get('/api/structures'),
        api.get('/api/plantings?year=2026'),
      ]);
      setSeeds(s); setStructures(st); setPlantings(p);
    } catch (e) { console.error('Load failed:', e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const loadPhotos = async (plantingId) => {
    const photos = await api.get(`/api/plantings/${plantingId}/photos`);
    setPlantingPhotos(photos);
  };

  const openPlantingDetail = (p) => {
    setSelectedPlanting(p);
    loadPhotos(p.id);
    setView('detail');
  };

  // ── Handlers ─────────────────────────────────────────────────────────────

  const cleanPlantingData = (data) => {
    const clean = {};
    const allowed = ['seed_id', 'structure_id', 'year', 'quantity', 'indoor_start_date',
      'hardening_date', 'transplant_date', 'direct_sow_date', 'first_harvest_date', 'status', 'notes'];
    allowed.forEach(key => {
      if (data[key] !== undefined) clean[key] = data[key];
    });
    return clean;
  };

  const handleCreatePlanting = async () => {
    const payload = cleanPlantingData(editData);
    if (!payload.seed_id) return;
    await api.post('/api/plantings', payload);
    setShowModal(null); setEditData({});
    loadData();
  };

  const handleUpdatePlanting = async () => {
    if (!selectedPlanting) return;
    const payload = cleanPlantingData(editData);
    delete payload.seed_id; // don't change the seed on edit
    await api.put(`/api/plantings/${selectedPlanting.id}`, payload);
    setShowModal(null); setEditData({});
    loadData();
    const updated = await api.get('/api/plantings?year=2026');
    const refreshed = updated.find(p => p.id === selectedPlanting.id);
    if (refreshed) { setSelectedPlanting(refreshed); }
  };

  const handleDeletePlanting = async (id) => {
    if (!confirm('Delete this planting?')) return;
    await api.del(`/api/plantings/${id}`);
    if (selectedPlanting?.id === id) { setSelectedPlanting(null); setView('plantings'); }
    loadData();
  };

  const handleDuplicatePlanting = async (id) => {
    await api.post(`/api/plantings/${id}/duplicate`, {});
    loadData();
  };

  const handleCreateEvent = async () => {
    if (!selectedPlanting) return;
    const payload = {};
    ['event_date', 'event_type', 'details', 'severity', 'product_used'].forEach(k => {
      if (editData[k] !== undefined) payload[k] = editData[k];
    });
    await api.post(`/api/plantings/${selectedPlanting.id}/events`, payload);
    setShowModal(null); setEditData({});
    loadData();
    const updated = await api.get('/api/plantings?year=2026');
    const refreshed = updated.find(p => p.id === selectedPlanting.id);
    if (refreshed) setSelectedPlanting(refreshed);
  };

  const handleUploadPhoto = async (e) => {
    e.preventDefault();
    if (!selectedPlanting) return;
    const form = e.target;
    const files = form.querySelector('input[type="file"]').files;
    const takenDate = form.querySelector('input[name="taken_date"]').value;
    const caption = form.querySelector('input[name="caption"]').value;

    for (let i = 0; i < files.length; i++) {
      const formData = new FormData();
      formData.append('file', files[i]);
      formData.append('taken_date', takenDate);
      formData.append('caption', files.length === 1 ? caption : (caption ? `${caption} (${i + 1})` : ''));
      await api.upload(`/api/plantings/${selectedPlanting.id}/photos`, formData);
    }
    setShowModal(null);
    loadPhotos(selectedPlanting.id);
    loadData();
  };

  const handleExport = async () => {
    const data = await api.get('/api/export');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `heirloom-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const formData = new FormData();
      formData.append('file', file);
      await api.upload('/api/import', formData);
      loadData();
    };
    input.click();
  };

  // ── Computed ──────────────────────────────────────────────────────────────

  const categories = [...new Set(seeds.map(s => s.category))].sort();
  const plantingsByStructure = {};
  plantings.forEach(p => {
    if (p.structure_id) {
      if (!plantingsByStructure[p.structure_id]) plantingsByStructure[p.structure_id] = [];
      plantingsByStructure[p.structure_id].push(p);
    }
  });

  const activePlantings = plantings.filter(p => p.status !== 'done');
  const harvestingCount = plantings.filter(p => p.status === 'harvesting').length;

  // ── Suggested dates (Zone 6b, last frost April 15) ────────────────────────

  const getSuggestedDates = (seed) => {
    const lastFrost = new Date(2026, 3, 15);
    const dates = {};
    if (seed.start_indoors) {
      const indoor = new Date(lastFrost);
      indoor.setDate(indoor.getDate() - (seed.suggested_indoor_weeks || 6) * 7);
      dates.indoor_start_date = indoor.toISOString().split('T')[0];
      const harden = new Date(lastFrost);
      harden.setDate(harden.getDate() - 7);
      dates.hardening_date = harden.toISOString().split('T')[0];
      dates.transplant_date = lastFrost.toISOString().split('T')[0];
    }
    if (seed.direct_sow) {
      const sowDate = new Date(lastFrost);
      if (['Greens', 'Root Vegetables'].includes(seed.category)) {
        sowDate.setDate(sowDate.getDate() - 14); // cool season, sow 2 weeks before last frost
      }
      dates.direct_sow_date = sowDate.toISOString().split('T')[0];
    }
    return dates;
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const catColor = (cat) => CATEGORY_COLORS[cat] || '#6b7280';

  const statusColor = (status) => {
    const map = { planned: '#9ca3af', started: '#8b5cf6', hardening: '#f59e0b', transplanted: '#3b82f6', growing: '#16a34a', harvesting: '#ea580c', done: '#6b7280' };
    return map[status] || '#9ca3af';
  };

  const formatDate = (d) => {
    if (!d) return '';
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // ── Garden Map SVG ────────────────────────────────────────────────────────

  const renderGardenMap = () => {
    const W = 680, H = 880;
    const PX_PER_FT = 26;

    return (
      <div className="garden-map">
        <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg">
          <rect x="20" y="20" width="640" height="840" fill="#4a7c4f" rx="8"/>
          <rect x="20" y="20" width="640" height="100" fill="#c4a97d" opacity="0.35" rx="8"/>
          <rect x="640" y="120" width="20" height="740" fill="#1a1a1a" opacity="0.7"/>
          <rect x="20" y="200" width="30" height="400" fill="#8B6F47" opacity="0.3" rx="4"/>

          {structures.map(s => {
            const x = s.map_x;
            const y = s.map_y;
            const w = s.width * PX_PER_FT;
            const h = s.length * PX_PER_FT;
            const isBox = s.type === 'box';
            const isStrip = s.type === 'strip';
            const isBed = s.type === 'bed';
            const plantedHere = plantingsByStructure[s.id];
            const isHighlighted = mapHighlight === s.id;

            let fillColor, opacity;
            if (plantedHere) { fillColor = catColor(plantedHere[0].category); opacity = 0.9; }
            else if (isStrip) { fillColor = '#5a3e1b'; opacity = 0.5; }
            else if (isBed) { fillColor = '#8B7355'; opacity = 0.7; }
            else { fillColor = '#6B5B3E'; opacity = 0.6; }

            const isVertical = s.id === 'bed-7' || isStrip;

            return (
              <g key={s.id} className="map-bed" onClick={() => {
                const structObj = structures.find(st => st.id === s.id);
                if (structObj) openBedPlanner(structObj);
              }}>
                <rect x={x} y={y} width={w} height={h}
                  fill={fillColor}
                  stroke={isHighlighted ? '#e8c56d' : (isStrip ? '#4a3215' : '#5a4a2e')}
                  strokeWidth={isHighlighted ? 3 : (isStrip ? 0.5 : 1)}
                  strokeDasharray={isStrip ? '4 3' : 'none'}
                  rx={isStrip ? 2 : (isBox ? 3 : 4)}
                  opacity={opacity}
                />
                {isBed && <>
                  <rect x={x-2} y={y-2} width={8} height={8} fill="#5a4a2e" rx={2}/>
                  <rect x={x+w-6} y={y-2} width={8} height={8} fill="#5a4a2e" rx={2}/>
                  <rect x={x-2} y={y+h-6} width={8} height={8} fill="#5a4a2e" rx={2}/>
                  <rect x={x+w-6} y={y+h-6} width={8} height={8} fill="#5a4a2e" rx={2}/>
                </>}
                {isVertical ? (
                  <text x={x + w/2} y={y + h/2} textAnchor="middle" dominantBaseline="middle"
                    fill="#fff" fontSize={isStrip ? 10 : 12} fontWeight="500" fontFamily="DM Sans"
                    transform={`rotate(-90,${x + w/2},${y + h/2})`}>
                    {isStrip ? `Planting Strip ${s.width}x${s.length}` : `${s.name} ${s.width}x${s.length}`}
                  </text>
                ) : (
                  <>
                    <text x={x + w/2} y={y + h/2 - (plantedHere ? 6 : 0)} textAnchor="middle" dominantBaseline="middle"
                      fill="#fff" fontSize={isBox ? 9 : 13} fontWeight="500" fontFamily="DM Sans">
                      {s.name}
                    </text>
                    {!isBox && (
                      <text x={x + w/2} y={y + h/2 + 12} textAnchor="middle" dominantBaseline="middle"
                        fill="rgba(255,255,255,0.6)" fontSize={9} fontFamily="DM Sans">
                        {s.width}x{s.length}
                      </text>
                    )}
                  </>
                )}
                {plantedHere && !isVertical && (
                  <text x={x + w/2} y={y + h/2 + (isBox ? 10 : 24)} textAnchor="middle" dominantBaseline="middle"
                    fill="#e8c56d" fontSize={isBox ? 7 : 9} fontWeight="500" fontFamily="DM Sans">
                    {plantedHere.map(pp => pp.seed_name).join(', ').substring(0, 20)}
                  </text>
                )}
              </g>
            );
          })}

          <rect x={10} y={H-60} width={W-20} height={50} fill="rgba(0,0,0,0.3)" rx={8}/>
          {Object.entries(CATEGORY_COLORS).map(([cat, color], i) => (
            <g key={cat}>
              <rect x={20 + i * 72} y={H-45} width={10} height={10} fill={color} rx={2}/>
              <text x={34 + i * 72} y={H-36} fill="#fff" fontSize={8} fontFamily="DM Sans">{cat}</text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  // ── Calendar View ─────────────────────────────────────────────────────────

  const renderCalendar = () => {
    const startMonth = 1; // Feb
    const endMonth = 11; // Dec
    const monthRange = endMonth - startMonth + 1;

    const dateToPercent = (dateStr) => {
      if (!dateStr) return null;
      const d = new Date(dateStr + 'T00:00:00');
      const dayOfYear = Math.floor((d - new Date(2026, 0, 1)) / 86400000);
      const startDay = new Date(2026, startMonth, 1);
      const endDay = new Date(2026, endMonth + 1, 0);
      const totalDays = Math.floor((endDay - startDay) / 86400000);
      const offset = Math.floor((d - startDay) / 86400000);
      return Math.max(0, Math.min(100, (offset / totalDays) * 100));
    };

    return (
      <div className="card" style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 700 }}>
          <div className="cal-header">
            <div className="cal-header-label"></div>
            <div className="cal-header-months">
              {MONTHS.slice(startMonth, endMonth + 1).map(m => <span key={m}>{m}</span>)}
            </div>
          </div>

          {/* Today line */}
          <div style={{ position: 'relative' }}>
            {plantings.map(p => {
              const bars = [];
              if (p.indoor_start_date) {
                const start = dateToPercent(p.indoor_start_date);
                const end = dateToPercent(p.hardening_date || p.transplant_date || p.indoor_start_date);
                if (start !== null) bars.push({ left: start, width: Math.max(end - start, 1.5), color: '#8b5cf6', label: 'Indoor' });
              }
              if (p.hardening_date) {
                const start = dateToPercent(p.hardening_date);
                const end = dateToPercent(p.transplant_date || p.hardening_date);
                if (start !== null) bars.push({ left: start, width: Math.max(end - start, 1.5), color: '#f59e0b', label: 'Harden' });
              }
              if (p.transplant_date || p.direct_sow_date) {
                const startDate = p.transplant_date || p.direct_sow_date;
                const start = dateToPercent(startDate);
                const end = dateToPercent(p.first_harvest_date || startDate);
                if (start !== null) bars.push({ left: start, width: Math.max(end - start, 2), color: catColor(p.category), label: 'Growing' });
              }

              return (
                <div key={p.id} className="cal-row" onClick={() => openPlantingDetail(p)} style={{ cursor: 'pointer' }}>
                  <div className="cal-label">
                    <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: catColor(p.category), marginRight: 6 }}></span>
                    {p.seed_name}
                  </div>
                  <div className="cal-track" style={{ background: '#faf8f5', borderRadius: 4, border: '1px solid #f0ece6' }}>
                    {MONTHS.slice(startMonth, endMonth + 1).map((m, i) => (
                      <div key={m} className="cal-month" />
                    ))}
                    {bars.map((bar, i) => (
                      <div key={i} className="cal-bar" style={{ left: bar.left + '%', width: bar.width + '%', background: bar.color }} title={bar.label} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {plantings.length === 0 && (
            <div className="empty">
              <div className="empty-icon">📅</div>
              <p>No plantings yet. Add some plantings to see your calendar.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Modals ─────────────────────────────────────────────────────────────────

  const renderPlantingModal = (isEdit = false) => (
    <div className="modal-overlay" onClick={() => setShowModal(null)}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">{isEdit ? 'Edit Planting' : 'New Planting'}</h3>

        {!isEdit && (
          <div className="form-group">
            <label className="form-label">Seed or Plant Variety</label>
            {editData._addingCustom ? (
              <div style={{ border: '1px solid #e8e4dd', borderRadius: 8, padding: 16, background: '#faf8f5' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontWeight: 500, fontSize: 14 }}>Add Custom Variety</span>
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditData(d => ({ ...d, _addingCustom: false }))}>Cancel</button>
                </div>
                <div className="grid-2">
                  <div className="form-group" style={{ marginBottom: 8 }}>
                    <label className="form-label">Name *</label>
                    <input type="text" className="form-input" value={editData._customName || ''} onChange={e => setEditData(d => ({ ...d, _customName: e.target.value }))} placeholder="e.g., Cherokee Purple" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 8 }}>
                    <label className="form-label">Category *</label>
                    <select className="form-input" value={editData._customCategory || ''} onChange={e => setEditData(d => ({ ...d, _customCategory: e.target.value }))}>
                      <option value="">Select...</option>
                      {[...categories, 'Flowers', 'Fruit', 'Other'].filter((v, i, a) => a.indexOf(v) === i).map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="_custom">Other (type below)</option>
                    </select>
                    {editData._customCategory === '_custom' && (
                      <input type="text" className="form-input" style={{ marginTop: 4 }} value={editData._customCategoryText || ''} onChange={e => setEditData(d => ({ ...d, _customCategoryText: e.target.value }))} placeholder="Category name" />
                    )}
                  </div>
                  <div className="form-group" style={{ marginBottom: 8 }}>
                    <label className="form-label">Days to Maturity</label>
                    <input type="text" className="form-input" value={editData._customDays || ''} onChange={e => setEditData(d => ({ ...d, _customDays: e.target.value }))} placeholder="e.g., 75" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 8 }}>
                    <label className="form-label">Planting Method</label>
                    <select className="form-input" value={editData._customMethod || ''} onChange={e => setEditData(d => ({ ...d, _customMethod: e.target.value }))}>
                      <option value="">Select...</option>
                      <option value="indoor">Start Indoors</option>
                      <option value="direct">Direct Sow</option>
                      <option value="both">Both</option>
                      <option value="transplant">Transplant (bought starts)</option>
                    </select>
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 8 }}>
                  <label className="form-label">Supplier</label>
                  <input type="text" className="form-input" value={editData._customSupplier || ''} onChange={e => setEditData(d => ({ ...d, _customSupplier: e.target.value }))} placeholder="e.g., Local nursery, Home Depot" />
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="checkbox" checked={editData._customOrganic || false} onChange={e => setEditData(d => ({ ...d, _customOrganic: e.target.checked }))} /> Organic
                  </label>
                </div>
                <div style={{ marginTop: 12 }}>
                  <button className="btn btn-primary btn-sm" disabled={!editData._customName || (!editData._customCategory || (editData._customCategory === '_custom' && !editData._customCategoryText))} onClick={async () => {
                    const category = editData._customCategory === '_custom' ? editData._customCategoryText : editData._customCategory;
                    const method = editData._customMethod || '';
                    const res = await api.post('/api/seeds', {
                      name: editData._customName,
                      category: category,
                      days_to_maturity: editData._customDays || null,
                      organic: editData._customOrganic || false,
                      supplier: editData._customSupplier || null,
                      start_indoors: method === 'indoor' || method === 'both',
                      direct_sow: method === 'direct' || method === 'both',
                      suggested_indoor_weeks: (method === 'indoor' || method === 'both') ? 6 : 0,
                    });
                    if (res.id) {
                      const updatedSeeds = await api.get('/api/seeds');
                      setSeeds(updatedSeeds);
                      setEditData(d => ({
                        ...d,
                        seed_id: res.id,
                        _addingCustom: false,
                        _customName: '', _customCategory: '', _customCategoryText: '',
                        _customDays: '', _customMethod: '', _customSupplier: '', _customOrganic: false,
                      }));
                    }
                  }}>Save and Select</button>
                </div>
              </div>
            ) : (
              <div>
                <select className="form-input" value={editData.seed_id || ''} onChange={e => {
                  if (e.target.value === '_add_custom') {
                    setEditData(d => ({ ...d, _addingCustom: true, seed_id: '' }));
                    return;
                  }
                  const seed = seeds.find(s => s.id === e.target.value);
                  if (seed) {
                    const suggested = getSuggestedDates(seed);
                    setEditData(d => ({ ...d, seed_id: e.target.value, ...suggested }));
                  }
                }}>
                  <option value="">Select a variety...</option>
                  <option value="_add_custom">+ Add custom variety...</option>
                  {categories.map(cat => (
                    <optgroup key={cat} label={cat}>
                      {seeds.filter(s => s.category === cat).map(s => (
                        <option key={s.id} value={s.id}>{s.name} {s.organic ? '(OG)' : ''}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Assign to Bed/Box</label>
          <select className="form-input" value={editData.structure_id || ''} onChange={e => setEditData(d => ({ ...d, structure_id: e.target.value || null }))}>
            <option value="">Unassigned</option>
            <optgroup label="Beds">
              {structures.filter(s => s.type === 'bed').map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.width}x{s.length} ft)</option>
              ))}
            </optgroup>
            <optgroup label="Inground">
              {structures.filter(s => s.type === 'strip').map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.width}x{s.length} ft)</option>
              ))}
            </optgroup>
            <optgroup label="Boxes">
              {structures.filter(s => s.type === 'box').map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </optgroup>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Quantity</label>
          <input type="number" className="form-input" value={editData.quantity || ''} onChange={e => setEditData(d => ({ ...d, quantity: parseInt(e.target.value) || null }))} placeholder="Number of plants/seeds" />
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Start Indoors</label>
            <input type="date" className="form-input" value={editData.indoor_start_date || ''} onChange={e => setEditData(d => ({ ...d, indoor_start_date: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Harden Off</label>
            <input type="date" className="form-input" value={editData.hardening_date || ''} onChange={e => setEditData(d => ({ ...d, hardening_date: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Transplant</label>
            <input type="date" className="form-input" value={editData.transplant_date || ''} onChange={e => setEditData(d => ({ ...d, transplant_date: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Direct Sow</label>
            <input type="date" className="form-input" value={editData.direct_sow_date || ''} onChange={e => setEditData(d => ({ ...d, direct_sow_date: e.target.value }))} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">First Harvest</label>
          <input type="date" className="form-input" value={editData.first_harvest_date || ''} onChange={e => setEditData(d => ({ ...d, first_harvest_date: e.target.value }))} />
        </div>

        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-input" value={editData.status || 'planned'} onChange={e => setEditData(d => ({ ...d, status: e.target.value }))}>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea className="form-input" value={editData.notes || ''} onChange={e => setEditData(d => ({ ...d, notes: e.target.value }))} placeholder="Any observations..." />
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setShowModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={isEdit ? handleUpdatePlanting : handleCreatePlanting}>
            {isEdit ? 'Save Changes' : 'Create Planting'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderEventModal = () => (
    <div className="modal-overlay" onClick={() => setShowModal(null)}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">Log Event</h3>

        <div className="form-group">
          <label className="form-label">Event Type</label>
          <select className="form-input" value={editData.event_type || ''} onChange={e => setEditData(d => ({ ...d, event_type: e.target.value }))}>
            <option value="">Select type...</option>
            {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Date</label>
          <input type="date" className="form-input" value={editData.event_date || new Date().toISOString().split('T')[0]} onChange={e => setEditData(d => ({ ...d, event_date: e.target.value }))} />
        </div>

        {(editData.event_type === 'disease' || editData.event_type === 'pest') && (
          <div className="form-group">
            <label className="form-label">Severity</label>
            <select className="form-input" value={editData.severity || ''} onChange={e => setEditData(d => ({ ...d, severity: e.target.value }))}>
              <option value="">Select...</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        )}

        {(editData.event_type === 'fertilize' || editData.event_type === 'disease' || editData.event_type === 'pest') && (
          <div className="form-group">
            <label className="form-label">Product Used</label>
            <input type="text" className="form-input" value={editData.product_used || ''} onChange={e => setEditData(d => ({ ...d, product_used: e.target.value }))} placeholder="e.g., Fish emulsion, Neem oil..." />
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Details</label>
          <textarea className="form-input" value={editData.details || ''} onChange={e => setEditData(d => ({ ...d, details: e.target.value }))} placeholder="What happened..." />
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setShowModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreateEvent}>Log Event</button>
        </div>
      </div>
    </div>
  );

  const renderPhotoModal = () => (
    <div className="modal-overlay" onClick={() => setShowModal(null)}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">Upload Photos</h3>
        <form onSubmit={handleUploadPhoto}>
          <div className="form-group">
            <label className="form-label">Photos (select one or multiple)</label>
            <input type="file" name="file" accept="image/*" multiple className="form-input" required />
          </div>
          <div className="form-group">
            <label className="form-label">Date Taken</label>
            <input type="date" name="taken_date" className="form-input" defaultValue={new Date().toISOString().split('T')[0]} />
          </div>
          <div className="form-group">
            <label className="form-label">Caption (optional)</label>
            <input type="text" name="caption" className="form-input" placeholder="What are we looking at..." />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Upload</button>
          </div>
        </form>
      </div>
    </div>
  );

  // ── Views ──────────────────────────────────────────────────────────────────

  const renderDashboard = () => (
    <div>
      <h1 className="page-title">Heirloom</h1>
      <p className="page-sub">Garden Tracker, Berkeley Heights NJ, Zone 6b, 2026 Season</p>

      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-value">{seeds.length}</div>
          <div className="stat-label">Seed Varieties</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{plantings.length}</div>
          <div className="stat-label">Plantings</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{activePlantings.length}</div>
          <div className="stat-label">Active</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{harvestingCount}</div>
          <div className="stat-label">Harvesting</div>
        </div>
      </div>

      <div className="grid-2">
        <div>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Recent Plantings</h3>
              <button className="btn btn-primary btn-sm" onClick={() => { setEditData({}); setShowModal('planting'); }}>+ Add Planting</button>
            </div>
            {plantings.slice(0, 8).map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #f0ece6', cursor: 'pointer' }} onClick={() => openPlantingDetail(p)}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: statusColor(p.status) }}></span>
                <span style={{ flex: 1, fontWeight: 500, fontSize: 14 }}>{p.seed_name}</span>
                <span className="badge badge-category" style={{ background: catColor(p.category) }}>{p.category}</span>
                <span style={{ fontSize: 12, color: '#8a8580' }}>{p.structure_name || 'Unassigned'}</span>
              </div>
            ))}
            {plantings.length === 0 && (
              <div className="empty">
                <div className="empty-icon">🌱</div>
                <p>No plantings yet. Click "Add Planting" to get started!</p>
              </div>
            )}
          </div>
        </div>
        <div>
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 12 }}>Garden Overview</h3>
            {renderGardenMap()}
          </div>
        </div>
      </div>
    </div>
  );

  const renderSeeds = () => {
    const handleEditSeed = (seed) => {
      setEditData({
        _editingSeed: true,
        _seedId: seed.id,
        _seedName: seed.name,
        _seedCategory: seed.category,
        _seedSpecies: seed.species || '',
        _seedDays: seed.days_to_maturity || '',
        _seedOrganic: !!seed.organic,
        _seedSupplier: seed.supplier || '',
        _seedStartIndoors: !!seed.start_indoors,
        _seedDirectSow: !!seed.direct_sow,
        _seedIndoorWeeks: seed.suggested_indoor_weeks || 0,
        _seedGermRate: seed.germ_rate || '',
        _seedLot: seed.lot || '',
        _seedSku: seed.sku || '',
        _seedSpacing: seed.spacing_inches || 12,
      });
      setShowModal('edit-seed');
    };

    const handleSaveSeed = async () => {
      const cat = editData._seedCategory === '_custom' ? editData._seedCategoryText : editData._seedCategory;
      await api.put(`/api/seeds/${editData._seedId}`, {
        name: editData._seedName,
        category: cat,
        species: editData._seedSpecies || null,
        days_to_maturity: editData._seedDays || null,
        organic: editData._seedOrganic,
        supplier: editData._seedSupplier || null,
        start_indoors: editData._seedStartIndoors,
        direct_sow: editData._seedDirectSow,
        suggested_indoor_weeks: editData._seedIndoorWeeks || 0,
        spacing_inches: editData._seedSpacing || 12,
        germ_rate: editData._seedGermRate ? parseFloat(editData._seedGermRate) : null,
        lot: editData._seedLot || null,
        sku: editData._seedSku || null,
      });
      setShowModal(null);
      setEditData({});
      loadData();
    };

    return (
      <div>
        <h1 className="page-title">Seed Inventory</h1>
        <p className="page-sub">{seeds.length} varieties</p>
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Variety</th>
                <th>Category</th>
                <th>Species</th>
                <th>Days</th>
                <th>Germ%</th>
                <th>Lot</th>
                <th>Method</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {seeds.map(s => (
                <tr key={s.id}>
                  <td>
                    <span style={{ fontWeight: 500 }}>{s.name}</span>
                    {s.organic ? <span className="badge badge-organic" style={{ marginLeft: 8 }}>OG</span> : null}
                  </td>
                  <td><span className="badge badge-category" style={{ background: catColor(s.category) }}>{s.category}</span></td>
                  <td style={{ fontStyle: 'italic', fontSize: 12, color: '#8a8580' }}>{s.species}</td>
                  <td>{s.days_to_maturity}</td>
                  <td>{s.germ_rate}%</td>
                  <td style={{ fontSize: 12, color: '#8a8580' }}>{s.lot}</td>
                  <td style={{ fontSize: 12 }}>
                    {s.start_indoors ? '🏠 Indoor' : ''}{s.start_indoors && s.direct_sow ? ' / ' : ''}{s.direct_sow ? '🌿 Direct' : ''}
                  </td>
                  <td><button className="btn btn-secondary btn-sm" onClick={() => handleEditSeed(s)}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showModal === 'edit-seed' && (
          <div className="modal-overlay" onClick={() => setShowModal(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3 className="modal-title">Edit Seed / Plant Variety</h3>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input type="text" className="form-input" value={editData._seedName || ''} onChange={e => setEditData(d => ({ ...d, _seedName: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-input" value={editData._seedCategory || ''} onChange={e => setEditData(d => ({ ...d, _seedCategory: e.target.value }))}>
                    {[...categories, 'Flowers', 'Fruit', 'Other'].filter((v, i, a) => a.indexOf(v) === i).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="_custom">Other (type below)</option>
                  </select>
                  {editData._seedCategory === '_custom' && (
                    <input type="text" className="form-input" style={{ marginTop: 4 }} value={editData._seedCategoryText || ''} onChange={e => setEditData(d => ({ ...d, _seedCategoryText: e.target.value }))} placeholder="New category name" />
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Species</label>
                  <input type="text" className="form-input" value={editData._seedSpecies || ''} onChange={e => setEditData(d => ({ ...d, _seedSpecies: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Days to Maturity</label>
                  <input type="text" className="form-input" value={editData._seedDays || ''} onChange={e => setEditData(d => ({ ...d, _seedDays: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Germination %</label>
                  <input type="number" className="form-input" value={editData._seedGermRate || ''} onChange={e => setEditData(d => ({ ...d, _seedGermRate: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Supplier</label>
                  <input type="text" className="form-input" value={editData._seedSupplier || ''} onChange={e => setEditData(d => ({ ...d, _seedSupplier: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Lot</label>
                  <input type="text" className="form-input" value={editData._seedLot || ''} onChange={e => setEditData(d => ({ ...d, _seedLot: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">SKU</label>
                  <input type="text" className="form-input" value={editData._seedSku || ''} onChange={e => setEditData(d => ({ ...d, _seedSku: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 8, marginBottom: 16 }}>
                <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="checkbox" checked={editData._seedOrganic || false} onChange={e => setEditData(d => ({ ...d, _seedOrganic: e.target.checked }))} /> Organic
                </label>
                <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="checkbox" checked={editData._seedStartIndoors || false} onChange={e => setEditData(d => ({ ...d, _seedStartIndoors: e.target.checked }))} /> Start Indoors
                </label>
                <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="checkbox" checked={editData._seedDirectSow || false} onChange={e => setEditData(d => ({ ...d, _seedDirectSow: e.target.checked }))} /> Direct Sow
                </label>
              </div>
              {editData._seedStartIndoors && (
                <div className="form-group">
                  <label className="form-label">Weeks before last frost to start indoors</label>
                  <input type="number" className="form-input" value={editData._seedIndoorWeeks || ''} onChange={e => setEditData(d => ({ ...d, _seedIndoorWeeks: parseInt(e.target.value) || 0 }))} />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Plant Spacing (inches)</label>
                <input type="number" className="form-input" value={editData._seedSpacing || ''} onChange={e => setEditData(d => ({ ...d, _seedSpacing: parseInt(e.target.value) || 12 }))} placeholder="12" />
                <div style={{ fontSize: 11, color: '#8a8580', marginTop: 4 }}>Used in the bed planner grid. Common values: 3" carrots/radish, 6" lettuce/onions, 12" herbs/cucumbers, 18" peppers/kale, 24" tomatoes</div>
              </div>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowModal(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSaveSeed}>Save Changes</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPlantings = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Plantings</h1>
          <p className="page-sub">2026 Season</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditData({}); setShowModal('planting'); }}>+ New Planting</button>
      </div>
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Variety</th>
              <th>Location</th>
              <th>Status</th>
              <th>Started</th>
              <th>Transplant</th>
              <th>Direct Sow</th>
              <th>Photos</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {plantings.map(p => (
              <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => openPlantingDetail(p)}>
                <td>
                  <span style={{ fontWeight: 500 }}>{p.seed_name}</span>
                  {p.organic ? <span className="badge badge-organic" style={{ marginLeft: 8 }}>OG</span> : null}
                </td>
                <td>{p.structure_name || <span style={{ color: '#ccc' }}>—</span>}</td>
                <td>
                  <span className="status-dot" style={{ background: statusColor(p.status) }}></span>
                  <span style={{ fontSize: 13 }}>{STATUS_LABELS[p.status] || p.status}</span>
                </td>
                <td style={{ fontSize: 13 }}>{formatDate(p.indoor_start_date)}</td>
                <td style={{ fontSize: 13 }}>{formatDate(p.transplant_date)}</td>
                <td style={{ fontSize: 13 }}>{formatDate(p.direct_sow_date)}</td>
                <td>{p.photo_count > 0 ? `📷 ${p.photo_count}` : ''}</td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); handleDuplicatePlanting(p.id); }}>Duplicate</button>
                    <button className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); handleDeletePlanting(p.id); }}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {plantings.length === 0 && (
          <div className="empty">
            <div className="empty-icon">🌱</div>
            <p>No plantings yet. Click "New Planting" to add your first one.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderCalendarView = () => (
    <div>
      <h1 className="page-title">Planting Calendar</h1>
      <p className="page-sub">Zone 6b, Last Frost: April 15</p>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: '#8b5cf6', display: 'inline-block' }}></span> Indoor Start
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: '#f59e0b', display: 'inline-block' }}></span> Hardening Off
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: '#16a34a', display: 'inline-block' }}></span> Growing/Outdoor
        </div>
      </div>
      {renderCalendar()}
    </div>
  );

  const renderGardenMapView = () => (
    <div>
      <h1 className="page-title">Garden Map</h1>
      <p className="page-sub">Click any bed or box to open the planner</p>
      <div className="grid-2">
        <div>{renderGardenMap()}</div>
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

  // ── Bed Planner ──────────────────────────────────────────────────────────────

  const openBedPlanner = async (structure) => {
    setSelectedBed(structure);
    setActivePaintPlanting(null);
    const cells = await api.get(`/api/structures/${structure.id}/grid`);
    setGridCells(cells);
    setView('bed-planner');
  };

  const handleCellPaint = async (row, col) => {
    if (!activePaintPlanting || !selectedBed) return;
    const existing = gridCells.find(c => c.row === row && c.col === col);
    if (existing) {
      // If clicking on a cell that already has the same planting, erase it
      if (existing.planting_id === activePaintPlanting.id) {
        await api.del(`/api/structures/${selectedBed.id}/grid/cells?planting_id=${activePaintPlanting.id}&rows=${row}&cols=${col}`);
        const cells = await api.get(`/api/structures/${selectedBed.id}/grid`);
        setGridCells(cells);
        loadData();
        return;
      }
    }
    await api.post(`/api/structures/${selectedBed.id}/grid`, {
      planting_id: activePaintPlanting.id,
      cells: [{ row, col }]
    });
    const cells = await api.get(`/api/structures/${selectedBed.id}/grid`);
    setGridCells(cells);
    loadData();
  };

  const handleCellDrag = async (row, col) => {
    if (!isDragging || !activePaintPlanting || !selectedBed) return;
    const existing = gridCells.find(c => c.row === row && c.col === col);
    if (existing) return; // don't overwrite while dragging
    await api.post(`/api/structures/${selectedBed.id}/grid`, {
      planting_id: activePaintPlanting.id,
      cells: [{ row, col }]
    });
    const cells = await api.get(`/api/structures/${selectedBed.id}/grid`);
    setGridCells(cells);
  };

  const handleClearPlanting = async (plantingId) => {
    if (!selectedBed) return;
    await api.del(`/api/structures/${selectedBed.id}/grid/cells?planting_id=${plantingId}`);
    const cells = await api.get(`/api/structures/${selectedBed.id}/grid`);
    setGridCells(cells);
    loadData();
  };

  const renderBedPlanner = () => {
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h1 className="page-title">{bed.name} Planner</h1>
            <p className="page-sub">{bed.width}x{bed.length} ft, {cols}x{rows} grid (6" cells)</p>
          </div>
          <button className="btn btn-primary" onClick={() => { setEditData({ structure_id: bed.id }); setShowModal('planting'); }}>+ New Planting</button>
        </div>

        <div style={{ display: 'flex', gap: 24 }}>
          {/* Grid */}
          <div>
            <div style={{ border: '2px solid #5a4a2e', borderRadius: 4, display: 'inline-block', background: '#e8dcc8' }}>
              {/* Column markers (inches) */}
              <div style={{ display: 'flex', paddingLeft: 28 }}>
                {Array.from({ length: cols }).map((_, c) => (
                  <div key={c} style={{ width: cellPx, textAlign: 'center', fontSize: 8, color: '#8a8580', height: 14, lineHeight: '14px' }}>
                    {(c * CELL_SIZE) % 12 === 0 ? `${c * CELL_SIZE / 12}ft` : ''}
                  </div>
                ))}
              </div>
              {Array.from({ length: rows }).map((_, r) => (
                <div key={r} style={{ display: 'flex' }}>
                  {/* Row marker */}
                  <div style={{ width: 28, fontSize: 8, color: '#8a8580', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 4 }}>
                    {(r * CELL_SIZE) % 12 === 0 ? `${r * CELL_SIZE / 12}ft` : ''}
                  </div>
                  {Array.from({ length: cols }).map((_, c) => {
                    const cell = cellMap[`${r}-${c}`];
                    const bgColor = cell ? catColor(cell.category) : 'transparent';
                    const isActive = activePaintPlanting && cell && cell.planting_id === activePaintPlanting.id;
                    return (
                      <div
                        key={c}
                        style={{
                          width: cellPx, height: cellPx,
                          border: '0.5px solid rgba(90,74,46,0.2)',
                          background: cell ? bgColor : ((r + c) % 2 === 0 ? 'rgba(139,115,85,0.08)' : 'transparent'),
                          opacity: cell ? 0.85 : 1,
                          cursor: activePaintPlanting ? 'crosshair' : 'default',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          outline: isActive ? '1px solid #e8c56d' : 'none',
                          transition: 'background 0.1s',
                        }}
                        title={cell ? `${cell.seed_name} (${r},${c})` : `Empty (${r},${c})`}
                        onMouseDown={() => { setIsDragging(true); handleCellPaint(r, c); }}
                        onMouseEnter={() => handleCellDrag(r, c)}
                        onMouseUp={() => { setIsDragging(false); loadData(); }}
                      >
                        {cell && cellPx >= 20 && (
                          <div style={{ width: cellPx * 0.5, height: cellPx * 0.5, borderRadius: '50%', background: 'rgba(255,255,255,0.5)' }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: '#8a8580', marginTop: 8 }}>
              {activePaintPlanting ? `Painting: ${activePaintPlanting.seed_name}. Click or drag cells to fill. Click filled cells to erase.` : 'Select a planting from the sidebar to start painting.'}
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ width: 280, flexShrink: 0 }}>
            <div className="card" style={{ padding: 16 }}>
              <h4 style={{ fontSize: 14, marginBottom: 12, fontFamily: 'Fraunces, serif' }}>Plantings in {bed.name}</h4>
              {bedPlantings.length === 0 && (
                <div style={{ color: '#8a8580', fontSize: 13, padding: '12px 0' }}>No plantings assigned. Create one to get started.</div>
              )}
              {bedPlantings.map(p => {
                const isActive = activePaintPlanting?.id === p.id;
                const count = cellCounts[p.id] || 0;
                const seed = seeds.find(s => s.id === p.seed_id);
                return (
                  <div key={p.id}
                    style={{
                      padding: '8px 10px', marginBottom: 6, borderRadius: 8, cursor: 'pointer',
                      border: isActive ? '2px solid #e8c56d' : '1px solid #e8e4dd',
                      background: isActive ? '#faf5e8' : '#fff',
                    }}
                    onClick={() => setActivePaintPlanting(isActive ? null : p)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: catColor(p.category), flexShrink: 0 }} />
                      <span style={{ fontWeight: 500, fontSize: 13, flex: 1 }}>{p.seed_name}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#8a8580', marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                      <span>{count} cells placed</span>
                      <span>Spacing: {seed?.spacing_inches || 12}"</span>
                    </div>
                    {isActive && count > 0 && (
                      <button className="btn btn-danger btn-sm" style={{ marginTop: 6, width: '100%' }} onClick={(e) => { e.stopPropagation(); handleClearPlanting(p.id); }}>Clear all cells</button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Also show unassigned plantings that could be added */}
            {plantings.filter(p => !p.structure_id).length > 0 && (
              <div className="card" style={{ padding: 16, marginTop: 12 }}>
                <h4 style={{ fontSize: 14, marginBottom: 8, fontFamily: 'Fraunces, serif' }}>Unassigned Plantings</h4>
                {plantings.filter(p => !p.structure_id).map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 13, cursor: 'pointer' }}
                    onClick={async () => {
                      await api.put(`/api/plantings/${p.id}`, { structure_id: bed.id });
                      loadData();
                    }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: catColor(p.category) }} />
                    <span style={{ flex: 1 }}>{p.seed_name}</span>
                    <span style={{ fontSize: 11, color: '#16a34a' }}>+ Assign</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderDetail = () => {
    if (!selectedPlanting) return null;
    const p = selectedPlanting;
    const seed = seeds.find(s => s.id === p.seed_id);

    return (
      <div>
        <button className="btn btn-secondary" style={{ marginBottom: 16 }} onClick={() => setView('plantings')}>← Back to Plantings</button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h1 className="page-title">{p.seed_name}</h1>
            <p className="page-sub">
              <span className="badge badge-category" style={{ background: catColor(p.category) }}>{p.category}</span>
              {p.organic ? <span className="badge badge-organic" style={{ marginLeft: 8 }}>Organic</span> : null}
              {p.structure_name && <span style={{ marginLeft: 12 }}>📍 {p.structure_name}</span>}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => { setEditData(p); setShowModal('edit-planting'); }}>Edit</button>
            <button className="btn btn-secondary" onClick={() => { handleDuplicatePlanting(p.id); }}>Duplicate</button>
            <button className="btn btn-primary" onClick={() => { setEditData({ event_date: new Date().toISOString().split('T')[0] }); setShowModal('event'); }}>+ Log Event</button>
            <button className="btn btn-primary" onClick={() => setShowModal('photo')}>📷 Add Photo</button>
          </div>
        </div>

        <div className="detail-layout">
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
                  ['first_harvest_date', '🍅 First Harvest'],
                ].map(([key, label]) => (
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

            {/* Photo timeline */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Photo Timeline</h3>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowModal('photo')}>+ Add Photo</button>
              </div>
              {plantingPhotos.length > 0 ? (
                <div className="photo-grid">
                  {plantingPhotos.map(photo => (
                    <div key={photo.id} className="photo-card" onClick={() => setLightboxPhoto(photo)}>
                      <img src={`/photos/${photo.filename}`} alt={photo.caption || ''} />
                      <div className="photo-card-info">
                        <div>{formatDate(photo.taken_date)}</div>
                        {photo.caption && <div style={{ color: '#2d2a24', fontSize: 12, marginTop: 2 }}>{photo.caption}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty" style={{ padding: '24px' }}>
                  <div className="empty-icon">📷</div>
                  <p>No photos yet. Upload photos to track growth progress.</p>
                </div>
              )}
            </div>
          </div>

          {/* Event timeline sidebar */}
          <div>
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Event Log</h3>
                <button className="btn btn-secondary btn-sm" onClick={() => { setEditData({ event_date: new Date().toISOString().split('T')[0] }); setShowModal('event'); }}>+ Log</button>
              </div>
              {(p.events || []).length > 0 ? (
                (p.events || []).map(ev => {
                  const evType = EVENT_TYPES.find(t => t.value === ev.event_type);
                  return (
                    <div key={ev.id} className="timeline-item">
                      <div className="timeline-dot" style={{ background: evType?.color || '#6b7280' }}></div>
                      <div style={{ flex: 1 }}>
                        <div className="timeline-date">{formatDate(ev.event_date)}</div>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{evType?.label || ev.event_type}</div>
                        {ev.details && <div className="timeline-detail">{ev.details}</div>}
                        {ev.product_used && <div style={{ fontSize: 11, color: '#8a8580', marginTop: 2 }}>Product: {ev.product_used}</div>}
                        {ev.severity && <div style={{ fontSize: 11, color: ev.severity === 'high' ? '#dc2626' : ev.severity === 'medium' ? '#f59e0b' : '#16a34a', marginTop: 2 }}>Severity: {ev.severity}</div>}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="empty" style={{ padding: '16px' }}>
                  <p style={{ fontSize: 13 }}>No events logged yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Main render ────────────────────────────────────────────────────────────

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Fraunces, serif', fontSize: 24, color: '#8a8580' }}>Loading Heirloom...</div>;

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <nav className="nav">
          <div className="nav-logo">🌱 Heirloom</div>
          {['dashboard','seeds','plantings','calendar','map'].map(v => (
            <div key={v} className={`nav-link ${view === v || (view === 'detail' && v === 'plantings') || (view === 'bed-planner' && v === 'map') ? 'active' : ''}`} onClick={() => setView(v)}>
              {v === 'map' ? 'Garden Map' : v.charAt(0).toUpperCase() + v.slice(1)}
            </div>
          ))}
          <div className="nav-right">
            <button className="nav-btn" onClick={handleExport}>Export JSON</button>
            <button className="nav-btn" onClick={handleImport}>Import</button>
          </div>
        </nav>

        <div className="content" onMouseUp={() => { if (isDragging) { setIsDragging(false); loadData(); } }}>
          {view === 'dashboard' && renderDashboard()}
          {view === 'seeds' && renderSeeds()}
          {view === 'plantings' && renderPlantings()}
          {view === 'calendar' && renderCalendarView()}
          {view === 'map' && renderGardenMapView()}
          {view === 'bed-planner' && renderBedPlanner()}
          {view === 'detail' && renderDetail()}
        </div>

        {showModal === 'planting' && renderPlantingModal(false)}
        {showModal === 'edit-planting' && renderPlantingModal(true)}
        {showModal === 'event' && renderEventModal()}
        {showModal === 'photo' && renderPhotoModal()}

        {lightboxPhoto && (
          <div className="lightbox" onClick={() => setLightboxPhoto(null)}>
            <img src={`/photos/${lightboxPhoto.filename}`} alt={lightboxPhoto.caption || ''} />
            <div className="lightbox-caption">
              {formatDate(lightboxPhoto.taken_date)}{lightboxPhoto.caption ? ` — ${lightboxPhoto.caption}` : ''}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
