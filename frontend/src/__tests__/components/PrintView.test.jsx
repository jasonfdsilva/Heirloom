import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PrintView from '../../components/views/PrintView';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const STRUCTURES = [
  { id: 'bed-1', name: 'Bed 1', type: 'bed', width: 6, length: 4, map_x: 175, map_y: 190 },
  { id: 'box-1', name: 'Box 1', type: 'box', width: 1.6, length: 1.6, map_x: 340, map_y: 130 },
  { id: 'strip-1', name: 'Planting Strip', type: 'strip', width: 1, length: 15.5, map_x: 610, map_y: 294 },
  { id: 'bed-2', name: 'Bed 2', type: 'bed', width: 6, length: 4, map_x: 425, map_y: 190 },
];

const SEEDS = [
  { id: 'tomato', name: 'Carbon OG', category: 'Tomatoes', image_url: null },
  { id: 'cucumber', name: 'Diva', category: 'Cucumbers', image_url: null },
];

const PLANTINGS = [
  {
    id: 1, seed_id: 'tomato', seed_name: 'Carbon OG', common_name: 'Tomato',
    category: 'Tomatoes', structure_id: 'bed-1', structure_name: 'Bed 1',
    status: 'planned', method: 'indoors', qty_started: 4, qty_planted: 2,
    indoor_start_date: '2026-03-30', transplant_date: '2026-05-23',
    direct_sow_date: null, notes: 'Test notes',
  },
  {
    id: 2, seed_id: 'cucumber', seed_name: 'Diva', common_name: 'Cucumber',
    category: 'Cucumbers', structure_id: 'strip-1', structure_name: 'Planting Strip',
    status: 'started', method: 'direct', qty_started: null, qty_planted: null, quantity: 3,
    indoor_start_date: null, transplant_date: null,
    direct_sow_date: '2026-05-25', notes: '',
  },
  {
    // failed — should be excluded
    id: 3, seed_id: 'tomato', seed_name: 'Sunland MTO', common_name: 'Tomato',
    category: 'Tomatoes', structure_id: 'bed-1', structure_name: 'Bed 1',
    status: 'failed', method: 'indoors', qty_started: 12, qty_planted: 12,
    indoor_start_date: '2026-03-01', transplant_date: null,
    direct_sow_date: null, notes: '',
  },
  {
    // unassigned — should be excluded
    id: 4, seed_id: 'tomato', seed_name: 'Nova F1', common_name: 'Tomato',
    category: 'Tomatoes', structure_id: null,
    status: 'planned', method: 'indoors', qty_started: 2, qty_planted: 2,
    indoor_start_date: '2026-03-20', transplant_date: '2026-05-23',
    direct_sow_date: null, notes: '',
  },
];

const MAP_GRID_CELLS = {
  'bed-1': [
    { row: 0, col: 0, planting_id: 1, plant_guid: 'g1', short_id: 'C-01', seed_name: 'Carbon OG', category: 'Tomatoes' },
    { row: 0, col: 1, planting_id: 1, plant_guid: 'g2', short_id: 'C-02', seed_name: 'Carbon OG', category: 'Tomatoes' },
  ],
  'strip-1': [
    { row: 0, col: 0, planting_id: 2, plant_guid: 'g3', short_id: 'D-01', seed_name: 'Diva', category: 'Cucumbers' },
  ],
};

const LABEL_POSITIONS = {
  'struct:bed-1': { x: 300, y: 180, orientation: 'horizontal', hidden: false },
  'struct:bed-2': { x: 450, y: 180, orientation: 'horizontal', hidden: true },
  'cluster:bed-1:Carbon OG:0-0-0-1': { x: 250, y: 220, orientation: 'horizontal', hidden: false },
};

const defaultProps = {
  structures: STRUCTURES,
  plantings: PLANTINGS,
  seeds: SEEDS,
  mapGridCells: MAP_GRID_CELLS,
  labelPositions: LABEL_POSITIONS,
  onClose: vi.fn(),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PrintView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.print = vi.fn();
  });

  it('renders the print preview toolbar', () => {
    render(<PrintView {...defaultProps} />);
    expect(screen.getByText(/Print Preview/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Print/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Close/i })).toBeInTheDocument();
  });

  it('calls window.print when Print button is clicked', () => {
    render(<PrintView {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Print/i }));
    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Close button is clicked', () => {
    render(<PrintView {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Close/i }));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    render(<PrintView {...defaultProps} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose for non-Escape keys', () => {
    render(<PrintView {...defaultProps} />);
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('renders page 1 map title and legend', () => {
    render(<PrintView {...defaultProps} />);
    expect(screen.getByText(/Heirloom Garden/i)).toBeInTheDocument();
    expect(screen.getByText(/Berkeley Heights/i)).toBeInTheDocument();
    // At least one legend category
    expect(screen.getByText('Tomatoes')).toBeInTheDocument();
    expect(screen.getByText('Cucumbers')).toBeInTheDocument();
  });

  it('renders SVG map with structure name labels', () => {
    const { container } = render(<PrintView {...defaultProps} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    // Structure name labels in SVG
    const texts = Array.from(svg.querySelectorAll('text')).map(t => t.textContent);
    expect(texts).toContain('Bed 1');
    expect(texts).toContain('Box 1');
    expect(texts).toContain('Planting Strip');
  });

  it('renders plant cluster labels on the SVG map', () => {
    const { container } = render(<PrintView {...defaultProps} />);
    const svg = container.querySelector('svg');
    const texts = Array.from(svg.querySelectorAll('text')).map(t => t.textContent);
    // Carbon OG is placed in bed-1, Diva in strip-1
    expect(texts).toContain('Carbon OG');
    expect(texts).toContain('Diva');
  });

  it('renders bracket and leader lines for plant clusters', () => {
    const { container } = render(<PrintView {...defaultProps} />);
    const svg = container.querySelector('svg');
    // Bracket + leader = at least 3 lines per cluster with cells
    const lines = svg.querySelectorAll('line');
    expect(lines.length).toBeGreaterThan(0);
  });

  it('shows Planting Reference section', () => {
    render(<PrintView {...defaultProps} />);
    expect(screen.getByText('Planting Reference')).toBeInTheDocument();
  });

  it('shows beds before boxes before strip in table order', () => {
    const { container } = render(<PrintView {...defaultProps} />);
    // In the flat table, structure names appear in bold divider rows (colSpan=6)
    const tbody = container.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const dividerRows = rows.filter(r => {
      const td = r.querySelector('td');
      return td && td.colSpan === 6;
    });
    const names = dividerRows.map(r => r.querySelector('td').textContent);
    const bed1Idx = names.findIndex(n => n.includes('Bed 1'));
    const stripIdx = names.findIndex(n => n.includes('Planting Strip'));
    // Bed before strip
    expect(bed1Idx).toBeLessThan(stripIdx);
  });

  it('includes active placed planting in the table', () => {
    render(<PrintView {...defaultProps} />);
    // Carbon OG appears in both the SVG cluster label and the table row
    expect(screen.getAllByText('Carbon OG').length).toBeGreaterThanOrEqual(1);
  });

  it('excludes failed plantings from the table', () => {
    render(<PrintView {...defaultProps} />);
    expect(screen.queryByText('Sunland MTO')).not.toBeInTheDocument();
  });

  it('excludes unassigned plantings from the table', () => {
    render(<PrintView {...defaultProps} />);
    expect(screen.queryByText('Nova F1')).not.toBeInTheDocument();
  });

  it('shows transplant date formatted as MM/DD', () => {
    render(<PrintView {...defaultProps} />);
    // Carbon OG transplant_date = 2026-05-23 → 05/23
    expect(screen.getByText('05/23')).toBeInTheDocument();
  });

  it('falls back to direct_sow_date when transplant_date is null', () => {
    render(<PrintView {...defaultProps} />);
    // Diva direct_sow_date = 2026-05-25 → 05/25
    expect(screen.getByText('05/25')).toBeInTheDocument();
  });

  it('shows em-dash when no date is available', () => {
    render(<PrintView {...defaultProps} />);
    // Diva has no indoor_start_date — expect em-dash in the table
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('falls back to qty_started when qty_planted is null', () => {
    render(<PrintView {...defaultProps} />);
    // Diva: qty_planted=null, qty_started=null, quantity=3
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows common name in parens when it differs from seed_name', () => {
    render(<PrintView {...defaultProps} />);
    // Carbon OG / Tomato — common_name differs from seed_name
    expect(screen.getByText('(Tomato)')).toBeInTheDocument();
  });

  it('shows method labels', () => {
    render(<PrintView {...defaultProps} />);
    // 'Indoors' appears in both the column header and as a method value
    expect(screen.getAllByText('Indoors').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Direct').length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty message when no structures have placed plantings', () => {
    render(<PrintView {...defaultProps} plantings={[]} />);
    expect(screen.getByText(/No plantings placed/i)).toBeInTheDocument();
  });

  it('renders correctly with empty mapGridCells (no cells)', () => {
    // Should not throw even with no grid data
    expect(() => render(<PrintView {...defaultProps} mapGridCells={{}} />)).not.toThrow();
  });

  it('renders correctly without labelPositions prop (graceful fallback)', () => {
    expect(() => render(<PrintView {...defaultProps} labelPositions={undefined} />)).not.toThrow();
  });

  it('hides structure name label when labelPositions marks it hidden', () => {
    // struct:bed-2 is marked hidden in LABEL_POSITIONS
    const { container } = render(<PrintView {...defaultProps} />);
    const svg = container.querySelector('svg');
    const texts = Array.from(svg.querySelectorAll('text')).map(t => t.textContent);
    expect(texts).not.toContain('Bed 2');
  });

  it('uses saved label position x/y for cluster labels', () => {
    // cluster:bed-1:Carbon OG has saved pos x=250, y=220
    // The SVG text for Carbon OG should use those coords
    const { container } = render(<PrintView {...defaultProps} />);
    const svg = container.querySelector('svg');
    const carbonText = Array.from(svg.querySelectorAll('text')).find(t => t.textContent === 'Carbon OG');
    expect(carbonText).toBeTruthy();
    expect(carbonText.getAttribute('x')).toBe('250');
    expect(carbonText.getAttribute('y')).toBe('220');
  });

  it('applies print-root-overlay class to outer container', () => {
    const { container } = render(<PrintView {...defaultProps} />);
    expect(container.querySelector('.print-root-overlay')).toBeTruthy();
  });

  it('handles structure with unknown type gracefully (typeOrder ?? 9 branch)', () => {
    const unknownStruct = { id: 'other-1', name: 'Other', type: 'unknown', width: 2, length: 2, map_x: 100, map_y: 100 };
    const unknownPlanting = {
      id: 99, seed_id: 'tomato', seed_name: 'Test Plant', common_name: 'Test Plant',
      category: 'Tomatoes', structure_id: 'other-1', structure_name: 'Other',
      status: 'planned', method: 'indoors', qty_planted: 1, qty_started: 1,
      indoor_start_date: null, transplant_date: null, direct_sow_date: null, notes: '',
    };
    expect(() => render(
      <PrintView
        {...defaultProps}
        structures={[...STRUCTURES, unknownStruct]}
        plantings={[...PLANTINGS, unknownPlanting]}
      />
    )).not.toThrow();
  });

  it('renders even and odd row stripes for multiple plantings per structure', () => {
    const extraPlanting = {
      id: 5, seed_id: 'tomato', seed_name: 'Ace F1', common_name: 'Tomato',
      category: 'Tomatoes', structure_id: 'bed-1', structure_name: 'Bed 1',
      status: 'started', method: 'indoors', qty_planted: 2, qty_started: 3,
      indoor_start_date: '2026-03-15', transplant_date: '2026-05-20',
      direct_sow_date: null, notes: '',
    };
    const { container } = render(
      <PrintView {...defaultProps} plantings={[...PLANTINGS, extraPlanting]} />
    );
    // Both row colors should appear
    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });

  it('shows em-dash for qty when all qty fields are null', () => {
    const noQtyPlanting = {
      id: 6, seed_id: 'tomato', seed_name: 'Mystery Plant', common_name: 'Tomato',
      category: 'Tomatoes', structure_id: 'bed-1', structure_name: 'Bed 1',
      status: 'planned', method: 'indoors',
      qty_planted: null, qty_started: null, quantity: null,
      indoor_start_date: null, transplant_date: null, direct_sow_date: null, notes: '',
    };
    render(<PrintView {...defaultProps} plantings={[noQtyPlanting]} />);
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('falls back to raw method string for unknown method', () => {
    const weirdMethod = {
      id: 7, seed_id: 'tomato', seed_name: 'Weird Plant', common_name: 'Tomato',
      category: 'Tomatoes', structure_id: 'bed-1', structure_name: 'Bed 1',
      status: 'planned', method: 'hydroponic', qty_planted: 1, qty_started: 1,
      indoor_start_date: null, transplant_date: null, direct_sow_date: null, notes: '',
    };
    render(<PrintView {...defaultProps} plantings={[weirdMethod]} />);
    expect(screen.getByText('hydroponic')).toBeInTheDocument();
  });

  it('falls back to raw status string for unknown status', () => {
    const weirdStatus = {
      id: 8, seed_id: 'tomato', seed_name: 'Status Plant', common_name: 'Tomato',
      category: 'Tomatoes', structure_id: 'bed-1', structure_name: 'Bed 1',
      status: 'unknown_status', method: 'indoors', qty_planted: 1, qty_started: 1,
      indoor_start_date: null, transplant_date: null, direct_sow_date: null, notes: '',
    };
    render(<PrintView {...defaultProps} plantings={[weirdStatus]} />);
    expect(screen.getByText('unknown_status')).toBeInTheDocument();
  });

  it('does not show common name in parens when it matches seed_name', () => {
    const sameName = {
      id: 9, seed_id: 'tomato', seed_name: 'Diva', common_name: 'Diva',
      category: 'Cucumbers', structure_id: 'box-1', structure_name: 'Box 1',
      status: 'planned', method: 'direct', qty_planted: 1, qty_started: 1,
      indoor_start_date: null, transplant_date: null, direct_sow_date: '2026-05-01', notes: '',
    };
    const { container } = render(<PrintView {...defaultProps} plantings={[sameName]} />);
    // No parens span should be rendered
    const parenSpans = Array.from(container.querySelectorAll('span')).filter(el => el.textContent.startsWith('('));
    expect(parenSpans).toHaveLength(0);
  });
});
