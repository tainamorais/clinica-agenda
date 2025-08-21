import { describe, it, expect } from 'vitest';
import { formatISOToBR, calculateAgeFromISO, splitIsoYMD } from './date';

describe('date utils', () => {
  it('splitIsoYMD parses yyyy-mm-dd', () => {
    expect(splitIsoYMD('1945-03-12')).toEqual({ y: 1945, m: 3, d: 12 });
    expect(splitIsoYMD('1945-03-12T00:00:00.000Z')).toEqual({ y: 1945, m: 3, d: 12 });
    expect(splitIsoYMD('')).toBeNull();
  });

  it('formatISOToBR formats correctly', () => {
    expect(formatISOToBR('1945-03-12')).toBe('12/03/1945');
    expect(formatISOToBR('2025-08-21T10:00:00Z')).toBe('21/08/2025');
  });

  it('calculateAgeFromISO handles local time without tz issues', () => {
    const today = new Date(2025, 7, 21); // 21/08/2025
    expect(calculateAgeFromISO('1945-03-12', today)).toBe(80);
    expect(calculateAgeFromISO('2025-08-22', today)).toBe(0);
    expect(calculateAgeFromISO('2025-08-20', today)).toBe(0);
  });
});


