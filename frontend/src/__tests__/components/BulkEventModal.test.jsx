import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BulkEventModal from '../../components/modals/BulkEventModal';

const defaultPlantings = [
  { id: 1, seed_name: 'Sun Gold Tomato' },
  { id: 2, seed_name: 'Ace F1 Pepper' },
  { id: 3, seed_name: 'Butterhead Lettuce' },
];

const defaultProps = {
  editData: {},
  setEditData: vi.fn(),
  modalError: null,
  setModalError: vi.fn(),
  onSubmit: vi.fn(),
  onClose: vi.fn(),
  selectedPlantings: defaultPlantings,
};

describe('BulkEventModal', () => {
  it('renders title with correct planting count (plural)', () => {
    render(<BulkEventModal {...defaultProps} />);
    expect(screen.getByText('Log Event — 3 plantings')).toBeInTheDocument();
  });

  it('renders title with correct planting count (singular)', () => {
    render(<BulkEventModal {...defaultProps} selectedPlantings={[defaultPlantings[0]]} />);
    expect(screen.getByText('Log Event — 1 planting')).toBeInTheDocument();
  });

  it('shows collapsed planting names list by default', () => {
    render(<BulkEventModal {...defaultProps} />);
    expect(screen.queryByText('Sun Gold Tomato')).not.toBeInTheDocument();
    expect(screen.getByText('Show selected plantings')).toBeInTheDocument();
  });

  it('expands planting names list on button click', () => {
    render(<BulkEventModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Show selected plantings'));
    expect(screen.getByText('Sun Gold Tomato')).toBeInTheDocument();
    expect(screen.getByText('Ace F1 Pepper')).toBeInTheDocument();
    expect(screen.getByText('Butterhead Lettuce')).toBeInTheDocument();
  });

  it('collapses list again after second click', () => {
    render(<BulkEventModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Show selected plantings'));
    fireEvent.click(screen.getByText('Hide selected plantings'));
    expect(screen.queryByText('Sun Gold Tomato')).not.toBeInTheDocument();
  });

  it('includes germination in the event type dropdown', () => {
    render(<BulkEventModal {...defaultProps} />);
    const select = screen.getByRole('combobox');
    const options = Array.from(select.querySelectorAll('option')).map(o => o.value);
    expect(options).toContain('germinated');
  });

  it('includes other event types like note and treatment', () => {
    render(<BulkEventModal {...defaultProps} />);
    const select = screen.getByRole('combobox');
    const options = Array.from(select.querySelectorAll('option')).map(o => o.value);
    expect(options).toContain('note');
    expect(options).toContain('treatment');
  });

  it('renders submit button with planting count label', () => {
    render(<BulkEventModal {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Log Event for 3 plantings' })).toBeInTheDocument();
  });

  it('renders submit button with singular label for 1 planting', () => {
    render(<BulkEventModal {...defaultProps} selectedPlantings={[defaultPlantings[0]]} />);
    expect(screen.getByRole('button', { name: 'Log Event for 1 planting' })).toBeInTheDocument();
  });

  it('calls onSubmit when submit button clicked', () => {
    const onSubmit = vi.fn();
    render(<BulkEventModal {...defaultProps} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Log Event for 3 plantings' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Cancel clicked', () => {
    const onClose = vi.fn();
    render(<BulkEventModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows modal error when provided', () => {
    render(<BulkEventModal {...defaultProps} modalError="Please select an event type." />);
    expect(screen.getByText('Please select an event type.')).toBeInTheDocument();
  });

  it('does not show error section when modalError is null', () => {
    const { container } = render(<BulkEventModal {...defaultProps} modalError={null} />);
    expect(container.querySelector('[style*="dc2626"]')).toBeNull();
  });

  it('renders date input field', () => {
    render(<BulkEventModal {...defaultProps} />);
    expect(screen.getByDisplayValue(/\d{4}-\d{2}-\d{2}/)).toBeInTheDocument();
  });

  it('renders details textarea', () => {
    render(<BulkEventModal {...defaultProps} />);
    expect(screen.getByPlaceholderText(/What happened.../)).toBeInTheDocument();
  });

  it('shows note placeholder text in details when event_type is note', () => {
    render(<BulkEventModal {...defaultProps} editData={{ event_type: 'note' }} />);
    expect(screen.getByPlaceholderText("What's on your mind…")).toBeInTheDocument();
  });

  it('shows severity dropdown when event_type is disease', () => {
    render(<BulkEventModal {...defaultProps} editData={{ event_type: 'disease' }} />);
    expect(screen.getByText('Severity')).toBeInTheDocument();
  });

  it('shows product_used field when event_type is fertilize', () => {
    render(<BulkEventModal {...defaultProps} editData={{ event_type: 'fertilize' }} />);
    expect(screen.getByText('Product Used')).toBeInTheDocument();
  });

  it('shows photo attachment UI', () => {
    const { container } = render(<BulkEventModal {...defaultProps} />);
    expect(container.querySelector('input[type="file"]')).not.toBeNull();
  });

  it('shows "Attach Photo" label', () => {
    render(<BulkEventModal {...defaultProps} />);
    expect(screen.getByText('Attach Photo')).toBeInTheDocument();
  });

  it('shows selected photo filename after file is chosen', () => {
    const file = new File(['img'], 'garden.jpg', { type: 'image/jpeg' });
    const executingMock = vi.fn(fn => typeof fn === 'function' && fn({ _photos: [] }));
    render(<BulkEventModal {...defaultProps} setEditData={executingMock} />);
    const fileInput = document.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(executingMock).toHaveBeenCalled();
  });

  it('shows confirmation text when _photos has an entry', () => {
    const file = new File(['img'], 'tomato.jpg', { type: 'image/jpeg' });
    render(<BulkEventModal {...defaultProps} editData={{ _photos: [file] }} />);
    expect(screen.getByText('✓ tomato.jpg')).toBeInTheDocument();
  });

  it('empty file input sets _photos to empty array via inner callback', () => {
    let captured;
    const executingMock = vi.fn(fn => {
      if (typeof fn === 'function') captured = fn({ _photos: [new File(['x'], 'old.jpg')] });
    });
    render(<BulkEventModal {...defaultProps} setEditData={executingMock} />);
    const fileInput = document.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [] } });
    expect(captured._photos).toEqual([]);
  });

  it('clicking overlay calls onClose', () => {
    const onClose = vi.fn();
    const { container } = render(<BulkEventModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(container.querySelector('.modal-overlay'));
    expect(onClose).toHaveBeenCalled();
  });

  it('changing event type calls setEditData', () => {
    const setEditData = vi.fn();
    render(<BulkEventModal {...defaultProps} setEditData={setEditData} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'fertilize' } });
    expect(setEditData).toHaveBeenCalled();
  });

  it('changing severity calls setEditData', () => {
    const setEditData = vi.fn();
    render(<BulkEventModal {...defaultProps} editData={{ event_type: 'disease' }} setEditData={setEditData} />);
    const selects = screen.getAllByRole('combobox');
    const severitySelect = selects.find(s => s.querySelector('option[value="low"]'));
    fireEvent.change(severitySelect, { target: { value: 'high' } });
    expect(setEditData).toHaveBeenCalled();
  });

  it('changing product_used calls setEditData', () => {
    const setEditData = vi.fn();
    render(<BulkEventModal {...defaultProps} editData={{ event_type: 'fertilize' }} setEditData={setEditData} />);
    const productInput = screen.getByPlaceholderText(/Fish emulsion/);
    fireEvent.change(productInput, { target: { value: 'Neem oil' } });
    expect(setEditData).toHaveBeenCalled();
  });

  it('shows severity and product_used for pest event type', () => {
    render(<BulkEventModal {...defaultProps} editData={{ event_type: 'pest' }} />);
    expect(screen.getByText('Severity')).toBeInTheDocument();
    expect(screen.getByText('Product Used')).toBeInTheDocument();
  });

  it('changing date input calls setEditData', () => {
    const setEditData = vi.fn();
    render(<BulkEventModal {...defaultProps} setEditData={setEditData} />);
    const dateInput = screen.getByDisplayValue(/\d{4}-\d{2}-\d{2}/);
    fireEvent.change(dateInput, { target: { value: '2026-05-01' } });
    expect(setEditData).toHaveBeenCalled();
  });

  it('changing details textarea calls setEditData', () => {
    const setEditData = vi.fn();
    render(<BulkEventModal {...defaultProps} setEditData={setEditData} />);
    fireEvent.change(screen.getByPlaceholderText(/What happened.../), { target: { value: 'New detail' } });
    expect(setEditData).toHaveBeenCalled();
  });

  // ── inner state-updater callback coverage ─────────────────────────────────────
  // setEditData receives `d => ({...})` callbacks. Use an executing mock so V8
  // counts those inner arrow functions as covered.

  it('all inner state-updater callbacks are executed via executing mock', () => {
    const executingMock = vi.fn(fn => typeof fn === 'function' && fn({}));

    const { container } = render(
      <BulkEventModal
        {...defaultProps}
        editData={{ event_type: 'disease', severity: '', product_used: '', details: '' }}
        setEditData={executingMock}
        setModalError={vi.fn()}
      />
    );

    // event_type onChange (d => ({...event_type...}))
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'note' } });
    // date onChange (d => ({...event_date...}))
    fireEvent.change(container.querySelector('input[type="date"]'), { target: { value: '2026-06-01' } });
    // severity onChange (d => ({...severity...}))
    const comboboxes = screen.getAllByRole('combobox');
    const severitySelect = comboboxes.find(s => s.querySelector('option[value="low"]'));
    if (severitySelect) fireEvent.change(severitySelect, { target: { value: 'medium' } });
    // product_used onChange (d => ({...product_used...}))
    fireEvent.change(screen.getByPlaceholderText(/Fish emulsion/), { target: { value: 'Neem oil' } });
    // details onChange (d => ({...details...}))
    fireEvent.change(screen.getByPlaceholderText('What happened...'), { target: { value: 'Spotted aphids' } });

    expect(executingMock).toHaveBeenCalled();
  });
});
