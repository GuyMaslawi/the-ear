import { inferCategory } from '../lib/inferCategory';

describe('inferCategory', () => {
  it.each([
    ['יש חניה?', 'PARKING'],
    ['is there parking near?', 'PARKING'],
    ['המתנה ארוכה?', 'QUEUE'],
    ['כמה מחכים שם?', 'QUEUE'],
    ['queue is long?', 'QUEUE'],
    ['עומס בקופה', 'CROWD'],
    ['is it crowded', 'CROWD'],
    ['יש משטרה במקום?', 'SAFETY'],
    ['some danger here?', 'SAFETY'],
    ['אירוע מסיבה', 'INCIDENT'],
    ['protest downtown', 'INCIDENT'],
    ['יש את המוצר במלאי?', 'PRODUCT'],
    ['hello world question', 'OTHER'],
  ] as const)('"%s" → %s', (q, expected) => {
    expect(inferCategory(q)).toBe(expected);
  });

  it('returns OTHER for empty strings', () => {
    expect(inferCategory('')).toBe('OTHER');
    expect(inferCategory('   ')).toBe('OTHER');
  });
});
