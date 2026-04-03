import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import EmptyState from '../../components/common/EmptyState';

describe('EmptyState', () => {
  it('renders message text', () => {
    render(<EmptyState message="Nothing to see here" />);
    expect(screen.getByText('Nothing to see here')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(<EmptyState icon="🌱" message="No plantings yet" />);
    expect(screen.getByText('🌱')).toBeInTheDocument();
  });

  it('does not render icon div when icon is omitted', () => {
    const { container } = render(<EmptyState message="No items" />);
    expect(container.querySelector('.empty-icon')).toBeNull();
  });

  it('applies custom style', () => {
    const { container } = render(<EmptyState message="test" style={{ padding: 16 }} />);
    const el = container.querySelector('.empty');
    expect(el).toHaveStyle({ padding: '16px' });
  });
});
