import { formatRelativeTimeHe, freshnessLabelHe } from '../lib/relativeTime';

const NOW = new Date('2026-05-24T12:00:00Z').getTime();
const at = (deltaSec: number) =>
  new Date(NOW - deltaSec * 1000).toISOString();

describe('formatRelativeTimeHe', () => {
  it.each([
    [0, 'לפני רגע'],
    [5, 'לפני רגע'],
    [30, 'לפני 30 שניות'],
    [60, 'לפני דקה'],
    [120, 'לפני 2 דקות'],
    [3600, 'לפני שעה'],
    [7200, 'לפני 2 שעות'],
    [86400, 'לפני יום'],
    [86400 * 3, 'לפני 3 ימים'],
  ])('seconds=%i → %s', (sec, expected) => {
    expect(formatRelativeTimeHe(at(sec), NOW)).toBe(expected);
  });

  it('falls back to "זה עתה" for non-parsable input', () => {
    expect(formatRelativeTimeHe('not-a-date', NOW)).toBe('זה עתה');
  });

  it('treats future timestamps as just-now (no negative seconds)', () => {
    const future = new Date(NOW + 5_000).toISOString();
    expect(formatRelativeTimeHe(future, NOW)).toBe('לפני רגע');
  });
});

describe('freshnessLabelHe', () => {
  it('classifies by minutes since the timestamp', () => {
    expect(freshnessLabelHe(at(10 * 60), NOW).level).toBe('live');
    expect(freshnessLabelHe(at(60 * 60), NOW).level).toBe('fresh');
    expect(freshnessLabelHe(at(6 * 3600), NOW).level).toBe('stale');
    expect(freshnessLabelHe(at(24 * 3600), NOW).level).toBe('outdated');
  });

  it('returns outdated for invalid input', () => {
    expect(freshnessLabelHe('garbage').level).toBe('outdated');
  });
});
