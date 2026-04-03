import { describe, it, expect } from 'vitest';
import { catColor, statusColor, plantStatusColor } from '../../lib/colors';

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

describe('plantStatusColor', () => {
  it('returns correct color for known plant status', () => {
    expect(plantStatusColor('healthy')).toBe('#16a34a');
    expect(plantStatusColor('struggling')).toBe('#f59e0b');
    expect(plantStatusColor('dead')).toBe('#6b7280');
    expect(plantStatusColor('harvested-out')).toBe('#7c3aed');
  });

  it('returns fallback for unknown plant status', () => {
    expect(plantStatusColor('unknown')).toBe('#9ca3af');
    expect(plantStatusColor('')).toBe('#9ca3af');
  });
});
