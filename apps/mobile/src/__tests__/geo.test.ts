import { distanceMeters } from '../lib/geo';

describe('distanceMeters (mobile)', () => {
  it('is zero for the same point', () => {
    expect(distanceMeters(32, 34, 32, 34)).toBe(0);
  });

  it('returns ~111km per degree of latitude at the equator', () => {
    const d = distanceMeters(0, 0, 1, 0);
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_000);
  });

  it('is symmetric', () => {
    const a = distanceMeters(32.0, 34.7, 32.1, 34.8);
    const b = distanceMeters(32.1, 34.8, 32.0, 34.7);
    expect(a).toBeCloseTo(b, 6);
  });

  it('matches Tel Aviv → Jerusalem within 1% (~54km)', () => {
    const d = distanceMeters(32.0853, 34.7818, 31.7683, 35.2137);
    expect(d).toBeGreaterThan(53_000);
    expect(d).toBeLessThan(56_000);
  });
});
