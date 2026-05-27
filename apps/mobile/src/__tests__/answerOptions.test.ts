import {
  detectAnswerType,
  getAnswerOptions,
  getAnswerOptionByKey,
  quickStatusLabel,
} from '../lib/answerOptions';

describe('detectAnswerType', () => {
  it('prefers text keywords over the category', () => {
    expect(detectAnswerType('OTHER', 'יש חניה ליד?')).toBe('PARKING');
    expect(detectAnswerType('OTHER', 'יש תור?')).toBe('QUEUE');
    expect(detectAnswerType('OTHER', 'משטרה במקום?')).toBe('SAFETY');
    expect(detectAnswerType('OTHER', 'יש את המוצר במלאי?')).toBe('PRODUCT');
  });

  it('falls back to category mapping when no keyword matches', () => {
    expect(detectAnswerType('QUEUE', 'general question?')).toBe('QUEUE');
    expect(detectAnswerType('CROWD', 'general question?')).toBe('QUEUE');
    expect(detectAnswerType('SAFETY', 'general question?')).toBe('SAFETY');
    expect(detectAnswerType('INCIDENT', 'general question?')).toBe('SAFETY');
    expect(detectAnswerType('OTHER', 'general question?')).toBe('GENERAL');
  });
});

describe('getAnswerOptions', () => {
  it('returns the parking option set for a parking-detected question', () => {
    const opts = getAnswerOptions('OTHER', 'יש חניה?');
    const keys = opts.map((o) => o.key);
    expect(keys).toEqual(['PLENTY', 'SOME', 'HARD', 'NONE']);
  });

  it('returns GENERAL options for a neutral OTHER drop', () => {
    const opts = getAnswerOptions('OTHER', 'what about this?');
    expect(opts.map((o) => o.key)).toEqual(['YES', 'NO', 'UNKNOWN']);
  });
});

describe('getAnswerOptionByKey', () => {
  it('finds an option within the detected set', () => {
    expect(
      getAnswerOptionByKey('QUEUE', 'יש תור?', 'EMPTY')?.label,
    ).toBe('ריק');
  });

  it('returns undefined for a key not in the detected set', () => {
    expect(getAnswerOptionByKey('QUEUE', 'יש תור?', 'PLENTY')).toBeUndefined();
  });
});

describe('quickStatusLabel', () => {
  it('returns icon + label when category/question are provided', () => {
    expect(quickStatusLabel('EMPTY', 'QUEUE', 'יש תור?')).toContain('ריק');
  });

  it('falls back across all groups when no context is given', () => {
    expect(quickStatusLabel('PLENTY')).toContain('יש מלא');
  });

  it('returns the raw key when nothing matches', () => {
    expect(quickStatusLabel('NOT_A_REAL_KEY')).toBe('NOT_A_REAL_KEY');
  });
});
