export function deriveStatus(planting) {
  const events = Array.isArray(planting.all_event_types)
    ? planting.all_event_types
    : typeof planting.all_event_types === 'string' && planting.all_event_types
      ? planting.all_event_types.split(',')
      : [];

  const has = (type) => events.includes(type);
  const method = planting.method || 'indoors';

  if (has('failed'))    return { label: 'Failed',      color: '#6b7280', emoji: '💀' };
  if (has('harvested')) return { label: 'Harvested',   color: '#ca8a04', emoji: '🍅' };

  if (method === 'indoors') {
    if (has('transplanted'))  return { label: 'Transplanted', color: '#3b82f6', emoji: '🏡' };
    if (has('hardened'))      return { label: 'Hardened Off', color: '#f59e0b', emoji: '🌤️' };
    if (has('germinated'))    return { label: 'Germinated',   color: '#16a34a', emoji: '🌱' };
    if (has('sowed_indoors') || planting.indoor_start_date)
                              return { label: 'Started',      color: '#8b5cf6', emoji: '🌱' };
    return                           { label: 'Planned',      color: '#9ca3af', emoji: '📋' };
  }

  if (method === 'direct') {
    if (has('germinated'))    return { label: 'Germinated',   color: '#16a34a', emoji: '🌱' };
    if (has('sowed_direct') || planting.direct_sow_date)
                              return { label: 'Sowed Direct', color: '#65a30d', emoji: '🌿' };
    return                           { label: 'Planned',      color: '#9ca3af', emoji: '📋' };
  }

  if (method === 'nursery') {
    if (has('planted_out') || planting.planted_out_date)
                              return { label: 'Planted Out',  color: '#059669', emoji: '🌳' };
    if (has('purchased') || planting.purchased_date)
                              return { label: 'Purchased',    color: '#0891b2', emoji: '🛒' };
    return                           { label: 'Planned',      color: '#9ca3af', emoji: '📋' };
  }

  return { label: 'Planned', color: '#9ca3af', emoji: '📋' };
}
