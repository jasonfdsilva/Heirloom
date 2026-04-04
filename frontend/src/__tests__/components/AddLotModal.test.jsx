import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AddLotModal from '../../components/modals/AddLotModal';

// Mock the api module
vi.mock('../../lib/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ lot_code: 'BL-2026-001' }),
    upload: vi.fn(),
  },
}));

import api from '../../lib/api';

const SEEDS = [
  { id: 'test-lettuce', name: 'Buttercrunch Lettuce', category: 'Greens' },
  { id: 'test-tomato', name: 'Sun Gold', category: 'Tomatoes' },
  { id: 'test-pepper', name: 'Shishito', category: 'Peppers' },
];

const defaultProps = {
  seeds: SEEDS,
  initialSeedId: null,
  editLot: null,
  onSubmit: vi.fn(),
  onClose: vi.fn(),
};

describe('AddLotModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ lot_code: 'SG-2026-001' });
  });

  it('renders Manual and Scan Packet tabs for new lots', () => {
    render(<AddLotModal {...defaultProps} />);
    expect(screen.getByText('✏️ Manual')).toBeInTheDocument();
    expect(screen.getByText('📷 Scan Packet')).toBeInTheDocument();
  });

  it('starts on the Manual tab by default', () => {
    render(<AddLotModal {...defaultProps} />);
    expect(screen.getByText('Seed Variety')).toBeInTheDocument();
  });

  it('renders all Manual tab fields', () => {
    render(<AddLotModal {...defaultProps} />);
    expect(screen.getByText('Seed Variety')).toBeInTheDocument();
    expect(screen.getByText('Packed For Year')).toBeInTheDocument();
    expect(screen.getByText('Lot Code')).toBeInTheDocument();
    expect(screen.getByText('Purchased Year')).toBeInTheDocument();
    expect(screen.getByText('Supplier')).toBeInTheDocument();
    expect(screen.getByText('Supplier Lot #')).toBeInTheDocument();
    expect(screen.getByText('SKU')).toBeInTheDocument();
    expect(screen.getByText('Germination Rate (%)')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
  });

  it('switches to Scan tab when clicked', () => {
    render(<AddLotModal {...defaultProps} />);
    fireEvent.click(screen.getByText('📷 Scan Packet'));
    expect(screen.getByText('Upload Packet Image')).toBeInTheDocument();
    expect(screen.queryByText('Seed Variety')).not.toBeInTheDocument();
  });

  it('Scan tab renders file upload and Extract button', () => {
    render(<AddLotModal {...defaultProps} />);
    fireEvent.click(screen.getByText('📷 Scan Packet'));
    expect(screen.getByRole('button', { name: 'Extract from Packet' })).toBeInTheDocument();
    expect(screen.getByText('Upload Packet Image')).toBeInTheDocument();
  });

  it('pre-selects seed when initialSeedId is provided', async () => {
    render(<AddLotModal {...defaultProps} initialSeedId="test-pepper" />);
    const select = screen.getByRole('combobox');
    expect(select.value).toBe('test-pepper');
  });

  it('calls onSubmit when Add Packet button clicked with required fields', async () => {
    const onSubmit = vi.fn();
    render(<AddLotModal {...defaultProps} initialSeedId="test-tomato" onSubmit={onSubmit} />);
    // Wait for lot code auto-fetch to complete
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Add Packet' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const [payload] = onSubmit.mock.calls[0];
    expect(payload.seed_id).toBe('test-tomato');
  });

  it('calls onClose when Cancel clicked', () => {
    const onClose = vi.fn();
    render(<AddLotModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clicking overlay calls onClose', () => {
    const onClose = vi.fn();
    const { container } = render(<AddLotModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(container.querySelector('.modal-overlay'));
    expect(onClose).toHaveBeenCalled();
  });

  it('lot code field is editable', async () => {
    render(<AddLotModal {...defaultProps} />);
    const lotInput = screen.getByPlaceholderText('e.g. SH-2026-001');
    fireEvent.change(lotInput, { target: { value: 'CUSTOM-123' } });
    expect(lotInput.value).toBe('CUSTOM-123');
  });

  it('seed dropdown onChange updates state', () => {
    render(<AddLotModal {...defaultProps} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'test-lettuce' } });
    expect(select.value).toBe('test-lettuce');
  });

  it('year field onChange updates state', () => {
    render(<AddLotModal {...defaultProps} />);
    const yearInput = screen.getAllByRole('spinbutton')[0];
    fireEvent.change(yearInput, { target: { value: '2025' } });
    expect(yearInput.value).toBe('2025');
  });

  it('notes textarea renders and accepts input', () => {
    render(<AddLotModal {...defaultProps} />);
    const notes = screen.getByPlaceholderText('Any notes about this packet…');
    fireEvent.change(notes, { target: { value: 'Stored in fridge' } });
    expect(notes.value).toBe('Stored in fridge');
  });

  it('shows scan error message when extraction fails', async () => {
    api.upload.mockRejectedValueOnce(new Error('Network error'));
    const { container } = render(<AddLotModal {...defaultProps} />);
    fireEvent.click(screen.getByText('📷 Scan Packet'));
    const fileInput = container.querySelector('input[type="file"]');
    const file = new File(['img'], 'packet.jpg', { type: 'image/jpeg' });
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Extract from Packet' }));
    });
    await waitFor(() => expect(screen.getByText(/Scan failed/)).toBeInTheDocument());
  });

  it('hides tabs and shows Edit Packet title for editLot', () => {
    const editLot = { id: 1, seed_id: 'test-tomato', lot_code: 'SG-2026-001', packed_for_year: 2026, supplier: 'Burpee' };
    render(<AddLotModal {...defaultProps} editLot={editLot} />);
    expect(screen.getByText('Edit Packet')).toBeInTheDocument();
    expect(screen.queryByText('📷 Scan Packet')).not.toBeInTheDocument();
  });

  it('pre-fills form with editLot data', () => {
    const editLot = { id: 1, seed_id: 'test-tomato', lot_code: 'SG-2026-001', packed_for_year: 2026, supplier: 'Burpee', supplier_lot: 'B123', sku: 'SKU1', germ_rate: 90, notes: 'Test note' };
    render(<AddLotModal {...defaultProps} editLot={editLot} />);
    expect(screen.getByDisplayValue('Burpee')).toBeInTheDocument();
    expect(screen.getByDisplayValue('B123')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test note')).toBeInTheDocument();
  });

  it('shows Save Changes button for editLot', () => {
    const editLot = { id: 1, seed_id: 'test-pepper', lot_code: 'SH-2026-001', packed_for_year: 2026 };
    render(<AddLotModal {...defaultProps} editLot={editLot} />);
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();
  });

  it('auto-fetches lot code when seed and year change', async () => {
    render(<AddLotModal {...defaultProps} />);
    const select = screen.getByRole('combobox');
    await act(async () => {
      fireEvent.change(select, { target: { value: 'test-pepper' } });
    });
    await waitFor(() => expect(api.get).toHaveBeenCalledWith(
      expect.stringContaining('/api/seed-lots/generate-code')
    ));
  });

  it('shows scan error when API returns detail field', async () => {
    api.upload.mockResolvedValueOnce({ detail: 'Extraction failed: bad image' });
    const { container } = render(<AddLotModal {...defaultProps} />);
    fireEvent.click(screen.getByText('📷 Scan Packet'));
    const fileInput = container.querySelector('input[type="file"]');
    const file = new File(['img'], 'packet.jpg', { type: 'image/jpeg' });
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Extract from Packet' }));
    });
    await waitFor(() => expect(screen.getByText('Extraction failed: bad image')).toBeInTheDocument());
  });

  it('supplier_lot and SKU fields accept input', () => {
    render(<AddLotModal {...defaultProps} />);
    const supplierLot = screen.getByPlaceholderText("Supplier's own lot/batch number");
    const sku = screen.getByPlaceholderText('Catalog / SKU number');
    fireEvent.change(supplierLot, { target: { value: 'B123' } });
    fireEvent.change(sku, { target: { value: 'CAT-456' } });
    expect(supplierLot.value).toBe('B123');
    expect(sku.value).toBe('CAT-456');
  });

  it('germ_rate field accepts decimal values', () => {
    render(<AddLotModal {...defaultProps} />);
    const germRate = screen.getByPlaceholderText('e.g. 85');
    fireEvent.change(germRate, { target: { value: '92.5' } });
    expect(germRate.value).toBe('92.5');
  });

  it('supplier field accepts input', () => {
    render(<AddLotModal {...defaultProps} />);
    const supplier = screen.getByPlaceholderText("e.g. Johnny's, Seed Savers, Burpee");
    fireEvent.change(supplier, { target: { value: "Johnny's" } });
    expect(supplier.value).toBe("Johnny's");
  });

  it('scan success switches to Manual tab with pre-filled data', async () => {
    api.upload.mockResolvedValueOnce({
      name: 'Cherokee Purple', category: 'Tomatoes', supplier: 'Seed Savers',
      packed_for_year: 2026, germ_rate: 88.0, supplier_lot: 'SS-123',
    });
    const { container } = render(<AddLotModal {...defaultProps} />);
    fireEvent.click(screen.getByText('📷 Scan Packet'));
    const fileInput = container.querySelector('input[type="file"]');
    const file = new File(['img'], 'packet.jpg', { type: 'image/jpeg' });
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Extract from Packet' }));
    });
    await waitFor(() => {
      expect(screen.getByDisplayValue('Seed Savers')).toBeInTheDocument();
    });
  });
});
