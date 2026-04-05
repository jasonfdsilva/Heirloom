import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EventModal from '../../components/modals/EventModal';

const defaultProps = {
  editData: { event_type: '', event_date: '', details: '' },
  setEditData: vi.fn(),
  modalError: null,
  setModalError: vi.fn(),
  onSubmit: vi.fn(),
  onClose: vi.fn(),
  selectedPlanting: null,
};

describe('EventModal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders modal title', () => {
    render(<EventModal {...defaultProps} />);
    expect(screen.getByRole('heading', { name: 'Log Event' })).toBeInTheDocument();
  });

  it('renders event type dropdown', () => {
    render(<EventModal {...defaultProps} />);
    expect(screen.getByText('Event Type')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders date input', () => {
    const { container } = render(<EventModal {...defaultProps} />);
    expect(container.querySelector('input[type="date"]')).toBeInTheDocument();
  });

  it('renders details textarea with default placeholder', () => {
    render(<EventModal {...defaultProps} />);
    expect(screen.getByPlaceholderText('What happened...')).toBeInTheDocument();
  });

  it('renders note placeholder when event_type is note', () => {
    render(<EventModal {...defaultProps} editData={{ event_type: 'note' }} />);
    expect(screen.getByPlaceholderText("What's on your mind…")).toBeInTheDocument();
  });

  it('shows error message when modalError is set', () => {
    render(<EventModal {...defaultProps} modalError="Please select an event type." />);
    expect(screen.getByText('Please select an event type.')).toBeInTheDocument();
  });

  it('does not show error when modalError is null', () => {
    const { container } = render(<EventModal {...defaultProps} />);
    expect(container.querySelector('[style*="dc2626"]')).toBeNull();
  });

  it('calls onClose and setModalError(null) when overlay clicked', () => {
    const onClose = vi.fn();
    const setModalError = vi.fn();
    const { container } = render(
      <EventModal {...defaultProps} onClose={onClose} setModalError={setModalError} />
    );
    fireEvent.click(container.querySelector('.modal-overlay'));
    expect(onClose).toHaveBeenCalled();
    expect(setModalError).toHaveBeenCalledWith(null);
  });

  it('does not bubble click from inner modal', () => {
    const onClose = vi.fn();
    const { container } = render(<EventModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(container.querySelector('.modal'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when Cancel button clicked', () => {
    const onClose = vi.fn();
    render(<EventModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onSubmit when Log Event button clicked', () => {
    const onSubmit = vi.fn();
    render(<EventModal {...defaultProps} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Log Event' }));
    expect(onSubmit).toHaveBeenCalled();
  });

  it('shows Save Changes button when editData.id is set', () => {
    render(<EventModal {...defaultProps} editData={{ id: 5, event_type: 'note' }} />);
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();
  });

  it('calls setEditData when event type changes', () => {
    const setEditData = vi.fn();
    render(<EventModal {...defaultProps} setEditData={setEditData} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'note' } });
    expect(setEditData).toHaveBeenCalled();
  });

  it('calls setModalError(null) when event type changes', () => {
    const setModalError = vi.fn();
    render(<EventModal {...defaultProps} setModalError={setModalError} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'note' } });
    expect(setModalError).toHaveBeenCalledWith(null);
  });

  it('calls setEditData when date changes', () => {
    const setEditData = vi.fn();
    const { container } = render(<EventModal {...defaultProps} setEditData={setEditData} />);
    fireEvent.change(container.querySelector('input[type="date"]'), { target: { value: '2026-05-01' } });
    expect(setEditData).toHaveBeenCalled();
  });

  it('calls setEditData when details textarea changes', () => {
    const setEditData = vi.fn();
    render(<EventModal {...defaultProps} setEditData={setEditData} />);
    fireEvent.change(screen.getByPlaceholderText('What happened...'), { target: { value: 'Growing well' } });
    expect(setEditData).toHaveBeenCalled();
  });

  // ── germination event type ───────────────────────────────────────────────────

  it('shows quantity input for germination event type', () => {
    render(<EventModal {...defaultProps} editData={{ event_type: 'germinated' }} />);
    expect(screen.getByText('Seeds Sprouted (count)')).toBeInTheDocument();
  });

  it('shows germination rate hint when quantity and qty_started are set', () => {
    render(
      <EventModal
        {...defaultProps}
        editData={{ event_type: 'germinated', quantity: 8 }}
        selectedPlanting={{ qty_started: 10 }}
      />
    );
    expect(screen.getByText(/80% of 10 started/)).toBeInTheDocument();
  });

  it('shows seeds started total hint when quantity is not set', () => {
    render(
      <EventModal
        {...defaultProps}
        editData={{ event_type: 'germinated' }}
        selectedPlanting={{ qty_started: 12 }}
      />
    );
    expect(screen.getByText(/12 seeds started total/)).toBeInTheDocument();
  });

  it('calls setEditData when germination quantity changes', () => {
    const setEditData = vi.fn();
    render(
      <EventModal
        {...defaultProps}
        editData={{ event_type: 'germinated' }}
        setEditData={setEditData}
        selectedPlanting={{ qty_started: 10 }}
      />
    );
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '7' } });
    expect(setEditData).toHaveBeenCalled();
  });

  // ── disease / pest event types ────────────────────────────────────────────────

  it('shows severity select for disease event type', () => {
    render(<EventModal {...defaultProps} editData={{ event_type: 'disease' }} />);
    expect(screen.getByText('Severity')).toBeInTheDocument();
  });

  it('shows severity select for pest event type', () => {
    render(<EventModal {...defaultProps} editData={{ event_type: 'pest' }} />);
    expect(screen.getByText('Severity')).toBeInTheDocument();
  });

  it('calls setEditData when severity changes', () => {
    const setEditData = vi.fn();
    render(
      <EventModal
        {...defaultProps}
        editData={{ event_type: 'disease' }}
        setEditData={setEditData}
      />
    );
    const selects = screen.getAllByRole('combobox');
    const severitySelect = selects.find(s => s.querySelector('option[value="low"]'));
    fireEvent.change(severitySelect, { target: { value: 'high' } });
    expect(setEditData).toHaveBeenCalled();
  });

  // ── fertilize / disease / pest show product_used ──────────────────────────────

  it('shows product used field for fertilize event type', () => {
    render(<EventModal {...defaultProps} editData={{ event_type: 'fertilize' }} />);
    expect(screen.getByText('Product Used')).toBeInTheDocument();
  });

  it('shows product used field for disease event type', () => {
    render(<EventModal {...defaultProps} editData={{ event_type: 'disease' }} />);
    expect(screen.getByText('Product Used')).toBeInTheDocument();
  });

  it('shows product used field for pest event type', () => {
    render(<EventModal {...defaultProps} editData={{ event_type: 'pest' }} />);
    expect(screen.getByText('Product Used')).toBeInTheDocument();
  });

  it('calls setEditData when product_used changes', () => {
    const setEditData = vi.fn();
    render(
      <EventModal
        {...defaultProps}
        editData={{ event_type: 'fertilize' }}
        setEditData={setEditData}
      />
    );
    fireEvent.change(screen.getByPlaceholderText(/Fish emulsion/), { target: { value: 'Neem oil' } });
    expect(setEditData).toHaveBeenCalled();
  });

  // ── photo attachment (new events only) ───────────────────────────────────────

  it('shows photo attachment section for new events (no id)', () => {
    render(<EventModal {...defaultProps} editData={{ event_type: '' }} />);
    expect(screen.getByText('📷 Choose Photos')).toBeInTheDocument();
  });

  it('hides photo attachment section when editing existing event (id set)', () => {
    render(<EventModal {...defaultProps} editData={{ id: 1, event_type: '' }} />);
    expect(screen.queryByText('📷 Choose Photos')).not.toBeInTheDocument();
  });

  it('shows photo count after file selection', () => {
    const setEditData = vi.fn();
    const { container } = render(
      <EventModal {...defaultProps} editData={{ event_type: '', _photos: [new File([''], 'a.jpg'), new File([''], 'b.jpg')] }} setEditData={setEditData} />
    );
    expect(screen.getByText(/2 photos selected/)).toBeInTheDocument();
  });

  it('shows singular "photo" when only 1 photo selected', () => {
    render(
      <EventModal
        {...defaultProps}
        editData={{ event_type: '', _photos: [new File([''], 'a.jpg')] }}
      />
    );
    expect(screen.getByText(/1 photo selected/)).toBeInTheDocument();
    // Make sure it says "photo" not "photos"
    expect(screen.queryByText(/1 photos selected/)).not.toBeInTheDocument();
  });

  it('calls setEditData when photos are chosen', () => {
    const setEditData = vi.fn();
    const { container } = render(
      <EventModal {...defaultProps} editData={{ event_type: '' }} setEditData={setEditData} />
    );
    const fileInput = container.querySelector('input[type="file"]');
    const file = new File(['x'], 'shot.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(setEditData).toHaveBeenCalled();
  });

  // ── inner state-updater callback coverage ─────────────────────────────────────
  // setEditData receives `d => ({...})` callbacks — use an executing mock so V8
  // counts those inner functions as covered.

  it('disease fields: date/severity/product_used/details inner callbacks are executed', () => {
    // Executing mock: when called with a function, immediately invoke it
    const executingMock = vi.fn(fn => typeof fn === 'function' && fn({}));

    const { container } = render(
      <EventModal
        {...defaultProps}
        editData={{ event_type: 'disease', product_used: '', severity: '' }}
        setEditData={executingMock}
      />
    );

    // date onChange
    fireEvent.change(container.querySelector('input[type="date"]'), { target: { value: '2026-06-01' } });
    // severity onChange
    const comboboxes = screen.getAllByRole('combobox');
    const severitySelect = comboboxes.find(s => s.querySelector('option[value="low"]'));
    fireEvent.change(severitySelect, { target: { value: 'medium' } });
    // product_used onChange
    fireEvent.change(screen.getByPlaceholderText(/Fish emulsion/), { target: { value: 'Neem oil' } });
    // details onChange
    fireEvent.change(screen.getByPlaceholderText('What happened...'), { target: { value: 'Spots found' } });

    expect(executingMock).toHaveBeenCalled();
  });

  it('germination quantity inner callback is executed', () => {
    const executingMock = vi.fn(fn => typeof fn === 'function' && fn({}));
    const { container } = render(
      <EventModal
        {...defaultProps}
        editData={{ event_type: 'germinated' }}
        setEditData={executingMock}
        selectedPlanting={{ qty_started: 10 }}
      />
    );
    fireEvent.change(container.querySelector('input[type="number"]'), { target: { value: '5' } });
    expect(executingMock).toHaveBeenCalled();
  });

  it('germination quantity inner callback returns null when value is empty/NaN', () => {
    // Tests the `parseInt(e.target.value) || null` — the null branch
    let capturedUpdate;
    const executingMock = vi.fn(fn => { if (typeof fn === 'function') capturedUpdate = fn({ quantity: 5 }); });
    const { container } = render(
      <EventModal
        {...defaultProps}
        editData={{ event_type: 'germinated', quantity: 5 }}
        setEditData={executingMock}
        selectedPlanting={{ qty_started: 10 }}
      />
    );
    fireEvent.change(container.querySelector('input[type="number"]'), { target: { value: '' } });
    // parseInt('') = NaN → NaN || null = null
    expect(capturedUpdate.quantity).toBeNull();
  });

  it('event-type onChange inner callback is executed', () => {
    const executingMock = vi.fn(fn => typeof fn === 'function' && fn({}));
    render(<EventModal {...defaultProps} setEditData={executingMock} setModalError={vi.fn()} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'note' } });
    expect(executingMock).toHaveBeenCalled();
  });

  it('photos onChange inner callback is executed', () => {
    const executingMock = vi.fn(fn => typeof fn === 'function' && fn({}));
    const { container } = render(
      <EventModal {...defaultProps} editData={{ event_type: '' }} setEditData={executingMock} />
    );
    const file = new File(['x'], 'shot.jpg', { type: 'image/jpeg' });
    fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [file] } });
    expect(executingMock).toHaveBeenCalled();
  });
});
