export const mockSeeds = [
  { id: 1, name: 'Buttercrunch Lettuce', category: 'Greens', organic: true, notes: 'Direct sow in spring' },
  { id: 2, name: 'Sun Gold', category: 'Tomatoes', organic: false, notes: null },
  { id: 3, name: 'Ace F1', category: 'Peppers', organic: false, notes: null },
];

export const mockPlantings = [
  {
    id: 1, seed_id: 2, seed_name: 'Sun Gold', category: 'Tomatoes',
    status: 'started', qty_started: 4, qty_planted: 2,
    indoor_start_date: '2026-03-01', transplant_date: '2026-04-15',
    structure_name: 'Bed 1', placed_count: 2, unplaced_count: 2,
  },
  {
    id: 2, seed_id: 3, seed_name: 'Ace F1', category: 'Peppers',
    status: 'transplanted', qty_started: 6, qty_planted: 4,
    indoor_start_date: '2026-02-15', transplant_date: '2026-04-20',
    structure_name: 'Bed 2', placed_count: 4, unplaced_count: 2,
  },
];

export const mockPhotos = [
  {
    id: 1, planting_id: 1, filename: 'abc123.jpg', caption: 'First sprouts',
    taken_date: '2026-03-10', seed_name: 'Sun Gold', category: 'Tomatoes',
  },
  {
    id: 2, planting_id: 2, filename: 'def456.jpg', caption: null,
    taken_date: '2026-03-15', seed_name: 'Ace F1', category: 'Peppers',
  },
];

export const mockEvents = [
  {
    id: 1, planting_id: 1, event_type: 'germinated', event_date: '2026-03-08',
    details: 'First true leaves showing', seed_name: 'Sun Gold',
  },
  {
    id: 2, planting_id: 1, event_type: 'note', event_date: '2026-03-15',
    details: 'Looking healthy', seed_name: 'Sun Gold',
  },
];
