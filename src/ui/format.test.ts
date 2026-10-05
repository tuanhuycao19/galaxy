import { describe, expect, it } from 'vitest';
import { formatAu, formatDegrees, formatDuration, formatKm, formatNumber } from './format';

describe('format', () => {
  it('uses Vietnamese separators', () => {
    expect(formatNumber(1234567.891, 2)).toBe('1.234.567,89');
    expect(formatKm(69_911)).toBe('69.911 km');
    expect(formatDegrees(23.44)).toBe('23,44°');
  });

  it('shows distances in AU and millions of km', () => {
    expect(formatAu(1)).toBe('1,00 AU · 149,6 triệu km');
  });

  it('picks a readable unit for durations', () => {
    expect(formatDuration(23.934 / 24)).toBe('23,9 giờ');
    expect(formatDuration(87.969)).toBe('88,0 ngày');
    expect(formatDuration(686.98)).toBe('687,0 ngày');
    expect(formatDuration(4_332.59)).toBe('11,86 năm');
  });
});
