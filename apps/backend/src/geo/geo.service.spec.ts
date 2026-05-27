import { GeoService } from './geo.service';

describe('GeoService', () => {
  const geo = new GeoService();

  describe('point', () => {
    it('returns GeoJSON Point with [lng, lat] order', () => {
      expect(geo.point(32.0853, 34.7818)).toEqual({
        type: 'Point',
        coordinates: [34.7818, 32.0853],
      });
    });
  });

  describe('approximatePoint', () => {
    it('rounds coordinates to ~11m precision (4 decimal places)', () => {
      const p = geo.approximatePoint(32.085312345, 34.781812345);
      expect(p.type).toBe('Point');
      expect(p.coordinates[0]).toBeCloseTo(34.7818, 5);
      expect(p.coordinates[1]).toBeCloseTo(32.0853, 5);
    });

    it('does not leak high-precision coordinates', () => {
      const p = geo.approximatePoint(32.0853999, 34.7818999);
      const [lng, lat] = p.coordinates;
      // 4 decimal places of precision means difference < 1e-4 from rounded value
      expect(Math.abs(lat - 32.0854)).toBeLessThan(1e-9);
      expect(Math.abs(lng - 34.7819)).toBeLessThan(1e-9);
    });
  });

  describe('distanceMeters', () => {
    it('returns 0 for identical points', () => {
      const p = geo.point(32, 34);
      expect(geo.distanceMeters(p, p)).toBe(0);
    });

    it('matches a known distance within 1% (Tel Aviv → Jerusalem ≈ 54 km)', () => {
      const a = geo.point(32.0853, 34.7818);
      const b = geo.point(31.7683, 35.2137);
      const d = geo.distanceMeters(a, b);
      expect(d).toBeGreaterThan(53_000);
      expect(d).toBeLessThan(56_000);
    });

    it('is symmetric', () => {
      const a = geo.point(32.0, 34.7);
      const b = geo.point(32.1, 34.8);
      expect(geo.distanceMeters(a, b)).toBeCloseTo(geo.distanceMeters(b, a), 6);
    });

    it('returns roughly 111 km per degree of latitude', () => {
      const a = geo.point(0, 0);
      const b = geo.point(1, 0);
      const d = geo.distanceMeters(a, b);
      expect(d).toBeGreaterThan(110_000);
      expect(d).toBeLessThan(112_000);
    });
  });
});
