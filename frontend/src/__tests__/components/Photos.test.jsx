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
});
