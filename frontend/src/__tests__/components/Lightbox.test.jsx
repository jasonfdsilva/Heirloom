import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Lightbox from '../../components/common/Lightbox';

const mockPhotos = [
  { id: 1, filename: 'a.jpg', caption: 'First sprouts', taken_date: '2026-03-10', seed_name: 'Sun Gold' },
  { id: 2, filename: 'b.jpg', caption: null, taken_date: '2026-03-15', seed_name: 'Lettuce' },
  { id: 3, filename: 'c.jpg', caption: 'Third', taken_date: '2026-03-20', seed_name: 'Pepper' },
];

const baseProps = {
  photos: mockPhotos,
  index: 1,
  onClose: vi.fn(),
  onPrev: vi.fn(),
  onNext: vi.fn(),
};

describe('Lightbox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when index is out of range', () => {
    const { container } = render(<Lightbox {...baseProps} photos={[]} index={0} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the photo image', () => {
    render(<Lightbox {...baseProps} />);
    const img = document.querySelector('img');
    expect(img).toHaveAttribute('src', '/photos/b.jpg');
  });

  it('renders the close button', () => {
    render(<Lightbox {...baseProps} />);
    expect(screen.getByText('✕')).toBeInTheDocument();
  });

  it('calls onClose when clicking the backdrop', () => {
    const onClose = vi.fn();
    render(<Lightbox {...baseProps} onClose={onClose} />);
    fireEvent.click(document.querySelector('.lightbox'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when clicking the ✕ button', () => {
    const onClose = vi.fn();
    render(<Lightbox {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('✕'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows prev button when index > 0', () => {
    render(<Lightbox {...baseProps} index={1} />);
    expect(screen.getByText('‹')).toBeInTheDocument();
  });

  it('does not show prev button when index is 0', () => {
    render(<Lightbox {...baseProps} index={0} />);
    expect(screen.queryByText('‹')).not.toBeInTheDocument();
  });

  it('calls onPrev when clicking the ‹ button', () => {
    const onPrev = vi.fn();
    render(<Lightbox {...baseProps} index={1} onPrev={onPrev} />);
    fireEvent.click(screen.getByText('‹'));
    expect(onPrev).toHaveBeenCalled();
  });

  it('shows next button when not at last photo', () => {
    render(<Lightbox {...baseProps} index={0} />);
    expect(screen.getByText('›')).toBeInTheDocument();
  });

  it('does not show next button at last photo', () => {
    render(<Lightbox {...baseProps} index={2} />);
    expect(screen.queryByText('›')).not.toBeInTheDocument();
  });

  it('calls onNext when clicking the › button', () => {
    const onNext = vi.fn();
    render(<Lightbox {...baseProps} index={0} onNext={onNext} />);
    fireEvent.click(screen.getByText('›'));
    expect(onNext).toHaveBeenCalled();
  });

  it('renders the caption when present', () => {
    render(<Lightbox {...baseProps} index={0} />);
    expect(screen.getByText('First sprouts')).toBeInTheDocument();
  });

  it('does not render caption element when caption is null', () => {
    render(<Lightbox {...baseProps} index={1} />);
    expect(screen.queryByText('First sprouts')).not.toBeInTheDocument();
  });

  it('shows photo counter', () => {
    render(<Lightbox {...baseProps} index={1} />);
    expect(screen.getByText(/2 \/ 3/)).toBeInTheDocument();
  });

  it('does not show delete button when onDelete is not provided', () => {
    render(<Lightbox {...baseProps} />);
    expect(screen.queryByTitle('Delete photo')).not.toBeInTheDocument();
  });

  it('shows delete button when onDelete is provided', () => {
    render(<Lightbox {...baseProps} onDelete={vi.fn()} />);
    expect(screen.getByTitle('Delete photo')).toBeInTheDocument();
  });

  it('calls onDelete with photo id when delete is confirmed', () => {
    const onDelete = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<Lightbox {...baseProps} index={0} onDelete={onDelete} />);
    fireEvent.click(screen.getByTitle('Delete photo'));
    expect(onDelete).toHaveBeenCalledWith(1);
    vi.restoreAllMocks();
  });

  it('does not call onDelete when delete is cancelled', () => {
    const onDelete = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<Lightbox {...baseProps} index={0} onDelete={onDelete} />);
    fireEvent.click(screen.getByTitle('Delete photo'));
    expect(onDelete).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('shows titleKey text when provided and photo has that field', () => {
    render(<Lightbox {...baseProps} index={0} titleKey="seed_name" />);
    expect(screen.getByText('Sun Gold')).toBeInTheDocument();
  });

  it('does not show titleKey text when photo field is empty', () => {
    const photos = [{ id: 1, filename: 'a.jpg', caption: null, taken_date: null, seed_name: null }];
    render(<Lightbox {...baseProps} photos={photos} index={0} titleKey="seed_name" />);
    expect(screen.queryByText('Sun Gold')).not.toBeInTheDocument();
  });

  it('stops propagation when clicking the photo image', () => {
    const onClose = vi.fn();
    render(<Lightbox {...baseProps} onClose={onClose} />);
    // Click on the photo itself — should NOT trigger onClose (stopPropagation)
    const imgs = document.querySelectorAll('img');
    fireEvent.click(imgs[0]);
    expect(onClose).not.toHaveBeenCalled();
  });
});
