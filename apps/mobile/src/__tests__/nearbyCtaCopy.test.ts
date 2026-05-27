import { askCtaLabelHe, nearbyEmptyMessageHe } from '../lib/nearbyCtaCopy';

describe('askCtaLabelHe', () => {
  it('changes copy when a pin is selected vs. region center', () => {
    expect(askCtaLabelHe(true)).toBe('שאל על הנקודה הזו');
    expect(askCtaLabelHe(false)).toBe('שאל באזור הזה');
  });
});

describe('nearbyEmptyMessageHe', () => {
  it('uses the API error message when in error phase', () => {
    expect(
      nearbyEmptyMessageHe({
        phase: 'error',
        apiUserMessage: 'בעיית רשת',
        locationPermissionDenied: false,
      }),
    ).toBe('בעיית רשת');
  });

  it('falls back to generic retry copy in error phase when no message provided', () => {
    expect(
      nearbyEmptyMessageHe({
        phase: 'error',
        apiUserMessage: null,
        locationPermissionDenied: false,
      }),
    ).toMatch(/לרענן/);
  });

  it('mentions location permission when denied (no error)', () => {
    const msg = nearbyEmptyMessageHe({
      phase: 'success',
      locationPermissionDenied: true,
    });
    expect(msg).toMatch(/מיקום/);
  });

  it('returns the quiet default when nothing is wrong', () => {
    const msg = nearbyEmptyMessageHe({
      phase: 'success',
      locationPermissionDenied: false,
    });
    expect(msg).toMatch(/שקט באזור/);
  });

  it('prioritizes error phase over location-denied state', () => {
    expect(
      nearbyEmptyMessageHe({
        phase: 'error',
        apiUserMessage: 'server down',
        locationPermissionDenied: true,
      }),
    ).toBe('server down');
  });
});
