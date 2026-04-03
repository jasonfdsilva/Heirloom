import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import StatCard from '../../components/common/StatCard';

describe('StatCard', () => {
  it('renders value', () => {
    render(<StatCard value={42} label="Seeds" />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders label', () => {
    render(<StatCard value={0} label="HARVESTING" />);
    expect(screen.getByText('HARVESTING')).toBeInTheDocument();
  });

  it('renders zero value', () => {
    render(<StatCard value={0} label="Done" />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
