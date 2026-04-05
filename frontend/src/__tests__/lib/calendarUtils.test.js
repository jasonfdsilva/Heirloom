import { describe, it, expect } from 'vitest';
import { dateToPercent, mergeBars, planningBars } from '../../lib/calendarUtils';

// ── dateToPercent ─────────────────────────────────────────────────────────────

describe('dateToPercent', () => {
  it('returns null for null input', () => {
    expect(dateToPercent(null)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(dateToPercent('')).toBeNull();
  });

  it('returns 0 for a date at the track start (Feb 1)', () => {
    expect(dateToPercent('2026-02-01', 1, 11)).toBe(0);
  });

  it('returns 100 for a date at or after the track end', () => {
    expect(dateToPercent('2026-12-31', 1, 11)).toBe(100);
  });

  it('returns a value between 0 and 100 for a mid-season date', () => {
    const pct = dateToPercent('2026-06-01', 1, 11);
    expect(pct).toBeGreaterThan(0);
    expect(pct).toBeLessThan(100);
  });

  it('earlier date produces smaller percentage than later date', () => {
    const apr = dateToPercent('2026-04-01', 1, 11);
    const jul = dateToPercent('2026-07-01', 1, 11);
    expect(apr).toBeLessThan(jul);
  });
});

// ── mergeBars ─────────────────────────────────────────────────────────────────

describe('mergeBars', () => {
  it('returns empty array for empty input', () => {
    expect(mergeBars([])).toEqual([]);
  });

  it('returns a single bar unchanged', () => {
    const bars = [{ left: 10, width: 20, color: '#16a34a', label: 'A', projected: true }];
    expect(mergeBars(bars)).toHaveLength(1);
    expect(mergeBars(bars)[0].width).toBe(20);
  });

  it('merges two overlapping bars of the same colour', () => {
    const bars = [
      { left: 10, width: 20, color: '#16a34a', label: 'A', projected: true },
      { left: 25, width: 20, color: '#16a34a', label: 'B', projected: true },
    ];
    const result = mergeBars(bars);
    expect(result).toHaveLength(1);
    expect(result[0].left).toBe(10);
    expect(result[0].width).toBe(35); // covers 10→45
  });

  it('merges adjacent (touching) bars of the same colour', () => {
    const bars = [
      { left: 10, width: 10, color: '#16a34a', label: 'A', projected: true },
      { left: 20, width: 10, color: '#16a34a', label: 'B', projected: true },
    ];
    const result = mergeBars(bars);
    expect(result).toHaveLength(1);
    expect(result[0].width).toBe(20);
  });

  it('does not merge non-overlapping bars of the same colour', () => {
    const bars = [
      { left: 10, width: 5, color: '#16a34a', label: 'A', projected: true },
      { left: 50, width: 5, color: '#16a34a', label: 'B', projected: true },
    ];
    const result = mergeBars(bars);
    expect(result).toHaveLength(2);
  });

  it('does not merge bars of different colours', () => {
    const bars = [
      { left: 10, width: 20, color: '#8b5cf6', label: 'A', projected: true },
      { left: 15, width: 20, color: '#16a34a', label: 'B', projected: true },
    ];
    const result = mergeBars(bars);
    expect(result).toHaveLength(2);
  });

  it('handles a bar fully contained within another', () => {
    const bars = [
      { left: 10, width: 40, color: '#16a34a', label: 'A', projected: true },
      { left: 20, width: 10, color: '#16a34a', label: 'B', projected: true },
    ];
    const result = mergeBars(bars);
    expect(result).toHaveLength(1);
    expect(result[0].left).toBe(10);
    expect(result[0].width).toBe(40);
  });

  it('merges multiple overlapping bars in one pass', () => {
    const bars = [
      { left: 0,  width: 15, color: '#16a34a', label: 'A', projected: true },
      { left: 10, width: 15, color: '#16a34a', label: 'B', projected: true },
      { left: 20, width: 15, color: '#16a34a', label: 'C', projected: true },
    ];
    const result = mergeBars(bars);
    expect(result).toHaveLength(1);
    expect(result[0].left).toBe(0);
    expect(result[0].width).toBe(35);
  });
});

// ── planningBars ──────────────────────────────────────────────────────────────

describe('planningBars', () => {
  it('returns empty array when no date fields are set', () => {
    expect(planningBars({ method: 'indoors' })).toEqual([]);
  });

  it('all bars are marked projected:true', () => {
    const p = {
      method: 'indoors',
      indoor_start_date: '2026-03-01',
      hardening_date: '2026-04-15',
      transplant_date: '2026-05-01',
    };
    const bars = planningBars(p);
    expect(bars.every(b => b.projected === true)).toBe(true);
  });

  describe('indoors method', () => {
    it('produces a purple bar when indoor_start_date is set', () => {
      const bars = planningBars({ method: 'indoors', indoor_start_date: '2026-03-01' });
      expect(bars.some(b => b.color === '#8b5cf6')).toBe(true);
    });

    it('produces an amber bar when hardening_date is set', () => {
      const bars = planningBars({ method: 'indoors', indoor_start_date: '2026-03-01', hardening_date: '2026-04-15' });
      expect(bars.some(b => b.color === '#f59e0b')).toBe(true);
    });

    it('produces a green bar when transplant_date is set', () => {
      const bars = planningBars({ method: 'indoors', indoor_start_date: '2026-03-01', transplant_date: '2026-05-01' });
      expect(bars.some(b => b.color === '#16a34a')).toBe(true);
    });

    it('produces no bars without indoor_start_date', () => {
      const bars = planningBars({ method: 'indoors', hardening_date: '2026-04-15', transplant_date: '2026-05-01' });
      expect(bars.filter(b => b.color === '#8b5cf6')).toHaveLength(0);
    });
  });

  describe('direct method', () => {
    it('produces two green bars when direct_sow_date is set', () => {
      const bars = planningBars({ method: 'direct', direct_sow_date: '2026-04-15' });
      const green = bars.filter(b => b.color === '#16a34a');
      expect(green).toHaveLength(2);
    });

    it('germination bar starts after sow bar', () => {
      const bars = planningBars({ method: 'direct', direct_sow_date: '2026-04-15' });
      const sorted = [...bars].sort((a, b) => a.left - b.left);
      expect(sorted[0].left).toBeLessThan(sorted[1].left);
    });

    it('returns empty array when direct_sow_date is missing', () => {
      expect(planningBars({ method: 'direct' })).toEqual([]);
    });
  });

  describe('nursery method', () => {
    it('produces a teal bar when purchased_date is set', () => {
      const bars = planningBars({ method: 'nursery', purchased_date: '2026-05-01' });
      expect(bars.some(b => b.color === '#0891b2')).toBe(true);
    });

    it('produces a green bar when planted_out_date is set', () => {
      const bars = planningBars({ method: 'nursery', purchased_date: '2026-05-01', planted_out_date: '2026-05-15' });
      expect(bars.some(b => b.color === '#059669')).toBe(true);
    });

    it('returns empty array when no dates are set', () => {
      expect(planningBars({ method: 'nursery' })).toEqual([]);
    });
  });

  it('defaults to indoors method when method is missing', () => {
    const bars = planningBars({ indoor_start_date: '2026-03-01' });
    expect(bars.some(b => b.color === '#8b5cf6')).toBe(true);
  });

  it('all bars have positive width', () => {
    const p = {
      method: 'indoors',
      indoor_start_date: '2026-03-01',
      hardening_date: '2026-04-15',
      transplant_date: '2026-05-01',
    };
    planningBars(p).forEach(b => expect(b.width).toBeGreaterThan(0));
  });
});
