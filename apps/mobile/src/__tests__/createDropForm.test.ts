import {
  R_MIN,
  R_MAX,
  R_DEFAULT,
  clampRadius,
  parseRadiusInput,
  isLocationOk,
  evaluateCreateDropForm,
} from '../lib/createDropForm';

describe('clampRadius', () => {
  it('returns the default for non-finite inputs', () => {
    expect(clampRadius(NaN)).toBe(R_DEFAULT);
    expect(clampRadius(Infinity)).toBe(R_DEFAULT);
  });

  it('clamps below the minimum up to R_MIN', () => {
    expect(clampRadius(0)).toBe(R_MIN);
    expect(clampRadius(-50)).toBe(R_MIN);
    expect(clampRadius(R_MIN - 1)).toBe(R_MIN);
  });

  it('clamps above the maximum down to R_MAX', () => {
    expect(clampRadius(10_000)).toBe(R_MAX);
    expect(clampRadius(R_MAX + 1)).toBe(R_MAX);
  });

  it('rounds non-integer values', () => {
    expect(clampRadius(150.4)).toBe(150);
    expect(clampRadius(150.6)).toBe(151);
  });
});

describe('parseRadiusInput', () => {
  it('parses plain numeric strings', () => {
    expect(parseRadiusInput('220')).toEqual({ raw: 220, meters: 220, inputOk: true });
  });

  it('accepts comma as decimal separator (locale fallback)', () => {
    const r = parseRadiusInput('150,5');
    expect(r.meters).toBe(151);
    expect(r.inputOk).toBe(true);
  });

  it('flags out-of-range inputs but still produces a clamped meters value', () => {
    const below = parseRadiusInput('10');
    expect(below.inputOk).toBe(false);
    expect(below.meters).toBe(R_MIN);

    const above = parseRadiusInput('5000');
    expect(above.inputOk).toBe(false);
    expect(above.meters).toBe(R_MAX);
  });

  it('returns inputOk=false and default meters for non-numeric input', () => {
    const r = parseRadiusInput('abc');
    expect(r.inputOk).toBe(false);
    expect(r.meters).toBe(R_DEFAULT);
  });

  it('returns inputOk=false for empty input', () => {
    expect(parseRadiusInput('').inputOk).toBe(false);
  });
});

describe('isLocationOk', () => {
  it('accepts finite numeric pairs', () => {
    expect(isLocationOk(32.08, 34.78)).toBe(true);
  });

  it('rejects non-number or non-finite values', () => {
    expect(isLocationOk(undefined, undefined)).toBe(false);
    expect(isLocationOk(null, null)).toBe(false);
    expect(isLocationOk('32.08', '34.78')).toBe(false);
    expect(isLocationOk(NaN, 34.78)).toBe(false);
    expect(isLocationOk(32.08, Infinity)).toBe(false);
  });
});

describe('evaluateCreateDropForm', () => {
  const baseInput = {
    question: 'יש תור בקופה?',
    radiusInput: '220',
    lat: 32.08,
    lng: 34.78,
    busy: false,
  };

  it('allows submission for a well-formed question with location and radius', () => {
    const r = evaluateCreateDropForm(baseInput);
    expect(r.canSubmit).toBe(true);
    expect(r.disabledReasonHe).toBe('');
    expect(r.radius.meters).toBe(220);
  });

  it('blocks submission while busy (loading state)', () => {
    const r = evaluateCreateDropForm({ ...baseInput, busy: true });
    expect(r.canSubmit).toBe(false);
  });

  it('blocks short questions and reports the current length', () => {
    const r = evaluateCreateDropForm({ ...baseInput, question: 'יש?' });
    expect(r.canSubmit).toBe(false);
    expect(r.disabledReasonHe).toMatch(/לפחות 5 תווים/);
    expect(r.disabledReasonHe).toMatch(/כרגע 3/);
  });

  it('blocks gibberish questions with the validation reason', () => {
    const r = evaluateCreateDropForm({
      ...baseInput,
      question: 'bcdfg hjklmnp',
    });
    expect(r.canSubmit).toBe(false);
    expect(r.disabledReasonHe.length).toBeGreaterThan(0);
  });

  it('blocks when radius is out of bounds', () => {
    const r = evaluateCreateDropForm({ ...baseInput, radiusInput: '5' });
    expect(r.canSubmit).toBe(false);
    expect(r.disabledReasonHe).toMatch(/רדיוס/);
  });

  it('blocks when location is missing and tells the user to pick a point', () => {
    const r = evaluateCreateDropForm({ ...baseInput, lat: undefined, lng: undefined });
    expect(r.canSubmit).toBe(false);
    expect(r.disabledReasonHe).toMatch(/מיקום/);
  });

  it('joins multiple reasons with separator dots', () => {
    const r = evaluateCreateDropForm({
      ...baseInput,
      question: 'יש?',
      radiusInput: '5',
      lat: undefined,
      lng: undefined,
    });
    expect(r.canSubmit).toBe(false);
    expect(r.disabledReasonHe.split(' · ').length).toBeGreaterThanOrEqual(3);
  });
});
