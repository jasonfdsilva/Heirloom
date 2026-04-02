// BFS clustering: groups cells where any two cells are within maxGap Chebyshev distance
export const clusterCells = (cells, maxGap = 3) => {
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

export const getSuggestedDates = (seed) => {
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
      sowDate.setDate(sowDate.getDate() - 14);
    }
    dates.direct_sow_date = sowDate.toISOString().split('T')[0];
  }
  return dates;
};
