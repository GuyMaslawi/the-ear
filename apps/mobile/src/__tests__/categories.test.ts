import {
  categoryHe,
  categoryLabelHe,
  categoryMarkerIcon,
} from '../lib/categories';

describe('categories', () => {
  it('has Hebrew label and marker icon for every DropCategory', () => {
    const cats = ['QUEUE', 'PARKING', 'CROWD', 'INCIDENT', 'PRODUCT', 'SAFETY', 'OTHER'] as const;
    for (const c of cats) {
      expect(typeof categoryLabelHe[c]).toBe('string');
      expect(categoryLabelHe[c].length).toBeGreaterThan(0);
      expect(typeof categoryMarkerIcon[c]).toBe('string');
      expect(categoryMarkerIcon[c].length).toBeGreaterThan(0);
    }
  });

  it('categoryHe falls back to the raw category for unknown values', () => {
    expect(categoryHe('QUEUE')).toBe(categoryLabelHe.QUEUE);
    expect(categoryHe('UNKNOWN_CAT')).toBe('UNKNOWN_CAT');
  });
});
