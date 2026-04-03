import { describe, it, expect } from 'vitest';
import { catColor, statusColor } from '../../lib/colors';

describe('catColor', () => {
  it('returns correct color for known category', () => {
    expect(catColor('Peppers')).toBe('#dc2626');
    expect(catColor('Herbs')).toBe('#16a34a');
    expect(catColor('Greens')).toBe('#65a30d');
    expect(catColor('Tomatoes')).toBe('#ea580c');
  });

  it('returns fallback grey for unknown category', () => {
    expect(catColor('Unknown')).toBe('#6b7280');
    expect(catColor('')).toBe('#6b7280');
    expect(catColor(null)).toBe('#6b7280');
  });
});

describe('statusColor', () => {
  it('returns correct color for known status', () => {
    expect(statusColor('planned')).toBe('#9ca3af');
    expect(statusColor('started')).toBe('#8b5cf6');
    expect(statusColor('growing')).toBe('#16a34a');
    expect(statusColor('harvesting')).toBe('#ea580c');
    expect(statusColor('done')).toBe('#6b7280');
  });

  it('returns fallback for unknown status', () => {
    expect(statusColor('invalid')).toBe('#9ca3af');
    expect(statusColor('')).toBe('#9ca3af');
  });
});
