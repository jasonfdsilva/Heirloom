import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AddLotModal from '../../components/modals/AddLotModal';

// Mock the api module
vi.mock('../../lib/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ lot_code: 'BL-2026-001' }),
    post: vi.fn().mockResolvedValue({ id: 'new-seed-id', name: 'New Variety', category: 'Tomatoes' }),
    put: vi.fn().mockResolvedValue({}),
    upload: vi.fn(),
  },
}));

import api from '../../lib/api';

const SEEDS = [
  { id: 'test-lettuce', name: 'Buttercrunch Lettuce', category: 'Greens', species: 'Lactuca sativa' },
  { id: 'test-tomato', name: 'Sun Gold', category: 'Tomatoes', species: 'Solanum lycopersicum' },
  { id: 'test-pepper', name: 'Shishito', category: 'Peppers', species: 'Capsicum annuum' },
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
    api.post.mockResolvedValue({ id: 'new-seed-id', name: 'New Variety', category: '' });
    api.put.mockResolvedValue({});
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
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Species')).toBeInTheDocument();
    expect(screen.getByText('Sowing Method')).toBeInTheDocument();
    expect(screen.getByText('Packed For Year')).toBeInTheDocument();
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

  it('pre-selects seed when initialSeedId is provided', () => {
    render(<AddLotModal {...defaultProps} initialSeedId="test-pepper" />);
    // Variety select is the first combobox; it should have test-pepper pre-selected
    const selects = screen.getAllByRole('combobox');
    expect(selects[0].value).toBe('test-pepper');
  });

  it('calls onSubmit when Add Packet button clicked with required fields', async () => {
    const onSubmit = vi.fn();
    render(<AddLotModal {...defaultProps} initialSeedId="test-tomato" onSubmit={onSubmit} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Add Packet' }));
    });
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

  it('variety search input filters the seed dropdown', () => {
    render(<AddLotModal {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText('Type variety name…');
    fireEvent.change(searchInput, { target: { value: 'Sun' } });
    expect(searchInput.value).toBe('Sun');
    // After typing "Sun", only Sun Gold should appear in the select
    const selects = screen.getAllByRole('combobox');
    const options = Array.from(selects[0].options).map(o => o.text);
    expect(options.some(o => o.includes('Sun Gold'))).toBe(true);
    expect(options.some(o => o.includes('Shishito'))).toBe(false);
  });

  it('seed dropdown onChange updates state', () => {
    render(<AddLotModal {...defaultProps} />);
    const selects = screen.getAllByRole('combobox');
    const varietySelect = selects[0];
    fireEvent.change(varietySelect, { target: { value: 'test-lettuce' } });
    expect(varietySelect.value).toBe('test-lettuce');
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

  it('shows new variety hint when typed name has no match', () => {
    render(<AddLotModal {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText('Type variety name…');
    fireEvent.change(searchInput, { target: { value: 'Totally New Tomato' } });
    expect(screen.getByText(/"Totally New Tomato" will be created as a new variety when you save/)).toBeInTheDocument();
  });

  it('Add Packet button is disabled when no seed selected and no variety typed', () => {
    render(<AddLotModal {...defaultProps} />);
    const addBtn = screen.getByRole('button', { name: 'Add Packet' });
    expect(addBtn).toBeDisabled();
  });

  it('sowing method checkboxes toggle correctly', () => {
    render(<AddLotModal {...defaultProps} />);
    const checkboxes = screen.getAllByRole('checkbox');
    const startIndoors = checkboxes[0];
    const directSow = checkboxes[1];
    expect(startIndoors.checked).toBe(false);
    expect(directSow.checked).toBe(false);
    fireEvent.click(startIndoors);
    expect(startIndoors.checked).toBe(true);
    fireEvent.click(directSow);
    expect(directSow.checked).toBe(true);
  });

  it('category search input and select onChange update category state', () => {
    render(<AddLotModal {...defaultProps} />);
    // Category text input (line 307)
    const categorySearch = screen.getByPlaceholderText('Type to filter or enter new category…');
    fireEvent.change(categorySearch, { target: { value: 'Tom' } });
    expect(categorySearch.value).toBe('Tom');
    // Category select is the second combobox (line 311)
    const selects = screen.getAllByRole('combobox');
    const categorySelect = selects[1];
    fireEvent.change(categorySelect, { target: { value: 'Tomatoes' } });
    expect(categorySelect.value).toBe('Tomatoes');
  });

  it('species search input and select onChange update species state', () => {
    render(<AddLotModal {...defaultProps} />);
    const speciesSearch = screen.getByPlaceholderText('Type to filter or enter new species…');
    fireEvent.change(speciesSearch, { target: { value: 'Solanum' } });
    expect(speciesSearch.value).toBe('Solanum');
    // Species select is the third combobox
    const selects = screen.getAllByRole('combobox');
    const speciesSelect = selects[2];
    fireEvent.change(speciesSelect, { target: { value: 'Solanum lycopersicum' } });
    expect(speciesSelect.value).toBe('Solanum lycopersicum');
  });

  it('purchased year field accepts input', () => {
    render(<AddLotModal {...defaultProps} />);
    const yearInputs = screen.getAllByRole('spinbutton');
    // Index 0 is packed_for_year, index 1 is purchased_year
    const purchasedYearInput = yearInputs[1];
    fireEvent.change(purchasedYearInput, { target: { value: '2024' } });
    expect(purchasedYearInput.value).toBe('2024');
  });

  it('calls onSeedCreated when a new variety is created on submit', async () => {
    const onSubmit = vi.fn();
    const onSeedCreated = vi.fn();
    api.post.mockResolvedValueOnce({ id: 'brand-new-id', name: 'Brand New Tomato', category: 'Tomatoes' });
    render(<AddLotModal {...defaultProps} onSubmit={onSubmit} onSeedCreated={onSeedCreated} />);
    // Type a name that doesn't match any seed
    const searchInput = screen.getByPlaceholderText('Type variety name…');
    fireEvent.change(searchInput, { target: { value: 'Brand New Tomato' } });
    // Fill packed_for_year (it already has current year, but ensure canSubmit)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Add Packet' }));
    });
    await waitFor(() => expect(onSeedCreated).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('shows submit error when api.post returns no id for new variety', async () => {
    api.post.mockResolvedValueOnce(null);
    render(<AddLotModal {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText('Type variety name…');
    fireEvent.change(searchInput, { target: { value: 'Mystery Variety' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Add Packet' }));
    });
    await waitFor(() =>
      expect(screen.getByText('Could not create variety. Please try again.')).toBeInTheDocument()
    );
  });

  it('calls api.put when submitting with a changed category for an existing seed', async () => {
    const onSubmit = vi.fn();
    render(<AddLotModal {...defaultProps} initialSeedId="test-tomato" onSubmit={onSubmit} />);
    // Change category to something different from the seed's category ('Tomatoes')
    const categorySearch = screen.getByPlaceholderText('Type to filter or enter new category…');
    fireEvent.change(categorySearch, { target: { value: 'Vegetables' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Add Packet' }));
    });
    await waitFor(() => expect(api.put).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('sorts seeds with same category by name', () => {
    const SAME_CAT_SEEDS = [
      { id: 'zz-tomato', name: 'Zucchini Giant', category: 'Tomatoes', species: null },
      { id: 'aa-tomato', name: 'Amish Paste', category: 'Tomatoes', species: null },
    ];
    render(<AddLotModal {...defaultProps} seeds={SAME_CAT_SEEDS} />);
    const selects = screen.getAllByRole('combobox');
    const varietySelect = selects[0];
    const options = Array.from(varietySelect.options).filter(o => o.value !== '');
    // Amish Paste should come before Zucchini Giant alphabetically
    expect(options[0].text).toContain('Amish Paste');
    expect(options[1].text).toContain('Zucchini Giant');
  });
});

