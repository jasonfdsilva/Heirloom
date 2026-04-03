import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Photos from '../../components/views/Photos';
import { mockPhotos } from '../../test/mocks/data';

describe('Photos', () => {
  const baseProps = {
    allPhotos: [],
    photosGrouping: 'time',
    setPhotosGrouping: vi.fn(),
    setPhotosLightboxIndex: vi.fn(),
  };

  it('shows empty state when no photos', () => {
    render(<Photos {...baseProps} />);
    expect(screen.getByText(/No photos yet/)).toBeInTheDocument();
  });

  it('shows photo count in subtitle', () => {
    render(<Photos {...baseProps} allPhotos={mockPhotos} />);
    expect(screen.getByText(/2 photos across all plantings/)).toBeInTheDocument();
  });

  it('shows By Time and By Planting toggle buttons', () => {
    render(<Photos {...baseProps} allPhotos={mockPhotos} />);
    expect(screen.getByText('By Time')).toBeInTheDocument();
    expect(screen.getByText('By Planting')).toBeInTheDocument();
  });

  it('By Time button is active by default', () => {
    render(<Photos {...baseProps} allPhotos={mockPhotos} />);
    expect(screen.getByText('By Time')).toHaveClass('active');
    expect(screen.getByText('By Planting')).not.toHaveClass('active');
  });

  it('clicking By Planting calls setPhotosGrouping', () => {
    const setPhotosGrouping = vi.fn();
    render(<Photos {...baseProps} allPhotos={mockPhotos} setPhotosGrouping={setPhotosGrouping} />);
    fireEvent.click(screen.getByText('By Planting'));
    expect(setPhotosGrouping).toHaveBeenCalledWith('planting');
  });

  it('clicking By Time calls setPhotosGrouping', () => {
    const setPhotosGrouping = vi.fn();
    render(<Photos {...baseProps} allPhotos={mockPhotos} photosGrouping="planting" setPhotosGrouping={setPhotosGrouping} />);
    fireEvent.click(screen.getByText('By Time'));
    expect(setPhotosGrouping).toHaveBeenCalledWith('time');
  });

  it('clicking a photo calls setPhotosLightboxIndex with correct index', () => {
    const setPhotosLightboxIndex = vi.fn();
    render(<Photos {...baseProps} allPhotos={mockPhotos} setPhotosLightboxIndex={setPhotosLightboxIndex} />);
    const thumbs = document.querySelectorAll('.photo-thumb');
    fireEvent.click(thumbs[0]);
    expect(setPhotosLightboxIndex).toHaveBeenCalledWith(0);
  });

  it('renders month header in time grouping', () => {
    render(<Photos {...baseProps} allPhotos={mockPhotos} />);
    // mockPhotos both have taken_date '2026-03-xx' → "March 2026"
    expect(screen.getByText(/March 2026/)).toBeInTheDocument();
  });

  it('renders "Date Unknown" header for photos with no taken_date', () => {
    const photosNoDate = [{ id: 1, planting_id: 1, filename: 'a.jpg', taken_date: null, seed_name: 'Lettuce', category: 'Greens', caption: null }];
    render(<Photos {...baseProps} allPhotos={photosNoDate} />);
    expect(screen.getByText('Date Unknown')).toBeInTheDocument();
  });

  it('By Planting grouping renders category headers', () => {
    render(<Photos {...baseProps} allPhotos={mockPhotos} photosGrouping="planting" />);
    // text-transform: uppercase in CSS, actual DOM text is the original case
    expect(screen.getByText('Tomatoes')).toBeInTheDocument();
    expect(screen.getByText('Peppers')).toBeInTheDocument();
  });

  it('By Planting grouping shows variety and photo counts', () => {
    render(<Photos {...baseProps} allPhotos={mockPhotos} photosGrouping="planting" />);
    // Each category has 1 variety and 1 photo
    const varietyTexts = screen.getAllByText(/1 variety/);
    expect(varietyTexts.length).toBeGreaterThan(0);
  });

  it('By Planting grouping shows seed name as group label', () => {
    render(<Photos {...baseProps} allPhotos={mockPhotos} photosGrouping="planting" />);
    expect(screen.getByText('Sun Gold')).toBeInTheDocument();
    expect(screen.getByText('Ace F1')).toBeInTheDocument();
  });

  it('renderPhotoCard shows taken_date as label in By Planting grouping', () => {
    render(<Photos {...baseProps} allPhotos={mockPhotos} photosGrouping="planting" />);
    // formatDate('2026-03-10') → 'Mar 10'
    expect(screen.getByText('Mar 10')).toBeInTheDocument();
  });

  it('renderPhotoCard shows seed_name as label in By Time grouping', () => {
    render(<Photos {...baseProps} allPhotos={mockPhotos} photosGrouping="time" />);
    expect(screen.getByText('Sun Gold')).toBeInTheDocument();
  });

  it('renders photo caption when present', () => {
    render(<Photos {...baseProps} allPhotos={mockPhotos} />);
    expect(screen.getByText('First sprouts')).toBeInTheDocument();
  });
});
