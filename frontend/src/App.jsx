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
  patch: async (url, data) => {
    const r = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    return r.json();
  },
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

// ── Helpers ──────────────────────────────────────────────────────────────────

// BFS clustering: groups cells where any two cells are within maxGap Chebyshev distance of each other
const clusterCells = (cells, maxGap = 3) => {
  const visited = new Set();
  const clusters = [];
  for (const cell of cells) {
    const key = `${cell.row},${cell.col}`;
    if (visited.has(key)) continue;
    const cluster = [];
    const queue = [cell];
    visited.add(key);
    while (queue.length) {
      const cur = queue.shift();
      cluster.push(cur);
      for (const candidate of cells) {
        const cKey = `${candidate.row},${candidate.col}`;
        if (visited.has(cKey)) continue;
        const dist = Math.max(Math.abs(candidate.row - cur.row), Math.abs(candidate.col - cur.col));
        if (dist <= maxGap) {
          visited.add(cKey);
          queue.push(candidate);
        }
      }
    }
    clusters.push(cluster);
  }
  return clusters;
};

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

  /* Plant Panel */
  .plant-panel { position: fixed; top: 56px; right: 0; bottom: 0; width: 340px; background: #fff; border-left: 1px solid #e8e4dd; overflow-y: auto; z-index: 150; transform: translateX(100%); transition: transform 0.25s ease; display: flex; flex-direction: column; }
  .plant-panel.open { transform: translateX(0); }
  .plant-panel-header { padding: 16px 20px; border-bottom: 1px solid #e8e4dd; position: sticky; top: 0; background: #fff; z-index: 1; }
  .plant-section-header { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 10px 20px 4px; border-top: 2px solid; margin-top: 4px; }
  .plant-section-header.individual { border-color: #86efac; color: #16a34a; }
  .plant-section-header.harvest { border-color: #fb923c; color: #c2410c; }
  .plant-section-header.family { border-color: #fbbf24; color: #b45309; }
  .plant-section-body { padding: 8px 20px; }
  .status-pill { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 600; cursor: pointer; border: 2px solid transparent; margin: 2px; transition: all 0.15s; }
  .status-pill.active { border-color: #2d2a24; }
  /* Plantings accordion */
  .planting-family-row { display: flex; align-items: center; padding: 10px 12px; cursor: pointer; border-bottom: 1px solid #f0ece6; gap: 8px; }
  .planting-family-row:hover td, .planting-family-row:hover { background: #faf8f5; }
  .plant-member-row { display: flex; align-items: center; padding: 6px 12px 6px 48px; border-bottom: 1px solid #f5f2ee; gap: 8px; cursor: pointer; font-size: 13px; }
  .plant-member-row:hover { background: #faf8f5; }
  .plant-short-id { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 700; font-family: 'DM Mono', monospace; min-width: 44px; justify-content: center; }

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
  const [modalError, setModalError] = useState(null);
  const [showPlantingSummary, setShowPlantingSummary] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [plantingPhotos, setPlantingPhotos] = useState([]);
  const [mapHighlight, setMapHighlight] = useState(null);
  const [showMapThumbs, setShowMapThumbs] = useState(true);
  const [mapZoom, setMapZoom] = useState(1.25);
  const [selectedBed, setSelectedBed] = useState(null);
  const [gridCells, setGridCells] = useState([]);
  const [mapGridCells, setMapGridCells] = useState({});
  const [labelPositions, setLabelPositions] = useState({});
  const [isDirtyLabels, setIsDirtyLabels] = useState(false);
  const [draggingLabel, setDraggingLabel] = useState(null);
  const mapSvgRef = useRef(null);
  const [activePaintPlanting, setActivePaintPlanting] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mapEditMode, setMapEditMode] = useState(false);
  const [selectedPlantGuid, setSelectedPlantGuid] = useState(null);
  const [plantDetail, setPlantDetail] = useState(null);
  const [plantHarvests, setPlantHarvests] = useState([]);
  const [plantPhotos, setPlantPhotos] = useState([]);
  const [plantPanelLoading, setPlantPanelLoading] = useState(false);
  const [expandedPlantingIds, setExpandedPlantingIds] = useState(new Set());
  const [collapsedCategories, setCollapsedCategories] = useState(new Set());
  const [collapsedSeedCategories, setCollapsedSeedCategories] = useState(new Set());

  const loadData = useCallback(async () => {
    try {
      const [s, st, p] = await Promise.all([
        api.get('/api/seeds'),
        api.get('/api/structures'),
        api.get('/api/plantings?year=2026'),
      ]);
      setSeeds(s); setStructures(st); setPlantings(p);
      // Load all grid cells for garden map summary view
      const [gridResults, labelPos] = await Promise.all([
        Promise.all(st.map(str => api.get(`/api/structures/${str.id}/grid`).then(cells => [str.id, cells]))),
        api.get('/api/label-positions'),
      ]);
      const gridMap = {};
      gridResults.forEach(([sid, cells]) => { gridMap[sid] = cells; });
      setMapGridCells(gridMap);
      const posMap = {};
      labelPos.forEach(p => { posMap[`${p.entity_type}:${p.entity_id}`] = { x: p.label_x, y: p.label_y, orientation: p.orientation || 'horizontal', hidden: !!p.hidden, label_text: p.label_text || null }; });
      setLabelPositions(posMap);
    } catch (e) { console.error('Load failed:', e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const loadPhotos = async (plantingId) => {
    const photos = await api.get(`/api/plantings/${plantingId}/photos`);
    setPlantingPhotos(photos);
  };

  const openPlantPanel = async (plantGuid) => {
    if (!plantGuid) return;
    setSelectedPlantGuid(plantGuid);
    setPlantPanelLoading(true);
    const [detail, harvests, photos] = await Promise.all([
      api.get(`/api/plants/${plantGuid}`),
      api.get(`/api/plants/${plantGuid}/harvests`),
      api.get(`/api/plants/${plantGuid}/photos`),
    ]);
    setPlantDetail(detail);
    setPlantHarvests(harvests);
    setPlantPhotos(photos);
    setPlantPanelLoading(false);
  };

  const closePlantPanel = () => {
    setSelectedPlantGuid(null);
    setPlantDetail(null);
    setPlantHarvests([]);
    setPlantPhotos([]);
  };

  const refreshPlantMapCells = async (structureId) => {
    const updatedCells = await api.get(`/api/structures/${structureId}/grid`);
    setMapGridCells(prev => ({ ...prev, [structureId]: updatedCells }));
    if (selectedBed?.id === structureId) {
      setGridCells(updatedCells);
    }
  };

  const openPlantingDetail = (p) => {
    setSelectedPlanting(p);
    loadPhotos(p.id);
    setView('detail');
  };

  // ── Handlers ─────────────────────────────────────────────────────────────

  const cleanPlantingData = (data) => {
    const clean = {};
    const allowed = ['seed_id', 'structure_id', 'year', 'qty_started', 'qty_planted',
      'indoor_start_date', 'hardening_date', 'transplant_date', 'direct_sow_date',
      'first_harvest_date', 'status', 'notes'];
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

  const handleDuplicatePlanting = (id) => {
    const source = plantings.find(p => p.id === id);
    if (!source) return;
    const fields = ['seed_id', 'structure_id', 'year', 'qty_started', 'qty_planted',
      'indoor_start_date', 'hardening_date', 'transplant_date', 'direct_sow_date',
      'first_harvest_date', 'status', 'notes'];
    const prefilled = {};
    fields.forEach(k => { if (source[k] != null) prefilled[k] = source[k]; });
    setEditData(prefilled);
    setShowModal('duplicate');
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
  // Build structure → plantings map from grid cells (a planting can span multiple beds)
  const plantingsByStructure = {};
  plantings.forEach(p => {
    (p.grid_structures || []).forEach(sid => {
      if (!plantingsByStructure[sid]) plantingsByStructure[sid] = [];
      if (!plantingsByStructure[sid].find(x => x.id === p.id)) {
        plantingsByStructure[sid].push(p);
      }
    });
  });

  const totalStarted = plantings.reduce((sum, p) => sum + (p.qty_started || 0), 0);
  const totalPlanted = plantings.reduce((sum, p) => sum + (p.qty_planted || 0), 0);
  const activePlantings = plantings.filter(p => p.status !== 'done');
  const harvestingCount = plantings.filter(p => p.status === 'harvesting').reduce((sum, p) => sum + (p.qty_planted || p.qty_started || 0), 0);

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
                const isOutdoorProjected = new Date(startDate + 'T00:00:00') > new Date();
                const start = dateToPercent(startDate);
                const end = dateToPercent(p.first_harvest_date || '2026-09-30');
                if (start !== null) bars.push({
                  left: start,
                  width: Math.max(end - start, 2),
                  color: '#16a34a',
                  label: isOutdoorProjected ? 'Growing (projected)' : 'Growing',
                  projected: isOutdoorProjected,
                });
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

  const renderPlantingModal = (isEdit = false, title = null) => (
    <div className="modal-overlay" onClick={() => { setShowModal(null); setModalError(null); }}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">{title || (isEdit ? 'Edit Planting' : 'New Planting')}</h3>

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
                {modalError && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 8 }}>{modalError}</div>}
                <div style={{ marginTop: 8 }}>
                  <button className="btn btn-primary btn-sm" disabled={!editData._customName || (!editData._customCategory || (editData._customCategory === '_custom' && !editData._customCategoryText))} onClick={async () => {
                    setModalError(null);
                    try {
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
                      } else {
                        setModalError(res.detail ? JSON.stringify(res.detail) : 'Failed to save variety. Check all fields.');
                      }
                    } catch (err) {
                      setModalError(`Error: ${err.message}`);
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

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Started (under lights)</label>
            <input type="number" className="form-input" value={editData.qty_started || ''} onChange={e => setEditData(d => ({ ...d, qty_started: parseInt(e.target.value) || null }))} placeholder="e.g. 12" />
          </div>
          <div className="form-group">
            <label className="form-label">Planted / Projected</label>
            <input type="number" className="form-input" value={editData.qty_planted || ''} onChange={e => setEditData(d => ({ ...d, qty_planted: parseInt(e.target.value) || null }))} placeholder="e.g. 6" />
            <div style={{ fontSize: 11, color: '#8a8580', marginTop: 4 }}>Can set ahead of transplant date as a projection</div>
          </div>
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

        {editData.seed_id && (() => {
          const thumbSeed = seeds.find(s => s.id === editData.seed_id);
          if (!thumbSeed) return null;
          return (
            <div className="form-group">
              <label className="form-label">Plant Thumbnail</label>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                {thumbSeed.image_url ? (
                  <img src={thumbSeed.image_url} alt={thumbSeed.name}
                    style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, border: '1px solid #e8e4dd', flexShrink: 0 }}
                    onError={e => { e.target.style.display = 'none'; }} />
                ) : (
                  <div style={{ width: 56, height: 56, borderRadius: 6, border: '2px dashed #e8e4dd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🌿</div>
                )}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary btn-sm" disabled={editData._thumbSearching}
                      onClick={async () => {
                        setEditData(d => ({ ...d, _thumbSearching: true }));
                        const res = await api.get(`/api/seeds/image-search?q=${encodeURIComponent(thumbSeed.name)}`);
                        if (res.image_url) {
                          await api.patch(`/api/seeds/${thumbSeed.id}/image`, { image_url: res.image_url });
                          setSeeds(await api.get('/api/seeds'));
                        }
                        setEditData(d => ({ ...d, _thumbSearching: false }));
                      }}>
                      {editData._thumbSearching ? 'Searching…' : '🔍 Find Image'}
                    </button>
                    <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
                      📁 Upload
                      <input type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={async e => {
                          const file = e.target.files[0];
                          if (!file) return;
                          const formData = new FormData();
                          formData.append('file', file);
                          const res = await api.upload(`/api/seeds/${thumbSeed.id}/image`, formData);
                          if (res.image_url) setSeeds(await api.get('/api/seeds'));
                        }} />
                    </label>
                  </div>
                  <input type="text" className="form-input"
                    placeholder="Or paste image URL…"
                    defaultValue={thumbSeed.image_url || ''}
                    style={{ fontSize: 11 }}
                    onBlur={async e => {
                      const url = e.target.value.trim();
                      if (url !== (thumbSeed.image_url || '')) {
                        await api.patch(`/api/seeds/${thumbSeed.id}/image`, { image_url: url || null });
                        setSeeds(await api.get('/api/seeds'));
                      }
                    }} />
                  {thumbSeed.image_url && (
                    <button className="btn btn-sm" style={{ background: 'none', border: 'none', color: '#8a8580', cursor: 'pointer', fontSize: 12, textAlign: 'left', padding: 0 }}
                      onClick={async () => {
                        await api.patch(`/api/seeds/${thumbSeed.id}/image`, { image_url: null });
                        setSeeds(await api.get('/api/seeds'));
                      }}>✕ Remove image</button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => { setShowModal(null); setModalError(null); }}>Cancel</button>
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
          <div className="stat-value">{totalStarted}</div>
          <div className="stat-label">Started</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalPlanted}</div>
          <div className="stat-label">Planted / Projected</div>
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
                <span style={{ fontSize: 12, color: '#8a8580', whiteSpace: 'nowrap' }}>
                  {p.qty_started ? `${p.qty_started} started` : ''}
                  {p.placed_count > 0 ? ` · ${p.placed_count} placed` : ''}
                  {p.unplaced_count > 0 ? <span style={{ color: '#e8a020' }}> · {p.unplaced_count} unassigned</span> : ''}
                </span>
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
        _seedImageUrl: seed.image_url || '',
        _seedShortLabel: seed.short_label || '',
        _seedImageLoading: false,
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
        image_url: editData._seedImageUrl || null,
        short_label: editData._seedShortLabel || null,
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
                <th>Species</th>
                <th>Days</th>
                <th>Germ%</th>
                <th>Lot</th>
                <th>Method</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const byCategory = {};
                seeds.forEach(s => {
                  const cat = s.category || 'Other';
                  if (!byCategory[cat]) byCategory[cat] = [];
                  byCategory[cat].push(s);
                });
                return Object.keys(byCategory).sort().flatMap(cat => {
                  const catSeeds = byCategory[cat];
                  const isCatCollapsed = collapsedSeedCategories.has(cat);
                  const color = catColor(cat);
                  const categoryRow = (
                    <tr key={`cat-${cat}`}
                      style={{ background: color + '14', cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => setCollapsedSeedCategories(prev => {
                        const next = new Set(prev);
                        if (next.has(cat)) next.delete(cat); else next.add(cat);
                        return next;
                      })}>
                      <td colSpan={7} style={{ padding: '8px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 10, color, width: 12, textAlign: 'center' }}>{isCatCollapsed ? '▶' : '▼'}</span>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
                          <span style={{ fontWeight: 700, fontSize: 12, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{cat}</span>
                          <span style={{ fontSize: 12, color: '#8a8580', fontWeight: 400 }}>{catSeeds.length} {catSeeds.length === 1 ? 'variety' : 'varieties'}</span>
                        </div>
                      </td>
                    </tr>
                  );
                  if (isCatCollapsed) return [categoryRow];
                  return [categoryRow, ...catSeeds.map(s => (
                    <tr key={s.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {s.image_url ? (
                            <img src={s.image_url} alt={s.name} style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4, flexShrink: 0, border: '1px solid #e8e4dd' }} onError={e => { e.target.style.display = 'none'; }} />
                          ) : (
                            <div style={{ width: 32, height: 32, borderRadius: 4, background: color, opacity: 0.35, flexShrink: 0 }} />
                          )}
                          <span style={{ fontWeight: 500 }}>{s.name}</span>
                          {s.organic ? <span className="badge badge-organic" style={{ marginLeft: 4 }}>OG</span> : null}
                        </div>
                      </td>
                      <td style={{ fontStyle: 'italic', fontSize: 12, color: '#8a8580' }}>{s.species}</td>
                      <td>{s.days_to_maturity}</td>
                      <td>{s.germ_rate ? `${s.germ_rate}%` : ''}</td>
                      <td style={{ fontSize: 12, color: '#8a8580' }}>{s.lot}</td>
                      <td style={{ fontSize: 12 }}>
                        {s.start_indoors ? '🏠 Indoor' : ''}{s.start_indoors && s.direct_sow ? ' / ' : ''}{s.direct_sow ? '🌿 Direct' : ''}
                      </td>
                      <td><button className="btn btn-secondary btn-sm" onClick={() => handleEditSeed(s)}>Edit</button></td>
                    </tr>
                  ))];
                });
              })()}
            </tbody>
          </table>
        </div>

        {showModal === 'edit-seed' && (
          <div className="modal-overlay" onClick={() => setShowModal(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3 className="modal-title">Edit Seed / Plant Variety</h3>
              <div className="form-group">
                <label className="form-label">Short Label for Map <span style={{ fontSize: 11, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(shown on garden map cells, keep under 8 chars)</span></label>
                <input type="text" className="form-input" maxLength={10}
                  value={editData._seedShortLabel || ''}
                  onChange={e => setEditData(d => ({ ...d, _seedShortLabel: e.target.value }))}
                  placeholder={editData._seedName ? editData._seedName.split(' ')[0].slice(0, 8) : 'e.g. Shishito'}
                />
              </div>
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
              <div className="form-group">
                <label className="form-label">Plant Photo</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {editData._seedImageUrl ? (
                    <img src={editData._seedImageUrl} alt={editData._seedName} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid #e8e4dd', flexShrink: 0 }} onError={e => { e.target.style.display = 'none'; }} />
                  ) : (
                    <div style={{ width: 64, height: 64, borderRadius: 8, border: '2px dashed #e8e4dd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#ccc', flexShrink: 0 }}>🌿</div>
                  )}
                  <div style={{ flex: 1 }}>
                    <button className="btn btn-secondary btn-sm" disabled={editData._seedImageLoading} onClick={async () => {
                      setEditData(d => ({ ...d, _seedImageLoading: true }));
                      const res = await api.get(`/api/seeds/image-search?q=${encodeURIComponent(editData._seedName || '')}`);
                      setEditData(d => ({ ...d, _seedImageUrl: res.image_url || d._seedImageUrl, _seedImageLoading: false }));
                    }}>
                      {editData._seedImageLoading ? 'Searching...' : '🔍 Find Image'}
                    </button>
                    {editData._seedImageUrl && (
                      <button className="btn btn-sm" style={{ marginLeft: 8, background: 'none', border: 'none', color: '#8a8580', cursor: 'pointer', fontSize: 12 }} onClick={() => setEditData(d => ({ ...d, _seedImageUrl: '' }))}>✕ Remove</button>
                    )}
                    <div style={{ fontSize: 11, color: '#8a8580', marginTop: 4 }}>Auto-fetched from Wikipedia. Shown in bed planner grid.</div>
                  </div>
                </div>
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

  const renderPlantings = () => {
    const varietySummary = Object.values(
      plantings.reduce((acc, p) => {
        if (!acc[p.seed_id]) acc[p.seed_id] = { name: p.seed_name, category: p.category, rows: 0, started: 0, planted: 0 };
        acc[p.seed_id].rows += 1;
        acc[p.seed_id].started += p.qty_started || 0;
        acc[p.seed_id].planted += p.qty_planted || 0;
        return acc;
      }, {})
    ).sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

    return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Plantings</h1>
          <p className="page-sub">2026 Season</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setShowPlantingSummary(s => !s)}>
            {showPlantingSummary ? 'Hide Summary' : 'Show Summary'}
          </button>
          <button className="btn btn-primary" onClick={() => { setEditData({}); setShowModal('planting'); }}>+ New Planting</button>
        </div>
      </div>

      {showPlantingSummary && (() => {
        const byCategory = varietySummary.reduce((acc, v) => {
          if (!acc[v.category]) acc[v.category] = [];
          acc[v.category].push(v);
          return acc;
        }, {});
        const grandStarted = varietySummary.reduce((s, v) => s + v.started, 0);
        const grandPlanted = varietySummary.reduce((s, v) => s + v.planted, 0);
        const grandVarieties = varietySummary.length;

        return (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, fontFamily: 'Fraunces, serif' }}>Variety Summary</div>
          <table className="table" style={{ fontSize: 13 }}>
            <thead>
              <tr>
                <th>Variety</th>
                <th style={{ textAlign: 'right' }}>Started</th>
                <th style={{ textAlign: 'right' }}>Planted</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(byCategory).map(([cat, varieties]) => {
                const catStarted = varieties.reduce((s, v) => s + v.started, 0);
                const catPlanted = varieties.reduce((s, v) => s + v.planted, 0);
                return (
                  <React.Fragment key={cat}>
                    <tr style={{ background: catColor(cat) + '18' }}>
                      <td colSpan={3} style={{ fontWeight: 700, fontSize: 12, color: catColor(cat), textTransform: 'uppercase', letterSpacing: '0.05em', padding: '6px 12px' }}>
                        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: catColor(cat), marginRight: 6 }} />
                        {cat} — {catStarted} started, {catPlanted} planted
                      </td>
                    </tr>
                    {varieties.map(v => (
                      <tr key={v.name}>
                        <td style={{ fontWeight: 500, paddingLeft: 24 }}>{v.name}</td>
                        <td style={{ textAlign: 'right' }}>{v.started || '—'}</td>
                        <td style={{ textAlign: 'right' }}>{v.planted || '—'}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
              <tr style={{ borderTop: '2px solid #e8e4dd', fontWeight: 700 }}>
                <td>Total — {grandVarieties} varieties</td>
                <td style={{ textAlign: 'right' }}>{grandStarted}</td>
                <td style={{ textAlign: 'right' }}>{grandPlanted}</td>
              </tr>
            </tbody>
          </table>
        </div>
        );
      })()}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Build plantingMembersMap from mapGridCells */}
        {(() => {
          const plantingMembersMap = {};
          Object.entries(mapGridCells).forEach(([sid, cells]) => {
            cells.forEach(c => {
              if (!c.plant_guid) return;
              if (!plantingMembersMap[c.planting_id]) plantingMembersMap[c.planting_id] = [];
              plantingMembersMap[c.planting_id].push({ ...c, structure_id: sid });
            });
          });
          Object.values(plantingMembersMap).forEach(arr =>
            arr.sort((a, b) => (a.short_id || '').localeCompare(b.short_id || ''))
          );

          return (
            <table className="table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 16 }}>Variety / Plants</th>
                  <th>Location</th>
                  <th>Started</th>
                  <th>Planted</th>
                  <th>Status</th>
                  <th>Indoor Start</th>
                  <th>Transplant</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Group plantings by category
                  const byCategory = {};
                  plantings.forEach(p => {
                    const cat = p.category || 'Other';
                    if (!byCategory[cat]) byCategory[cat] = [];
                    byCategory[cat].push(p);
                  });
                  const categories = Object.keys(byCategory).sort();

                  return categories.flatMap(cat => {
                    const catPlantings = byCategory[cat];
                    const isCatCollapsed = collapsedCategories.has(cat);
                    const catStarted = catPlantings.reduce((s, p) => s + (p.qty_started || 0), 0);
                    const catPlanted = catPlantings.reduce((s, p) => s + (p.qty_planted || 0), 0);
                    const color = catColor(cat);

                    const categoryRow = (
                      <tr key={`cat-${cat}`}
                        style={{ background: color + '14', cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => setCollapsedCategories(prev => {
                          const next = new Set(prev);
                          if (next.has(cat)) next.delete(cat); else next.add(cat);
                          return next;
                        })}>
                        <td colSpan={8} style={{ padding: '8px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 10, color, width: 12, textAlign: 'center' }}>{isCatCollapsed ? '▶' : '▼'}</span>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
                            <span style={{ fontWeight: 700, fontSize: 12, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{cat}</span>
                            <span style={{ fontSize: 12, color: '#8a8580', fontWeight: 400 }}>
                              {catPlantings.length} {catPlantings.length === 1 ? 'variety' : 'varieties'} · {catStarted} started · {catPlanted} planted
                            </span>
                          </div>
                        </td>
                      </tr>
                    );

                    if (isCatCollapsed) return [categoryRow];

                    const plantingRows = catPlantings.map(p => {
                  const seed = seeds.find(sd => sd.id === p.seed_id);
                  const isExpanded = expandedPlantingIds.has(p.id);
                  const members = plantingMembersMap[p.id] || [];
                  const bedNames = (p.grid_structures || [])
                    .map(sid => structures.find(s => s.id === sid)?.name || sid)
                    .filter(Boolean);
                  const isProjected = p.transplant_date && new Date(p.transplant_date + 'T00:00:00') > new Date();

                  return (
                    <React.Fragment key={p.id}>
                      {/* Family row */}
                      <tr style={{ cursor: 'pointer', background: isExpanded ? '#faf8f5' : undefined }}
                        onClick={() => openPlantingDetail(p)}>
                        <td style={{ paddingLeft: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {/* Expand chevron */}
                            <button
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', fontSize: 11, color: '#8a8580', flexShrink: 0, lineHeight: 1 }}
                              onClick={e => {
                                e.stopPropagation();
                                setExpandedPlantingIds(prev => {
                                  const next = new Set(prev);
                                  if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
                                  return next;
                                });
                              }}
                              title={isExpanded ? 'Collapse' : `Expand (${members.length} plants)`}>
                              {isExpanded ? '▼' : '▶'}
                            </button>
                            {seed?.image_url ? (
                              <img src={seed.image_url} alt={p.seed_name} style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 4, flexShrink: 0, border: '1px solid #e8e4dd' }} onError={e => { e.target.style.display = 'none'; }} />
                            ) : (
                              <div style={{ width: 28, height: 28, borderRadius: 4, background: catColor(p.category), opacity: 0.35, flexShrink: 0 }} />
                            )}
                            <div>
                              <div style={{ fontWeight: 500, fontSize: 13 }}>{p.seed_name}</div>
                              {members.length > 0 && (
                                <div style={{ fontSize: 11, color: '#8a8580' }}>{members.length} individual plants</div>
                              )}
                            </div>
                            {p.organic ? <span className="badge badge-organic" style={{ marginLeft: 4 }}>OG</span> : null}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: 13 }}>
                            {bedNames.length > 0 ? bedNames.join(', ') : <span style={{ color: '#ccc' }}>—</span>}
                          </div>
                          {(p.placed_count > 0 || p.unplaced_count > 0) && (
                            <div style={{ fontSize: 11, marginTop: 2 }}>
                              {p.placed_count > 0 && <span style={{ color: '#16a34a' }}>{p.placed_count} placed</span>}
                              {p.placed_count > 0 && p.unplaced_count > 0 && <span style={{ color: '#ccc' }}> · </span>}
                              {p.unplaced_count > 0 && <span style={{ color: '#e8a020' }}>{p.unplaced_count} unassigned</span>}
                            </div>
                          )}
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <input type="number" min="0" value={p.qty_started ?? ''} placeholder="—"
                            onChange={async e => { await api.put(`/api/plantings/${p.id}`, { qty_started: parseInt(e.target.value) || null }); loadData(); }}
                            style={{ width: 52, padding: '2px 6px', border: '1px solid #e8e4dd', borderRadius: 6, fontSize: 13, textAlign: 'center' }}
                          />
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <input type="number" min="0" value={p.qty_planted ?? ''} placeholder="—"
                              onChange={async e => { await api.put(`/api/plantings/${p.id}`, { qty_planted: parseInt(e.target.value) || null }); loadData(); }}
                              style={{ width: 52, padding: '2px 6px', border: `1px solid ${isProjected ? '#fbbf24' : '#e8e4dd'}`, borderRadius: 6, fontSize: 13, textAlign: 'center', background: isProjected ? '#fffbeb' : '#fff' }}
                            />
                            {isProjected && <span style={{ fontSize: 11, color: '#d97706' }}>proj.</span>}
                          </div>
                        </td>
                        <td>
                          <span className="status-dot" style={{ background: statusColor(p.status) }}></span>
                          <span style={{ fontSize: 13 }}>{STATUS_LABELS[p.status] || p.status}</span>
                        </td>
                        <td style={{ fontSize: 13 }}>{formatDate(p.indoor_start_date)}</td>
                        <td style={{ fontSize: 13 }}>{formatDate(p.transplant_date)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-secondary btn-sm" onClick={e => { e.stopPropagation(); handleDuplicatePlanting(p.id); }}>Dup</button>
                            <button className="btn btn-danger btn-sm" onClick={e => { e.stopPropagation(); handleDeletePlanting(p.id); }}>Del</button>
                          </div>
                        </td>
                      </tr>

                      {/* Individual plant rows */}
                      {isExpanded && members.map(m => {
                        const stName = structures.find(s => s.id === m.structure_id)?.name;
                        const sColor = plantStatusColor(m.plant_status);
                        return (
                          <tr key={m.plant_guid}
                            style={{ background: '#f8f7f5', cursor: 'pointer' }}
                            onClick={() => openPlantPanel(m.plant_guid)}>
                            <td style={{ paddingLeft: 52 }} colSpan={1}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span className="plant-short-id" style={{ background: sColor + '20', color: sColor }}>{m.short_id}</span>
                                <span style={{ fontSize: 12, color: '#8a8580' }}>
                                  {m.plant_status !== 'healthy' && (
                                    <span style={{ color: sColor, fontWeight: 500, marginRight: 6 }}>
                                      {PLANT_STATUSES.find(x => x.value === m.plant_status)?.label}
                                    </span>
                                  )}
                                  {m.plant_notes ? m.plant_notes.slice(0, 40) + (m.plant_notes.length > 40 ? '…' : '') : ''}
                                </span>
                              </div>
                            </td>
                            <td colSpan={1} style={{ fontSize: 12, color: '#8a8580' }}>
                              {stName && stName !== bedNames[0] ? stName : ''}
                            </td>
                            <td colSpan={6} style={{ fontSize: 12, color: '#a8a399' }}>
                              row {m.row}, col {m.col}{m.label_visible ? '' : ' · label hidden'}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                });
                    return [categoryRow, ...plantingRows];
                  });
                })()}
              </tbody>
            </table>
          );
        })()}
        {plantings.length === 0 && (
          <div className="empty">
            <div className="empty-icon">🌱</div>
            <p>No plantings yet. Click "New Planting" to add your first one.</p>
          </div>
        )}
      </div>
    </div>
    );
  };

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <span style={{ width: 24, height: 12, borderRadius: 3, background: '#16a34a30', border: '2px dashed #16a34a', boxSizing: 'border-box', display: 'inline-block' }}></span> Projected outdoor
        </div>
      </div>
      {renderCalendar()}
    </div>
  );

  const renderGardenMapView = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 }}>
        <div>
          <h1 className="page-title">Garden Map</h1>
          <p className="page-sub" style={{ marginBottom: 0 }}>Click any bed or box to open the planner</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 24 }}>
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
                <button className="btn btn-primary btn-sm" onClick={() => { setEditData({ structure_id: bed.id }); setShowModal('planting'); }}>+ New</button>
              </div>
              <div style={{ fontSize: 11, color: '#8a8580', marginBottom: 10 }}>Click a planting to select it, then paint cells on the grid. A planting can span multiple beds.</div>
              {plantings.length === 0 && (
                <div style={{ color: '#8a8580', fontSize: 13, padding: '12px 0' }}>No plantings yet. Create one to get started.</div>
              )}
              {(() => {
                const inThisBed = plantings.filter(p => (p.grid_structures || []).includes(bed.id));
                const notInThisBed = plantings.filter(p => !(p.grid_structures || []).includes(bed.id));
                // Unassigned = has plants not yet placed anywhere (unplaced_count > 0)
                const unassigned = notInThisBed.filter(p => (p.unplaced_count || 0) > 0);
                // Other beds = not here, fully placed elsewhere
                const otherBeds = notInThisBed.filter(p => (p.unplaced_count || 0) === 0 && (p.grid_structures || []).length > 0);
                const grouped = { unassigned, otherBeds };

                const renderPaintable = (p) => {
                  const isActive = activePaintPlanting?.id === p.id;
                  const count = cellCounts[p.id] || 0;
                  const seed = seeds.find(s => s.id === p.seed_id);
                  const imageUrl = seed?.image_url;
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
                          <div style={{ fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.seed_name}</div>
                          <div style={{ fontSize: 11, color: '#8a8580', marginTop: 1 }}>
                            {seed?.spacing_inches || 12}" spacing
                            {count > 0 && <span style={{ marginLeft: 6 }}>{count} cells</span>}
                            {p.unplaced_count > 0 && <span style={{ color: '#e8a020', marginLeft: 6 }}>{p.unplaced_count} unplaced</span>}
                          </div>
                        </div>
                      </div>
                      {isActive && count > 0 && (
                        <button className="btn btn-danger btn-sm" style={{ marginTop: 6, width: '100%' }} onClick={(e) => { e.stopPropagation(); handleClearPlanting(p.id); }}>Clear cells here</button>
                      )}
                    </div>
                  );
                };

                return (
                  <>
                    {inThisBed.length > 0 && (
                      <>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#8a8580', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '4px 0 6px' }}>In {bed.name}</div>
                        {inThisBed.map(renderPaintable)}
                      </>
                    )}
                    {grouped.unassigned.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#e8a020', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 0 6px' }}>Unassigned</div>
                        {grouped.unassigned.map(renderPaintable)}
                      </div>
                    )}
                    {grouped.otherBeds.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#8a8580', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 0 6px' }}>Other Beds</div>
                        {grouped.otherBeds.map(renderPaintable)}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const PLANT_STATUSES = [
    { value: 'healthy',       label: 'Healthy',        color: '#16a34a' },
    { value: 'struggling',    label: 'Struggling',     color: '#f59e0b' },
    { value: 'dead',          label: 'Dead',           color: '#6b7280' },
    { value: 'harvested-out', label: 'Harvested Out',  color: '#7c3aed' },
  ];

  const plantStatusColor = (s) => {
    const found = PLANT_STATUSES.find(x => x.value === s);
    return found ? found.color : '#9ca3af';
  };

  const renderPlantPanel = () => (
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
            <button className="nav-btn" onClick={async () => {
              const res = await api.post('/api/seeds/fetch-images', {});
              alert(`Fetched images for ${res.updated} of ${res.total} plants.`);
              loadData();
            }}>🌿 Fetch Plant Images</button>
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
        {showModal === 'duplicate' && renderPlantingModal(false, 'Duplicate Planting')}
        {showModal === 'edit-planting' && renderPlantingModal(true)}
        {showModal === 'event' && renderEventModal()}
        {showModal === 'photo' && renderPhotoModal()}

        {showModal === 'plant-harvest' && (
          <div className="modal-overlay" onClick={() => setShowModal(null)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}>
              <h3 className="modal-title">Record Harvest</h3>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input type="date" className="form-input"
                  value={editData.harvest_date || ''}
                  onChange={e => setEditData(d => ({ ...d, harvest_date: e.target.value }))} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Count</label>
                  <input type="number" min="0" className="form-input"
                    value={editData._harvestCount || ''}
                    onChange={e => setEditData(d => ({ ...d, _harvestCount: e.target.value }))}
                    placeholder="# fruits" />
                </div>
                <div className="form-group">
                  <label className="form-label">Weight (oz)</label>
                  <input type="number" step="0.1" min="0" className="form-input"
                    value={editData._harvestOz || ''}
                    onChange={e => setEditData(d => ({ ...d, _harvestOz: e.target.value }))}
                    placeholder="oz" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-input"
                  value={editData._harvestNotes || ''}
                  onChange={e => setEditData(d => ({ ...d, _harvestNotes: e.target.value }))} />
              </div>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => { setShowModal(null); setEditData({}); }}>Cancel</button>
                <button className="btn btn-primary" onClick={async () => {
                  const guid = editData._harvestGuid;
                  await api.post(`/api/plants/${guid}/harvests`, {
                    harvest_date: editData.harvest_date,
                    count: editData._harvestCount ? parseInt(editData._harvestCount) : null,
                    weight_oz: editData._harvestOz ? parseFloat(editData._harvestOz) : null,
                    notes: editData._harvestNotes || null,
                  });
                  setShowModal(null); setEditData({});
                  const updated = await api.get(`/api/plants/${guid}/harvests`);
                  setPlantHarvests(updated);
                }}>Save Harvest</button>
              </div>
            </div>
          </div>
        )}

        {renderPlantPanel()}

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
