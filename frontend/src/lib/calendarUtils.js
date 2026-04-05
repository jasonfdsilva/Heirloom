/**
 * calendarUtils.js
 *
 * Pure planning-calendar helpers. These operate solely on date fields from
 * planting records — no event log, no actuals. Everything produced here is
 * "planned / projected"; confirmed actuals will live in the future Actuals tab.
 */

/**
 * Convert a date string to a percentage position along a calendar track.
 * @param {string|null} dateStr  ISO date string e.g. "2026-04-15"
 * @param {number} startMonth    0-indexed month (0 = Jan, 1 = Feb …)
 * @param {number} endMonth      0-indexed month (inclusive)
 * @returns {number|null}        0–100 percentage, or null if dateStr is falsy
 */
export function dateToPercent(dateStr, startMonth = 1, endMonth = 11) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  const startDay = new Date(2026, startMonth, 1);
  const endDay   = new Date(2026, endMonth + 1, 0);
  const totalDays = Math.floor((endDay - startDay) / 86400000);
  const offset    = Math.floor((d - startDay) / 86400000);
  return Math.max(0, Math.min(100, (offset / totalDays) * 100));
}

/**
 * Merge overlapping (or touching) bars of the same colour so that stacked
 * semi-transparent fills don't compound into a visually darker shade.
 *
 * @param {Array<{left: number, width: number, color: string, label: string, projected: boolean}>} bars
 * @returns {Array}  Merged bar array (same shape, fewer or equal elements)
 */
export function mergeBars(bars) {
  const byColor = {};
  bars.forEach(b => {
    if (!byColor[b.color]) byColor[b.color] = [];
    byColor[b.color].push({ ...b });
  });

  const merged = [];
  Object.values(byColor).forEach(group => {
    group.sort((a, b) => a.left - b.left);
    let current = { ...group[0] };
    for (let i = 1; i < group.length; i++) {
      const next = group[i];
      if (next.left <= current.left + current.width) {
        // Overlapping or adjacent — extend current to cover both
        current.width = Math.max(current.left + current.width, next.left + next.width) - current.left;
      } else {
        merged.push(current);
        current = { ...next };
      }
    }
    merged.push(current);
  });

  return merged;
}

/**
 * Build an array of planning bars for a single planting record.
 * All bars are marked projected:true — this is a plan, not actuals.
 *
 * @param {object} p            Planting record from the API
 * @param {number} startMonth   0-indexed start month of the calendar track
 * @param {number} endMonth     0-indexed end month (inclusive)
 * @returns {Array}             Bar descriptors for CalendarView
 */
export function planningBars(p, startMonth = 1, endMonth = 11) {
  const bars = [];
  const method     = p.method || 'indoors';
  const harvestEnd = p.first_harvest_date || '2026-09-30';

  if (method === 'indoors') {
    // Purple: indoor start → hardening or transplant
    if (p.indoor_start_date) {
      const start = dateToPercent(p.indoor_start_date, startMonth, endMonth);
      const end   = dateToPercent(p.hardening_date || p.transplant_date || p.indoor_start_date, startMonth, endMonth);
      if (start !== null) bars.push({ left: start, width: Math.max(end - start, 1.5), color: '#8b5cf6', label: 'Indoors (planned)', projected: true });
    }
    // Amber: hardening → transplant
    if (p.hardening_date) {
      const start = dateToPercent(p.hardening_date, startMonth, endMonth);
      const end   = dateToPercent(p.transplant_date || p.hardening_date, startMonth, endMonth);
      if (start !== null) bars.push({ left: start, width: Math.max(end - start, 1.5), color: '#f59e0b', label: 'Hardening Off (planned)', projected: true });
    }
    // Green: transplant → harvest
    if (p.transplant_date) {
      const start = dateToPercent(p.transplant_date, startMonth, endMonth);
      const end   = dateToPercent(harvestEnd, startMonth, endMonth);
      if (start !== null) bars.push({ left: start, width: Math.max(end - start, 2), color: '#16a34a', label: 'Transplant → Harvest (planned)', projected: true });
    }
  } else if (method === 'direct') {
    if (p.direct_sow_date) {
      const projGerm = new Date(p.direct_sow_date + 'T00:00:00');
      projGerm.setDate(projGerm.getDate() + 10);
      const germStr = projGerm.toISOString().split('T')[0];
      // Sow → germination
      const start = dateToPercent(p.direct_sow_date, startMonth, endMonth);
      const end   = dateToPercent(germStr, startMonth, endMonth);
      if (start !== null) bars.push({ left: start, width: Math.max(end - start, 1.5), color: '#16a34a', label: 'Direct Sow → Germination (planned)', projected: true });
      // Germination → harvest
      const gStart = dateToPercent(germStr, startMonth, endMonth);
      const gEnd   = dateToPercent(harvestEnd, startMonth, endMonth);
      if (gStart !== null) bars.push({ left: gStart, width: Math.max(gEnd - gStart, 2), color: '#16a34a', label: 'Growing (planned)', projected: true });
    }
  } else if (method === 'nursery') {
    // Teal: purchased → planted out
    if (p.purchased_date) {
      const start = dateToPercent(p.purchased_date, startMonth, endMonth);
      const end   = dateToPercent(p.planted_out_date || p.purchased_date, startMonth, endMonth);
      if (start !== null) bars.push({ left: start, width: Math.max(end - start, 1.5), color: '#0891b2', label: 'At Nursery (planned)', projected: true });
    }
    // Green: planted out → harvest
    if (p.planted_out_date) {
      const start = dateToPercent(p.planted_out_date, startMonth, endMonth);
      const end   = dateToPercent(harvestEnd, startMonth, endMonth);
      if (start !== null) bars.push({ left: start, width: Math.max(end - start, 2), color: '#059669', label: 'Planted Out → Harvest (planned)', projected: true });
    }
  }

  return bars;
}
