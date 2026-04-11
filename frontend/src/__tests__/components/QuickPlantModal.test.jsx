import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import QuickPlantModal from '../../components/modals/QuickPlantModal';

vi.mock('../../lib/api', () => ({
  default: {
    post: vi.fn().mockResolvedValue({ id: 42, message: 'Planting created' }),
  },
}));

import api from '../../lib/api';

const SEEDS = [
  { id: 1, name: 'Buttercrunch Lettuce', category: 'Greens', direct_sow: true, start_indoors: false },
  { id: 2, name: 'Sun Gold Tomato', category: 'Tomatoes', direct_sow: false, start_indoors: true },
  { id: 3, name: 'Shishito Pepper', category: 'Peppers', direct_sow: false, start_indoors: false },
];

const defaultProps = {
  seeds: SEEDS,
  structureId: 'test-bed-1',
  onCreated: vi.fn(),
  onClose: vi.fn(),
};

describe('QuickPlantModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.post.mockResolvedValue({ id: 42, message: 'Planting created' });
  });

  it('renders the modal title', () => {
    render(<QuickPlantModal {...defaultProps} />);
    expect(screen.getByText('🌱 Plant Now')).toBeInTheDocument();
  });

  it('renders the seed filter input', () => {
    render(<QuickPlantModal {...defaultProps} />);
    expect(screen.getByPlaceholderText('Filter by name...')).toBeInTheDocument();
  });

  it('renders seed options grouped by category', () => {
    render(<QuickPlantModal {...defaultProps} />);
    expect(screen.getByText('Buttercrunch Lettuce')).toBeInTheDocument();
    expect(screen.getByText('Sun Gold Tomato')).toBeInTheDocument();
    expect(screen.getByText('Shishito Pepper')).toBeInTheDocument();
  });

  it('filter input narrows the seed list', () => {
    render(<QuickPlantModal {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText('Filter by name...'), { target: { value: 'Lettuce' } });
    expect(screen.getByText('Buttercrunch Lettuce')).toBeInTheDocument();
    expect(screen.queryByText('Sun Gold Tomato')).not.toBeInTheDocument();
  });

  it('renders Direct Sow and Nursery Buy method buttons', () => {
    render(<QuickPlantModal {...defaultProps} />);
    expect(screen.getByRole('button', { name: /Direct Sow/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Nursery Buy/ })).toBeInTheDocument();
  });

  it('date input defaults to today', () => {
    const today = new Date().toISOString().slice(0, 10);
    const { container } = render(<QuickPlantModal {...defaultProps} />);
    const dateInput = container.querySelector('input[type="date"]');
    expect(dateInput.value).toBe(today);
  });

  it('shows Sow Date label when method is direct', () => {
    render(<QuickPlantModal {...defaultProps} />);
    // Default method is direct
    expect(screen.getByText('Sow Date')).toBeInTheDocument();
  });

  it('label changes to Planted Date when Nursery Buy is selected', () => {
    render(<QuickPlantModal {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Nursery Buy/ }));
    expect(screen.getByText('Planted Date')).toBeInTheDocument();
    expect(screen.queryByText('Sow Date')).not.toBeInTheDocument();
  });

  it('selecting a seed sets it as selected and shows summary', () => {
    render(<QuickPlantModal {...defaultProps} />);
    const select = screen.getByRole('listbox');
    fireEvent.change(select, { target: { value: '1' } });
    // Summary div appears: "Selected: <Name> (Category)"
    expect(screen.getByText(/Selected:/)).toBeInTheDocument();
  });

  it('selecting a direct_sow seed auto-sets method to direct', () => {
    render(<QuickPlantModal {...defaultProps} />);
    const select = screen.getByRole('listbox');
    // First switch to nursery
    fireEvent.click(screen.getByRole('button', { name: /Nursery Buy/ }));
    expect(screen.getByText('Planted Date')).toBeInTheDocument();
    // Select a direct-sow seed
    fireEvent.change(select, { target: { value: '1' } }); // Buttercrunch: direct_sow=true
    expect(screen.getByText('Sow Date')).toBeInTheDocument();
  });

  it('selecting a start_indoors seed auto-sets method to nursery', () => {
    render(<QuickPlantModal {...defaultProps} />);
    const select = screen.getByRole('listbox');
    fireEvent.change(select, { target: { value: '2' } }); // Sun Gold: start_indoors=true
    expect(screen.getByText('Planted Date')).toBeInTheDocument();
  });

  it('Start Planting button is disabled when no seed is selected', () => {
    render(<QuickPlantModal {...defaultProps} />);
    const btn = screen.getByRole('button', { name: /Start Planting/ });
    expect(btn).toBeDisabled();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('submits with correct direct sow payload and calls onCreated', async () => {
    const onCreated = vi.fn();
    render(<QuickPlantModal {...defaultProps} onCreated={onCreated} />);
    // Select lettuce (direct sow)
    fireEvent.change(screen.getByRole('listbox'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: /Start Planting/ }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(42));
    expect(api.post).toHaveBeenCalledWith('/api/plantings', expect.objectContaining({
      seed_id: 1,
      structure_id: 'test-bed-1',
      method: 'direct',
      year: new Date().getFullYear(),
      status: 'active',
      direct_sow_date: expect.any(String),
    }));
    // nursery field should not be present
    const call = api.post.mock.calls[0][1];
    expect(call).not.toHaveProperty('planted_out_date');
  });

  it('submits with planted_out_date when method is nursery', async () => {
    const onCreated = vi.fn();
    render(<QuickPlantModal {...defaultProps} onCreated={onCreated} />);
    fireEvent.change(screen.getByRole('listbox'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: /Nursery Buy/ }));
    fireEvent.click(screen.getByRole('button', { name: /Start Planting/ }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(42));
    const call = api.post.mock.calls[0][1];
    expect(call).toHaveProperty('planted_out_date');
    expect(call).not.toHaveProperty('direct_sow_date');
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<QuickPlantModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when overlay is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<QuickPlantModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(container.querySelector('.modal-overlay'));
    expect(onClose).toHaveBeenCalled();
  });

  it('does not close when inner modal is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<QuickPlantModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(container.querySelector('.modal'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows error message from api failure', async () => {
    api.post.mockRejectedValueOnce({ detail: 'Seed not found' });
    render(<QuickPlantModal {...defaultProps} />);
    fireEvent.change(screen.getByRole('listbox'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: /Start Planting/ }));
    await waitFor(() => {
      expect(screen.getByText('Seed not found')).toBeInTheDocument();
    });
  });

  // ── Inline new seed form ──────────────────────────────────────────────────────

  it('toggles the new seed form when "+ New seed" is clicked', () => {
    render(<QuickPlantModal {...defaultProps} />);
    expect(screen.queryByPlaceholderText(/Cherokee Purple/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /New seed/ }));
    expect(screen.getByPlaceholderText(/Cherokee Purple/)).toBeInTheDocument();
  });

  it('hides seed dropdown when new seed form is open', () => {
    render(<QuickPlantModal {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /New seed/ }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('shows validation error when submitting new seed without name', async () => {
    render(<QuickPlantModal {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /New seed/ }));
    fireEvent.click(screen.getByRole('button', { name: /Add seed/ }));
    await waitFor(() => {
      expect(screen.getByText('Seed name and category are required.')).toBeInTheDocument();
    });
    expect(api.post).not.toHaveBeenCalled();
  });

  it('creates a new seed and selects it automatically', async () => {
    api.post
      .mockResolvedValueOnce({ id: 99, name: 'New Test Seed', category: 'Herbs', direct_sow: true, start_indoors: false })
      .mockResolvedValue({ id: 42, message: 'Planting created' });

    const extendedSeeds = [...SEEDS, { id: 99, name: 'New Test Seed', category: 'Herbs', direct_sow: true, start_indoors: false }];
    render(<QuickPlantModal {...defaultProps} seeds={extendedSeeds} />);

    fireEvent.click(screen.getByRole('button', { name: /New seed/ }));
    fireEvent.change(screen.getByPlaceholderText(/Cherokee Purple/), { target: { value: 'New Test Seed' } });
    const categorySelect = screen.getAllByRole('combobox').find(s => s.querySelector('option[value="Herbs"]'));
    fireEvent.change(categorySelect, { target: { value: 'Herbs' } });
    fireEvent.click(screen.getByRole('button', { name: /Add seed/ }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/seeds', expect.objectContaining({
        name: 'New Test Seed',
        category: 'Herbs',
      }));
    });
  });
});
