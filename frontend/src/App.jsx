import React, { useState, useEffect } from 'react'
import api from './lib/api';
import { STATUS_LABELS, EVENT_TYPES, PLANT_STATUSES } from './lib/constants';
import { catColor, statusColor, plantStatusColor } from './lib/colors';
import { formatDate } from './lib/formatters';
// clusterCells / getSuggestedDates moved to component files that use them
import useAppData from './hooks/useAppData';
import usePhotos from './hooks/usePhotos';
import EmptyState from './components/common/EmptyState';
import StatCard from './components/common/StatCard';
import Lightbox from './components/common/Lightbox';
import Photos from './components/views/Photos';
import CalendarView from './components/views/CalendarView';
import EventModal from './components/modals/EventModal';
import BulkEventModal from './components/modals/BulkEventModal';
import AddLotModal from './components/modals/AddLotModal';
import PhotoModal from './components/modals/PhotoModal';
import PlantingModal from './components/modals/PlantingModal';
import QuickNoteModal from './components/modals/QuickNoteModal';
import QuickPhotoModal from './components/modals/QuickPhotoModal';
import Nav from './components/nav/Nav';
import MobileTabBar from './components/nav/MobileTabBar';
import Dashboard from './components/views/Dashboard';
import Seeds from './components/views/Seeds';
import Plantings from './components/views/Plantings';
import Detail from './components/views/Detail';
import PlantPanel from './components/plants/PlantPanel';
import GardenMap from './components/garden/GardenMap';
import GardenMapView from './components/views/GardenMapView';
import BedPlanner from './components/views/BedPlanner';

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
  .nav-links { display: flex; }
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

  /* ── Photos Tab ── */
  .photos-toggle { display: inline-flex; border: 1px solid #e8e4dd; border-radius: 8px; overflow: hidden; margin-bottom: 24px; }
  .photos-toggle-btn { padding: 7px 18px; font-size: 13px; font-weight: 500; cursor: pointer; border: none; background: #fff; color: #8a8580; font-family: 'DM Sans', sans-serif; transition: all 0.15s; }
  .photos-toggle-btn.active { background: #2d2a24; color: #f8f6f1; }
  .photos-group { margin-bottom: 32px; }
  .photos-group-header { font-family: 'Fraunces', serif; font-size: 18px; font-weight: 500; color: #2d2a24; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #e8e4dd; display: flex; align-items: baseline; gap: 0; }
  .photos-group-sub { color: #8a8580; font-size: 13px; margin-left: 8px; font-family: 'DM Sans', sans-serif; font-weight: 400; }
  .photos-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .photo-thumb { border-radius: 10px; overflow: hidden; border: 1px solid #e8e4dd; cursor: pointer; transition: transform 0.15s, box-shadow 0.15s; background: #f0ece6; }
  .photo-thumb:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.12); }
  .photo-thumb img { width: 100%; aspect-ratio: 1; object-fit: cover; display: block; }
  .photo-thumb-info { padding: 8px 10px; font-size: 11px; color: #8a8580; line-height: 1.4; }
  .photo-thumb-label { font-weight: 600; color: #2d2a24; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .photo-thumb-caption { color: #8a8580; font-style: italic; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* ── Dashboard photo strip ── */
  .dashboard-photo-strip { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 8px; scrollbar-width: none; }
  .dashboard-photo-strip::-webkit-scrollbar { display: none; }
  .dashboard-photo-item { flex: 0 0 100px; cursor: pointer; }
  .dashboard-photo-item img { width: 100px; height: 100px; object-fit: cover; border-radius: 8px; border: 1px solid #e8e4dd; display: block; transition: transform 0.15s; }
  .dashboard-photo-item img:hover { transform: translateY(-2px); }
  .dashboard-photo-item-label { font-size: 11px; color: #8a8580; margin-top: 4px; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

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
  .event-row:hover .event-actions { opacity: 1 !important; }
  /* On touch devices always show actions */
  @media (hover: none) { .event-actions { opacity: 1 !important; } }

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

  /* Mobile bottom tab bar — hidden on desktop, shown on mobile via media query */
  .mobile-tabs {
    display: none;
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 200;
    background: #2d2a24; border-top: 1px solid #3d3a34;
    height: 60px; padding-bottom: env(safe-area-inset-bottom);
  }
  .mobile-tab {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    color: #6b6660; font-size: 9px; letter-spacing: 0.5px;
    text-transform: uppercase; gap: 3px; cursor: pointer;
    border: none; background: none; padding: 0;
  }
  .mobile-tab.active { color: #e8c56d; }
  .mobile-tab-icon { font-size: 20px; line-height: 1; }

  /* Mobile planting card list — hidden on desktop */
  .mobile-planting-list { display: none; }

  /* Quick-action modal compact padding */
  .quick-action-modal { padding: 20px 16px 28px; }
  .quick-action-modal textarea {
    width: 100%; min-height: 100px; font-size: 16px;
    border: 1px solid #e8e4dd; border-radius: 8px; padding: 12px;
    font-family: 'DM Sans', sans-serif; resize: none; display: block;
    box-sizing: border-box;
  }

  @media (max-width: 640px) {
    .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; }
    .detail-layout { grid-template-columns: 1fr; }
    .cal-label { width: 100px; font-size: 10px; }

    /* Nav: hide links + utility buttons, keep logo */
    .nav-links { display: none; }
    .nav-right  { display: none; }
    .nav { padding: 0 16px; }

    /* Bottom padding clears fixed tab bar */
    .content { padding: 16px 12px 80px; }

    /* Show mobile tab bar */
    .mobile-tabs { display: flex; }

    /* Modals become bottom sheets */
    .modal-overlay { align-items: flex-end; padding: 0; }
    .modal { border-radius: 16px 16px 0 0; max-width: 100%; max-height: 85dvh; overflow-y: auto; -webkit-overflow-scrolling: touch; padding-bottom: calc(28px + env(safe-area-inset-bottom, 0px)); }

    /* Hide desktop table, show mobile cards */
    .mobile-hide { display: none; }
    .mobile-planting-list { display: block; }

    /* Photos tab mobile */
    .photos-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
    .photos-toggle { width: 100%; margin-bottom: 16px; }
    .photos-toggle-btn { flex: 1; text-align: center; padding: 10px 0; font-size: 14px; }
    .photos-group-header { font-size: 15px; }
    .photo-thumb-info { padding: 5px 7px; }
    .photo-thumb-label { font-size: 11px; }
  }
`;

// ── App Component ────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState('dashboard');
  const [selectedPlanting, setSelectedPlanting] = useState(null);
  const [showModal, setShowModal] = useState(null); // 'planting', 'event', 'photo', 'bulk-event'
  const [editData, setEditData] = useState({});
  const [modalError, setModalError] = useState(null);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedPlantingIds, setSelectedPlantingIds] = useState(new Set());
  const [showPlantingSummary, setShowPlantingSummary] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [plantingPhotos, setPlantingPhotos] = useState([]);
  const [mapHighlight, setMapHighlight] = useState(null);
  const [showMapThumbs, setShowMapThumbs] = useState(true);
  const [mapZoom, setMapZoom] = useState(1.25);
  const [selectedBed, setSelectedBed] = useState(null);
  const [gridCells, setGridCells] = useState([]);
  const [isDirtyLabels, setIsDirtyLabels] = useState(false);
  const [draggingLabel, setDraggingLabel] = useState(null);
  const [activePaintPlanting, setActivePaintPlanting] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mapEditMode, setMapEditMode] = useState(false);
  const [selectedPlantGuid, setSelectedPlantGuid] = useState(null);
  const [plantDetail, setPlantDetail] = useState(null);
  const [plantHarvests, setPlantHarvests] = useState([]);
  const [plantPhotos, setPlantPhotos] = useState([]);
  const [plantPanelLoading, setPlantPanelLoading] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [expandedPlantingIds, setExpandedPlantingIds] = useState(new Set());
  const [collapsedCategories, setCollapsedCategories] = useState(new Set());
  const [collapsedSeedCategories, setCollapsedSeedCategories] = useState(new Set());
  const [recentActivity, setRecentActivity] = useState([]);

  const {
    seeds, setSeeds,
    structures, setStructures,
    plantings, setPlantings,
    lots, setLots,
    loading,
    mapGridCells, setMapGridCells,
    labelPositions, setLabelPositions,
    loadData,
  } = useAppData();

  const {
    allPhotos, setAllPhotos,
    photosGrouping, setPhotosGrouping,
    photosLightboxIndex, setPhotosLightboxIndex,
    loadAllPhotos,
  } = usePhotos();


  useEffect(() => { loadData(); }, [loadData]);

  // Refresh data whenever the user switches tabs
  useEffect(() => {
    if (view !== 'detail' && view !== 'bed-planner') loadData();
    if (view === 'photos' || view === 'dashboard') loadAllPhotos();
    if (view === 'dashboard') api.get('/api/dashboard/activity').then(setRecentActivity);
  }, [view]);

  // Lightbox keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e) => {
      if (e.key === 'ArrowRight') setLightboxIndex(i => Math.min(i + 1, plantingPhotos.length - 1));
      if (e.key === 'ArrowLeft')  setLightboxIndex(i => Math.max(i - 1, 0));
      if (e.key === 'Escape')     setLightboxIndex(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxIndex, plantingPhotos.length]);

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
      'first_harvest_date', 'status', 'notes', 'seed_lot_id'];
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
    if (!editData.event_type) { setModalError('Please select an event type.'); return; }
    try {
      const payload = {};
      ['event_date', 'event_type', 'details', 'severity', 'product_used', 'quantity'].forEach(k => {
        if (editData[k] !== undefined) payload[k] = editData[k];
      });
      let savedEventId = editData.id || null;
      if (editData.id) {
        await api.put(`/api/events/${editData.id}`, payload);
      } else {
        const res = await api.post(`/api/plantings/${selectedPlanting.id}/events`, payload);
        if (!res || res.detail) { setModalError(res?.detail || 'Failed to save event.'); return; }
        savedEventId = res.id || null;
      }
      // Upload any photos attached to this event, linked via event_id
      const attachedPhotos = (editData._photos || []).filter(f => f instanceof File);
      const photoDate = payload.event_date || new Date().toISOString().split('T')[0];
      for (const file of attachedPhotos) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('taken_date', photoDate);
        formData.append('caption', '');
        if (savedEventId) formData.append('event_id', String(savedEventId));
        await api.upload(`/api/plantings/${selectedPlanting.id}/photos`, formData);
      }
      if (attachedPhotos.length > 0) loadPhotos(selectedPlanting.id);
      setShowModal(null); setEditData({});
      loadData();
      const updated = await api.get('/api/plantings?year=2026');
      const refreshed = updated.find(p => p.id === selectedPlanting.id);
      if (refreshed) setSelectedPlanting(refreshed);
    } catch (err) {
      setModalError('Something went wrong. Please try again.');
      console.error('handleCreateEvent error:', err);
    }
  };

  const handleCreateBulkEvent = async () => {
    if (selectedPlantingIds.size === 0) return;
    if (!editData.event_type) { setModalError('Please select an event type.'); return; }
    const today = new Date().toISOString().split('T')[0];
    const payload = {
      planting_ids: Array.from(selectedPlantingIds),
      event_date: editData.event_date || today,
      event_type: editData.event_type,
    };
    if (editData.details) payload.details = editData.details;
    if (editData.severity) payload.severity = editData.severity;
    if (editData.product_used) payload.product_used = editData.product_used;
    await api.post('/api/events/bulk', payload);
    setShowModal(null);
    setEditData({});
    setBulkSelectMode(false);
    setSelectedPlantingIds(new Set());
    loadData();
  };

  // ── Lot (Seed Packet) Handlers ─────────────────────────────────────────────

  const [addLotSeedId, setAddLotSeedId] = useState(null); // seed to pre-select in AddLotModal
  const [editingLot, setEditingLot] = useState(null);

  const handleOpenAddLot = (seedId) => {
    setAddLotSeedId(seedId);
    setEditingLot(null);
    setShowModal('add-lot');
  };

  const handleOpenEditLot = (lot) => {
    setEditingLot(lot);
    setAddLotSeedId(null);
    setShowModal('add-lot');
  };

  const handleSubmitLot = async (payload, lotId) => {
    if (lotId) {
      await api.put(`/api/seed-lots/${lotId}`, payload);
    } else {
      await api.post('/api/seed-lots', payload);
    }
    const updatedLots = await api.get('/api/seed-lots');
    setLots(updatedLots);
    setShowModal(null);
    setEditingLot(null);
    setAddLotSeedId(null);
  };

  const handleDeleteLot = async (lotId) => {
    await api.del(`/api/seed-lots/${lotId}`);
    const updatedLots = await api.get('/api/seed-lots');
    setLots(updatedLots);
  };

  const handleDeleteEvent = async (eventId) => {
    await api.del(`/api/events/${eventId}`);
    loadData();
    const updated = await api.get('/api/plantings?year=2026');
    const refreshed = updated.find(p => p.id === selectedPlanting?.id);
    if (refreshed) setSelectedPlanting(refreshed);
  };

  const handleDeletePhoto = async (photoId) => {
    await api.del(`/api/photos/${photoId}`);
    const newPhotos = plantingPhotos.filter(p => p.id !== photoId);
    setPlantingPhotos(newPhotos);
    if (newPhotos.length === 0) {
      setLightboxIndex(null);
    } else {
      setLightboxIndex(prev => Math.min(prev, newPhotos.length - 1));
    }
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

  // ── Bed Planner callbacks ────────────────────────────────────────────────────

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

  // ── Main render ────────────────────────────────────────────────────────────

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Fraunces, serif', fontSize: 24, color: '#8a8580' }}>Loading Heirloom...</div>;

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <Nav
          view={view}
          setView={setView}
          onFetchImages={async () => {
            const res = await api.post('/api/seeds/fetch-images', {});
            alert(`Fetched images for ${res.updated} of ${res.total} plants.`);
            loadData();
          }}
          onExport={handleExport}
          onImport={handleImport}
        />

        <MobileTabBar view={view} setView={setView} />

        <div className="content" onMouseUp={() => { if (isDragging) { setIsDragging(false); loadData(); } }}>
          {view === 'dashboard' && (
            <Dashboard
              seeds={seeds}
              plantings={plantings}
              recentActivity={recentActivity}
              allPhotos={allPhotos}
              totalStarted={totalStarted}
              totalPlanted={totalPlanted}
              harvestingCount={harvestingCount}
              gardenMapContent={<GardenMap
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
              />}
              openPlantingDetail={openPlantingDetail}
              setEditData={setEditData}
              setShowModal={setShowModal}
              setView={setView}
              setPhotosLightboxIndex={setPhotosLightboxIndex}
            />
          )}
          {view === 'seeds' && (
            <Seeds
              seeds={seeds}
              lots={lots}
              editData={editData}
              setEditData={setEditData}
              showModal={showModal}
              setShowModal={setShowModal}
              collapsedSeedCategories={collapsedSeedCategories}
              setCollapsedSeedCategories={setCollapsedSeedCategories}
              loadData={loadData}
              onAddLot={handleOpenAddLot}
              onEditLot={handleOpenEditLot}
              onDeleteLot={handleDeleteLot}
            />
          )}
          {view === 'plantings' && (
            <Plantings
              plantings={plantings}
              seeds={seeds}
              structures={structures}
              mapGridCells={mapGridCells}
              expandedPlantingIds={expandedPlantingIds}
              setExpandedPlantingIds={setExpandedPlantingIds}
              collapsedCategories={collapsedCategories}
              setCollapsedCategories={setCollapsedCategories}
              showPlantingSummary={showPlantingSummary}
              setShowPlantingSummary={setShowPlantingSummary}
              openPlantingDetail={openPlantingDetail}
              openPlantPanel={openPlantPanel}
              handleDuplicatePlanting={handleDuplicatePlanting}
              handleDeletePlanting={handleDeletePlanting}
              setSelectedPlanting={setSelectedPlanting}
              setEditData={setEditData}
              setShowModal={setShowModal}
              loadData={loadData}
              bulkSelectMode={bulkSelectMode}
              setBulkSelectMode={setBulkSelectMode}
              selectedPlantingIds={selectedPlantingIds}
              setSelectedPlantingIds={setSelectedPlantingIds}
              onBulkLogEvent={() => {
                setEditData({ event_date: new Date().toISOString().split('T')[0] });
                setShowModal('bulk-event');
              }}
            />
          )}
          {view === 'calendar' && <CalendarView plantings={plantings} onPlantingClick={openPlantingDetail} />}
          {view === 'map' && (
            <GardenMapView
              structures={structures}
              plantings={plantings}
              seeds={seeds}
              mapGridCells={mapGridCells}
              labelPositions={labelPositions}
              setLabelPositions={setLabelPositions}
              mapZoom={mapZoom}
              setMapZoom={setMapZoom}
              mapEditMode={mapEditMode}
              setMapEditMode={setMapEditMode}
              showMapThumbs={showMapThumbs}
              setShowMapThumbs={setShowMapThumbs}
              mapHighlight={mapHighlight}
              setMapHighlight={setMapHighlight}
              draggingLabel={draggingLabel}
              setDraggingLabel={setDraggingLabel}
              isDirtyLabels={isDirtyLabels}
              setIsDirtyLabels={setIsDirtyLabels}
              openBedPlanner={openBedPlanner}
              openPlantPanel={openPlantPanel}
              plantingsByStructure={plantingsByStructure}
            />
          )}
          {view === 'photos' && <Photos allPhotos={allPhotos} photosGrouping={photosGrouping} setPhotosGrouping={setPhotosGrouping} setPhotosLightboxIndex={setPhotosLightboxIndex} />}
          {view === 'bed-planner' && (
            <BedPlanner
              selectedBed={selectedBed}
              setSelectedBed={setSelectedBed}
              gridCells={gridCells}
              setGridCells={setGridCells}
              activePaintPlanting={activePaintPlanting}
              setActivePaintPlanting={setActivePaintPlanting}
              isDragging={isDragging}
              setIsDragging={setIsDragging}
              plantings={plantings}
              seeds={seeds}
              setEditData={setEditData}
              setShowModal={setShowModal}
              openPlantPanel={openPlantPanel}
              handleCellPaint={handleCellPaint}
              handleCellDrag={handleCellDrag}
              handleClearPlanting={handleClearPlanting}
              loadData={loadData}
              setView={setView}
            />
          )}
          {view === 'detail' && (
            <Detail
              selectedPlanting={selectedPlanting}
              seeds={seeds}
              plantingPhotos={plantingPhotos}
              setView={setView}
              handleDuplicatePlanting={handleDuplicatePlanting}
              handleDeleteEvent={handleDeleteEvent}
              handleDeletePhoto={handleDeletePhoto}
              setEditData={setEditData}
              setShowModal={setShowModal}
              setLightboxIndex={setLightboxIndex}
            />
          )}
        </div>

        {(showModal === 'planting' || showModal === 'duplicate' || showModal === 'edit-planting') && (
          <PlantingModal
            editData={editData}
            setEditData={setEditData}
            seeds={seeds}
            setSeeds={setSeeds}
            structures={structures}
            lots={lots}
            modalError={modalError}
            setModalError={setModalError}
            onSubmit={showModal === 'edit-planting' ? handleUpdatePlanting : handleCreatePlanting}
            onClose={() => setShowModal(null)}
            isEdit={showModal === 'edit-planting'}
            title={showModal === 'duplicate' ? 'Duplicate Planting' : null}
          />
        )}

        {showModal === 'event' && (
          <EventModal
            editData={editData}
            setEditData={setEditData}
            modalError={modalError}
            setModalError={setModalError}
            onSubmit={handleCreateEvent}
            onClose={() => setShowModal(null)}
            selectedPlanting={selectedPlanting}
          />
        )}

        {showModal === 'bulk-event' && (
          <BulkEventModal
            editData={editData}
            setEditData={setEditData}
            modalError={modalError}
            setModalError={setModalError}
            onSubmit={handleCreateBulkEvent}
            onClose={() => { setShowModal(null); setEditData({}); setModalError(null); }}
            selectedPlantings={plantings.filter(p => selectedPlantingIds.has(p.id))}
          />
        )}

        {showModal === 'add-lot' && (
          <AddLotModal
            seeds={seeds}
            initialSeedId={addLotSeedId}
            editLot={editingLot}
            onSubmit={handleSubmitLot}
            onClose={() => { setShowModal(null); setEditingLot(null); setAddLotSeedId(null); }}
          />
        )}

        {showModal === 'photo' && (
          <PhotoModal
            onSubmit={handleUploadPhoto}
            onClose={() => setShowModal(null)}
          />
        )}

        {showModal === 'quick-note' && (
          <QuickNoteModal
            selectedPlanting={selectedPlanting}
            editData={editData}
            setEditData={setEditData}
            onClose={() => setShowModal(null)}
            onSave={async () => {
              if (!selectedPlanting || !editData.details?.trim()) return;
              await api.post(`/api/plantings/${selectedPlanting.id}/events`, {
                event_type: 'note',
                event_date: new Date().toISOString().split('T')[0],
                details: editData.details.trim(),
              });
              setShowModal(null); setEditData({});
              loadData();
              const updated = await api.get('/api/plantings?year=2026');
              const refreshed = updated.find(p => p.id === selectedPlanting.id);
              if (refreshed) setSelectedPlanting(refreshed);
            }}
          />
        )}

        {showModal === 'quick-photo' && (
          <QuickPhotoModal
            selectedPlanting={selectedPlanting}
            onClose={() => setShowModal(null)}
            onUpload={async (file) => {
              if (!selectedPlanting) return;
              const formData = new FormData();
              formData.append('file', file);
              formData.append('taken_date', new Date().toISOString().split('T')[0]);
              formData.append('caption', '');
              await api.upload(`/api/plantings/${selectedPlanting.id}/photos`, formData);
              setShowModal(null);
              loadData();
              if (view === 'detail') loadPhotos(selectedPlanting.id);
            }}
          />
        )}

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

        <PlantPanel
          selectedPlantGuid={selectedPlantGuid}
          plantDetail={plantDetail}
          setPlantDetail={setPlantDetail}
          plantPanelLoading={plantPanelLoading}
          plantHarvests={plantHarvests}
          setPlantHarvests={setPlantHarvests}
          plantPhotos={plantPhotos}
          setPlantPhotos={setPlantPhotos}
          closePlantPanel={closePlantPanel}
          refreshPlantMapCells={refreshPlantMapCells}
          setLightboxPhoto={setLightboxPhoto}
          setEditData={setEditData}
          setShowModal={setShowModal}
        />

        {photosLightboxIndex !== null && (
          <Lightbox
            photos={allPhotos}
            index={photosLightboxIndex}
            onClose={() => setPhotosLightboxIndex(null)}
            onPrev={() => setPhotosLightboxIndex(i => i - 1)}
            onNext={() => setPhotosLightboxIndex(i => i + 1)}
            titleKey="seed_name"
          />
        )}

        {lightboxIndex !== null && (
          <Lightbox
            photos={plantingPhotos}
            index={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onPrev={() => setLightboxIndex(i => i - 1)}
            onNext={() => setLightboxIndex(i => i + 1)}
            onDelete={handleDeletePhoto}
          />
        )}
      </div>
    </>
  );
}
