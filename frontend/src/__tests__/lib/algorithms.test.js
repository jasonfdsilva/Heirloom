import { describe, it, expect } from 'vitest';
import { clusterCells, getSuggestedDates } from '../../lib/algorithms';

describe('clusterCells', () => {
  it('returns empty array for no cells', () => {
    expect(clusterCells([])).toEqual([]);
  });

  it('returns single cluster for a single cell', () => {
    const cells = [{ row: 0, col: 0 }];
    const clusters = clusterCells(cells);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toHaveLength(1);
  });

  it('groups adjacent cells into one cluster', () => {
    const cells = [{ row: 0, col: 0 }, { row: 0, col: 1 }];
    const clusters = clusterCells(cells, 3);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toHaveLength(2);
  });

  it('keeps far-apart cells in separate clusters', () => {
    const cells = [{ row: 0, col: 0 }, { row: 10, col: 10 }];
    const clusters = clusterCells(cells, 3);
    expect(clusters).toHaveLength(2);
  });

  it('groups cells within maxGap Chebyshev distance', () => {
    // cells at (0,0) and (3,3): Chebyshev distance = 3, within maxGap=3
    const cells = [{ row: 0, col: 0 }, { row: 3, col: 3 }];
    const clusters = clusterCells(cells, 3);
    expect(clusters).toHaveLength(1);
  });

  it('separates cells just beyond maxGap', () => {
    // cells at (0,0) and (4,4): Chebyshev distance = 4, beyond maxGap=3
    const cells = [{ row: 0, col: 0 }, { row: 4, col: 4 }];
    const clusters = clusterCells(cells, 3);
    expect(clusters).toHaveLength(2);
  });

  it('handles many cells in one cluster', () => {
    const cells = [
      { row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 },
      { row: 0, col: 1 }, { row: 1, col: 1 },
    ];
    const clusters = clusterCells(cells, 1);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toHaveLength(5);
  });
});

describe('getSuggestedDates', () => {
  // lastFrost is hardcoded to April 15, 2026 in the function

  it('returns empty object when seed has neither start_indoors nor direct_sow', () => {
    const dates = getSuggestedDates({ start_indoors: 0, direct_sow: 0, category: 'Tomatoes' });
    expect(dates).toEqual({});
  });

  it('computes indoor dates when start_indoors is set', () => {
    const dates = getSuggestedDates({ start_indoors: 1, direct_sow: 0, suggested_indoor_weeks: 6 });
    expect(dates.indoor_start_date).toBe('2026-03-04'); // April 15 - 42 days
    expect(dates.hardening_date).toBe('2026-04-08');    // April 15 - 7 days
    expect(dates.transplant_date).toBe('2026-04-15');   // frost date
    expect(dates.direct_sow_date).toBeUndefined();
  });

  it('uses default 6 weeks when suggested_indoor_weeks is missing', () => {
    const dates = getSuggestedDates({ start_indoors: 1, direct_sow: 0 });
    expect(dates.indoor_start_date).toBe('2026-03-04');
  });

  it('uses custom suggested_indoor_weeks', () => {
    const dates = getSuggestedDates({ start_indoors: 1, direct_sow: 0, suggested_indoor_weeks: 8 });
    expect(dates.indoor_start_date).toBe('2026-02-18'); // April 15 - 56 days
  });

  it('computes direct_sow_date on frost date for non-Greens categories', () => {
    const dates = getSuggestedDates({ start_indoors: 0, direct_sow: 1, category: 'Tomatoes' });
    expect(dates.direct_sow_date).toBe('2026-04-15');
    expect(dates.indoor_start_date).toBeUndefined();
  });

  it('computes direct_sow_date 14 days before frost for Greens', () => {
    const dates = getSuggestedDates({ start_indoors: 0, direct_sow: 1, category: 'Greens' });
    expect(dates.direct_sow_date).toBe('2026-04-01'); // April 15 - 14 days
  });

  it('computes direct_sow_date 14 days before frost for Root Vegetables', () => {
    const dates = getSuggestedDates({ start_indoors: 0, direct_sow: 1, category: 'Root Vegetables' });
    expect(dates.direct_sow_date).toBe('2026-04-01');
  });

  it('computes all dates when both start_indoors and direct_sow are set', () => {
    const dates = getSuggestedDates({ start_indoors: 1, direct_sow: 1, suggested_indoor_weeks: 6, category: 'Peppers' });
    expect(dates.indoor_start_date).toBe('2026-03-04');
    expect(dates.hardening_date).toBe('2026-04-08');
    expect(dates.transplant_date).toBe('2026-04-15');
    expect(dates.direct_sow_date).toBe('2026-04-15');
  });
});
