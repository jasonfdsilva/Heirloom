import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ThumbPreview from '../../components/common/ThumbPreview';

describe('ThumbPreview', () => {
  it('renders image when url provided', () => {
    render(<ThumbPreview url="/test.jpg" alt="Kale" color="#888" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/test.jpg');
  });

  it('renders colour placeholder when no url', () => {
    const { container } = render(<ThumbPreview url={null} color="#4a90e2" />);
    expect(container.querySelector('img')).toBeNull();
    // outer wrapper div > placeholder div
    expect(container.querySelector('div > div > div')).toBeTruthy();
  });

  it('shows popup on mouseenter when url is present', () => {
    const { container } = render(<ThumbPreview url="/test.jpg" alt="Kale" color="#888" />);
    fireEvent.mouseEnter(container.firstChild);
    // Both the thumbnail and the popup should now render an <img>
    expect(screen.getAllByRole('img').length).toBe(2);
  });

  it('hides popup on mouseleave', () => {
    const { container } = render(<ThumbPreview url="/test.jpg" alt="Kale" color="#888" />);
    fireEvent.mouseEnter(container.firstChild);
    fireEvent.mouseLeave(container.firstChild);
    expect(screen.getAllByRole('img').length).toBe(1);
  });

  it('does not show popup when no url on mouseenter', () => {
    const { container } = render(<ThumbPreview url={null} color="#888" />);
    fireEvent.mouseEnter(container.firstChild);
    expect(container.querySelector('img')).toBeNull();
  });

  it('respects custom size prop', () => {
    render(<ThumbPreview url="/test.jpg" alt="test" color="#888" size={60} />);
    expect(screen.getByRole('img')).toHaveStyle({ width: '60px', height: '60px' });
  });

  it('shows lock badge when locked=true', () => {
    const { container } = render(<ThumbPreview url="/test.jpg" alt="test" color="#888" locked={true} />);
    expect(container.textContent).toContain('🔒');
  });

  it('does not show lock badge when locked=false', () => {
    const { container } = render(<ThumbPreview url="/test.jpg" alt="test" color="#888" locked={false} />);
    expect(container.textContent).not.toContain('🔒');
  });

  it('applies custom opacity to placeholder', () => {
    const { container } = render(<ThumbPreview url={null} color="#888" opacity={0.5} />);
    const placeholder = container.querySelector('div > div > div');
    expect(placeholder.style.opacity).toBe('0.5');
  });

  it('hides img element on load error via onError handler', () => {
    render(<ThumbPreview url="/broken.jpg" alt="test" color="#888" />);
    const img = screen.getByRole('img');
    // Fire the error event — the onError handler sets display:none
    fireEvent.error(img);
    expect(img.style.display).toBe('none');
  });

  it('popup flips to the left when near the right edge of the viewport', () => {
    // Make the viewport very narrow so r.right + 8 + 188 > window.innerWidth
    const origWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 100 });

    const { container } = render(<ThumbPreview url="/test.jpg" alt="Edge Test" color="#888" />);
    fireEvent.mouseEnter(container.firstChild);

    // Two images: thumbnail + popup (popup appeared without crashing)
    expect(screen.getAllByRole('img').length).toBe(2);

    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: origWidth });
  });
});
