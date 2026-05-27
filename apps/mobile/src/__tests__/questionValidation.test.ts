import { validateQuestion } from '../lib/questionValidation';

describe('validateQuestion', () => {
  it('rejects strings shorter than 5 characters', () => {
    const r = validateQuestion('יש?');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.messageHe).toMatch(/קצרה/);
  });

  it('rejects strings with very few unique characters', () => {
    expect(validateQuestion('aaaaaa').ok).toBe(false);
    expect(validateQuestion('xxxxx').ok).toBe(false);
  });

  it('rejects gibberish Latin runs with no vowels', () => {
    const r = validateQuestion('bcdfg hjklmnp');
    expect(r.ok).toBe(false);
  });

  it('accepts a Hebrew question', () => {
    expect(validateQuestion('יש תור בקופה?').ok).toBe(true);
  });

  it('accepts an English question with vowels', () => {
    expect(validateQuestion('is there a queue').ok).toBe(true);
  });

  it('accepts mixed Hebrew + Latin', () => {
    expect(validateQuestion('יש Wifi כאן?').ok).toBe(true);
  });

  it('rejects too-short Hebrew (<5 chars)', () => {
    expect(validateQuestion('שלום').ok).toBe(false); // 4 chars
  });

  it('accepts a 5+ char single Hebrew word', () => {
    expect(validateQuestion('בוקרים').ok).toBe(true);
  });
});
