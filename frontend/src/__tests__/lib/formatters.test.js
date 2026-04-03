import { describe, it, expect } from 'vitest';
import { formatDate } from '../../lib/formatters';

describe('formatDate', () => {
  it('returns empty string for null', () => {
    expect(formatDate(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatDate(undefined)).toBe('');
  });

  it('formats a date string to short month + day', () => {
    const result = formatDate('2026-04-01');
    expect(result).toBe('Apr 1');
  });

  it('formats another date correctly', () => {
    const result = formatDate('2026-12-25');
    expect(result).toBe('Dec 25');
  });

  it('formats single-digit day without padding', () => {
    const result = formatDate('2026-01-05');
    expect(result).toBe('Jan 5');
  });
});
