import { canUserAnswerDrop, blockedReasonHe } from '../lib/answerEligibility';
import type { Drop } from '../types/api';

const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
const past = new Date(Date.now() - 60 * 1000).toISOString();

function drop(over: Partial<Drop> = {}): Drop {
  return {
    id: 'd1',
    question: 'q',
    category: 'QUEUE',
    location: { type: 'Point', coordinates: [34.78, 32.08] },
    radiusMeters: 500,
    status: 'ACTIVE',
    expiresAt: future,
    createdAt: new Date().toISOString(),
    answerCount: 0,
    aiSummary: '',
    confidenceScore: 0,
    isMine: false,
    ...over,
  };
}

describe('canUserAnswerDrop', () => {
  it('blocks answering your own drop', () => {
    const r = canUserAnswerDrop({
      drop: drop({ isMine: true }),
      userCoords: { lat: 32.08, lng: 34.78, source: 'gps' },
    });
    expect(r).toEqual({ canAnswer: false, reason: 'own_drop' });
  });

  it('blocks expired drops', () => {
    const r = canUserAnswerDrop({
      drop: drop({ expiresAt: past }),
      userCoords: { lat: 32.08, lng: 34.78, source: 'gps' },
    });
    expect(r.canAnswer).toBe(false);
    expect(r.reason).toBe('expired');
  });

  it('blocks non-ACTIVE drops as expired', () => {
    const r = canUserAnswerDrop({
      drop: drop({ status: 'CLOSED' }),
      userCoords: { lat: 32.08, lng: 34.78, source: 'gps' },
    });
    expect(r.reason).toBe('expired');
  });

  it('blocks when location is missing or denied/unavailable', () => {
    expect(
      canUserAnswerDrop({ drop: drop(), userCoords: null }).reason,
    ).toBe('missing_location');
    expect(
      canUserAnswerDrop({
        drop: drop(),
        userCoords: { lat: 0, lng: 0, source: 'denied' },
      }).reason,
    ).toBe('missing_location');
    expect(
      canUserAnswerDrop({
        drop: drop(),
        userCoords: { lat: 0, lng: 0, source: 'unavailable' },
      }).reason,
    ).toBe('missing_location');
  });

  it('blocks when outside the radius and returns the distance', () => {
    const r = canUserAnswerDrop({
      drop: drop({ radiusMeters: 100 }),
      userCoords: { lat: 32.09, lng: 34.78, source: 'gps' }, // ~1.1km
    });
    expect(r.canAnswer).toBe(false);
    expect(r.reason).toBe('out_of_radius');
    expect(r.distanceMeters).toBeGreaterThan(100);
  });

  it('allows when within radius', () => {
    const r = canUserAnswerDrop({
      drop: drop({ radiusMeters: 500 }),
      userCoords: { lat: 32.0805, lng: 34.78, source: 'gps' }, // ~55m
    });
    expect(r.canAnswer).toBe(true);
    expect(r.reason).toBe('allowed');
    expect(r.distanceMeters).toBeLessThanOrEqual(500);
  });
});

describe('blockedReasonHe', () => {
  it('returns specific Hebrew copy per reason', () => {
    expect(blockedReasonHe('own_drop')).toMatch(/שלך/);
    expect(blockedReasonHe('expired')).toMatch(/נסגרה/);
    expect(blockedReasonHe('missing_location')).toMatch(/מיקום/);
    expect(blockedReasonHe('out_of_radius', 800)).toContain('800');
    expect(blockedReasonHe('allowed')).toBe('');
  });
});
