import { buildOfflineDrop } from '../lib/localDrop';

describe('buildOfflineDrop', () => {
  it('returns a Drop with local- id, ACTIVE status, isMine=true', () => {
    const d = buildOfflineDrop({
      question: 'q',
      category: 'QUEUE',
      lat: 32.08,
      lng: 34.78,
      radiusMeters: 500,
    });
    expect(d.id.startsWith('local-')).toBe(true);
    expect(d.status).toBe('ACTIVE');
    expect(d.isMine).toBe(true);
    expect(d.answerCount).toBe(0);
    expect(d.location).toEqual({ type: 'Point', coordinates: [34.78, 32.08] });
  });

  it('sets expiresAt ~24h in the future', () => {
    const before = Date.now();
    const d = buildOfflineDrop({
      question: 'q',
      category: 'OTHER',
      lat: 0,
      lng: 0,
      radiusMeters: 100,
    });
    const after = Date.now();
    const exp = new Date(d.expiresAt).getTime();
    const day = 24 * 60 * 60 * 1000;
    expect(exp).toBeGreaterThanOrEqual(before + day);
    expect(exp).toBeLessThanOrEqual(after + day);
  });

  it('produces unique ids for back-to-back calls', () => {
    const a = buildOfflineDrop({
      question: 'q',
      category: 'OTHER',
      lat: 0,
      lng: 0,
      radiusMeters: 100,
    });
    const b = buildOfflineDrop({
      question: 'q',
      category: 'OTHER',
      lat: 0,
      lng: 0,
      radiusMeters: 100,
    });
    expect(a.id).not.toBe(b.id);
  });
});
