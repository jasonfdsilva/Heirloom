export const CATEGORY_COLORS = {
  Peppers: '#dc2626', Herbs: '#16a34a', Greens: '#65a30d', Tomatoes: '#ea580c',
  Beans: '#ca8a04', Brassicas: '#0891b2', Alliums: '#7c3aed',
  Cucurbits: '#059669', 'Root Vegetables': '#b45309',
};

export const STATUS_LABELS = {
  planned: '📋 Planned', started: '🌱 Started Indoors', hardening: '🌤️ Hardening Off',
  transplanted: '🏡 Transplanted', growing: '🌿 Growing', harvesting: '🍅 Harvesting', done: '✅ Done',
};

export const EVENT_TYPES = [
  { value: 'note', label: '📝 Note', color: '#8a8580' },
  { value: 'germination', label: '🌱 Germination', color: '#16a34a' },
  { value: 'fertilize', label: '🧪 Fertilize', color: '#7c3aed' },
  { value: 'disease', label: '🦠 Disease', color: '#dc2626' },
  { value: 'pest', label: '🐛 Pest', color: '#ea580c' },
  { value: 'prune', label: '✂️ Prune', color: '#16a34a' },
  { value: 'water', label: '💧 Water', color: '#0891b2' },
  { value: 'harvest', label: '🧺 Harvest', color: '#ca8a04' },
  { value: 'observation', label: '👁️ Observation', color: '#6b7280' },
  { value: 'weather', label: '⛈️ Weather', color: '#4b5563' },
];

export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export const PLANT_STATUSES = [
  { value: 'healthy',       label: 'Healthy',        color: '#16a34a' },
  { value: 'struggling',    label: 'Struggling',     color: '#f59e0b' },
  { value: 'dead',          label: 'Dead',           color: '#6b7280' },
  { value: 'harvested-out', label: 'Harvested Out',  color: '#7c3aed' },
];
