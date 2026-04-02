import { CATEGORY_COLORS } from './constants';

export const catColor = (cat) => CATEGORY_COLORS[cat] || '#6b7280';

export const statusColor = (status) => {
  const map = {
    planned: '#9ca3af', started: '#8b5cf6', hardening: '#f59e0b',
    transplanted: '#3b82f6', growing: '#16a34a', harvesting: '#ea580c', done: '#6b7280',
  };
  return map[status] || '#9ca3af';
};
