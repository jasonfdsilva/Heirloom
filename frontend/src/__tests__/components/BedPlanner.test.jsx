import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BedPlanner from '../../components/views/BedPlanner';

// Minimal fixtures
const BED = { id: 'bed-1', name: 'Bed 1', width: 4, length: 4 };

const SEEDS = [
  { id: 'lettuce', name: 'Buttercrunch Lettuce', category: 'Greens', image_url: null, spacing_inches: 6 },
];

const PLANTINGS = [
  { id: 10, seed_id: 'lettuce', seed_name: 'Buttercrunch Lettuce', category: 'Greens',
    structure_id: 'bed-1', grid_structures: ['bed-1'], unplaced_count: 0,
    qty_started: 12, indoor_start_date: null },
];

// Two cells placed for planting 10
const GRID_CELLS = [
  { row: 0, col: 0, planting_id: 10, plant_guid: 'guid-1', short_id: 'BL-01', seed_name: 'Buttercrunch Lettuce', seed_id: 'lettuce', category: 'Greens', spacing_inches: 6 },
  { row: 0, col: 1, planting_id: 10, plant_guid: 'guid-2', short_id: 'BL-02', seed_name: 'Buttercrunch Lettuce', seed_id: 'lettuce', category: 'Greens', spacing_inches: 6 },
];

const defaultProps = {
  selectedBed: BED,
  setSelectedBed: vi.fn(),
  gridCells: GRID_CELLS,
  setGridCells: vi.fn(),
  activePaintPlanting: null,
  setActivePaintPlanting: vi.fn(),
  isDragging: false,
  setIsDragging: vi.fn(),
  plantings: PLANTINGS,
  seeds: SEEDS,
  setEditData: vi.fn(),
  setShowModal: vi.fn(),
  openPlantPanel: vi.fn(),
  handleCellPaint: vi.fn(),
  handleCellDrag: vi.fn(),
  handleClearPlanting: vi.fn(),
  loadData: vi.fn(),
  setView: vi.fn(),
  selectedGridPlanting: null,
  onGridCellSelect: vi.fn(),
  onGridEditPlanting: vi.fn(),
  onGridLogEvent: vi.fn(),
};

describe('BedPlanner', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Action strip ──────────────────────────────────────────────────────────────

  it('action strip is hidden when no grid planting is selected', () => {
    render(<BedPlanner {...defaultProps} selectedGridPlanting={null} />);
    expect(screen.queryByText(/✏️ Edit/)).not.toBeInTheDocument();
    expect(screen.queryByText(/📋 Log Event/)).not.toBeInTheDocument();
  });

  it('action strip renders with planting name when selectedGridPlanting is set', () => {
    render(<BedPlanner {...defaultProps} selectedGridPlanting={PLANTINGS[0]} />);
    // The action strip shows "🌿 <name>" — match the emoji prefix to distinguish from the palette
    expect(screen.getByText(/🌿 Buttercrunch Lettuce/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /✏️ Edit/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /📋 Log Event/ })).toBeInTheDocument();
  });

  it('× button calls onGridCellSelect(null)', () => {
    const onGridCellSelect = vi.fn();
    render(<BedPlanner {...defaultProps} selectedGridPlanting={PLANTINGS[0]} onGridCellSelect={onGridCellSelect} />);
    fireEvent.click(screen.getByRole('button', { name: '×' }));
    expect(onGridCellSelect).toHaveBeenCalledWith(null);
  });

  it('Edit button calls onGridEditPlanting', () => {
    const onGridEditPlanting = vi.fn();
    render(<BedPlanner {...defaultProps} selectedGridPlanting={PLANTINGS[0]} onGridEditPlanting={onGridEditPlanting} />);
    fireEvent.click(screen.getByRole('button', { name: /✏️ Edit/ }));
    expect(onGridEditPlanting).toHaveBeenCalled();
  });

  it('Log Event button calls onGridLogEvent', () => {
    const onGridLogEvent = vi.fn();
    render(<BedPlanner {...defaultProps} selectedGridPlanting={PLANTINGS[0]} onGridLogEvent={onGridLogEvent} />);
    fireEvent.click(screen.getByRole('button', { name: /📋 Log Event/ }));
    expect(onGridLogEvent).toHaveBeenCalled();
  });

  // ── Cell click — idle mode ────────────────────────────────────────────────────

  it('clicking an occupied cell in idle mode calls onGridCellSelect with its planting_id', () => {
    const onGridCellSelect = vi.fn();
    const { container } = render(<BedPlanner {...defaultProps} onGridCellSelect={onGridCellSelect} />);
    // First cell (row=0, col=0) has planting_id=10
    const cells = container.querySelectorAll('[title*="Buttercrunch Lettuce"]');
    fireEvent.mouseDown(cells[0]);
    expect(onGridCellSelect).toHaveBeenCalledWith(10);
  });

  it('clicking an empty cell in idle mode calls onGridCellSelect(null)', () => {
    const onGridCellSelect = vi.fn();
    const { container } = render(<BedPlanner {...defaultProps} onGridCellSelect={onGridCellSelect} />);
    // Find an empty cell (title="Empty")
    const emptyCells = container.querySelectorAll('[title="Empty"]');
    fireEvent.mouseDown(emptyCells[0]);
    expect(onGridCellSelect).toHaveBeenCalledWith(null);
  });

  // ── Cell click — paint mode ───────────────────────────────────────────────────

  it('clicking a cell in paint mode calls handleCellPaint, NOT onGridCellSelect', () => {
    const handleCellPaint = vi.fn();
    const onGridCellSelect = vi.fn();
    const { container } = render(
      <BedPlanner
        {...defaultProps}
        activePaintPlanting={PLANTINGS[0]}
        handleCellPaint={handleCellPaint}
        onGridCellSelect={onGridCellSelect}
      />
    );
    const cells = container.querySelectorAll('[title*="Buttercrunch Lettuce"]');
    fireEvent.mouseDown(cells[0]);
    expect(handleCellPaint).toHaveBeenCalled();
    expect(onGridCellSelect).not.toHaveBeenCalled();
  });

  // ── Status text ───────────────────────────────────────────────────────────────

  it('shows default hint when nothing is selected', () => {
    render(<BedPlanner {...defaultProps} />);
    // The footer below the grid uses "or choose a planting from the sidebar"
    expect(screen.getByText(/or choose a planting from the sidebar to paint/)).toBeInTheDocument();
  });

  it('shows selected planting name in status text when grid planting is selected', () => {
    render(<BedPlanner {...defaultProps} selectedGridPlanting={PLANTINGS[0]} />);
    expect(screen.getByText(/Selected: Buttercrunch Lettuce/)).toBeInTheDocument();
  });

  it('shows painting status text when paint mode is active', () => {
    render(<BedPlanner {...defaultProps} activePaintPlanting={PLANTINGS[0]} />);
    expect(screen.getByText(/Painting: Buttercrunch Lettuce/)).toBeInTheDocument();
  });
});
