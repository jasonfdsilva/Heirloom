import { describe, it, expect } from 'vitest';
import { clusterCells } from '../../lib/algorithms';

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
