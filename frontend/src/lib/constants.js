export const CATEGORY_COLORS = {
  Peppers: '#dc2626', Herbs: '#16a34a', Greens: '#65a30d', Tomatoes: '#ea580c',
  Beans: '#ca8a04', Brassicas: '#0891b2', Alliums: '#7c3aed',
  Cucurbits: '#059669', 'Root Vegetables': '#b45309',
};

export const STATUS_LABELS = {
  planned:      '📋 Planned',
  started:      '🌱 Started',
  germinated:   '🌱 Germinated',
  hardened:     '🌤️ Hardened Off',
  transplanted: '🏡 Transplanted',
  sowed_direct: '🌿 Sowed Direct',
  purchased:    '🛒 Purchased',
  planted_out:  '🌳 Planted Out',
  harvested:    '🍅 Harvested',
  failed:       '💀 Failed',
};

export const EVENT_TYPES = [
  { value: 'note',          label: '📝 Note',           color: '#8a8580' },
  { value: 'sowed_indoors', label: '🏠 Sowed Indoors',  color: '#8b5cf6' },
  { value: 'germinated',    label: '🌱 Germinated',     color: '#16a34a' },
  { value: 'hardened',      label: '🌤️ Hardened Off',  color: '#f59e0b' },
  { value: 'transplanted',  label: '🏡 Transplanted',   color: '#3b82f6' },
  { value: 'purchased',     label: '🛒 Purchased',      color: '#0891b2' },
  { value: 'planted_out',   label: '🌳 Planted Out',    color: '#059669' },
  { value: 'harvested',     label: '🍅 Harvested',      color: '#ca8a04' },
  { value: 'issue',         label: '⚠️ Issue',          color: '#dc2626' },
  { value: 'treatment',     label: '💊 Treatment',      color: '#7c3aed' },
  { value: 'failed',        label: '💀 Failed',         color: '#6b7280' },
];

export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export const PLANT_STATUSES = [
  { value: 'healthy',       label: 'Healthy',        color: '#16a34a' },
  { value: 'struggling',    label: 'Struggling',     color: '#f59e0b' },
  { value: 'dead',          label: 'Dead',           color: '#6b7280' },
  { value: 'harvested-out', label: 'Harvested Out',  color: '#7c3aed' },
];
