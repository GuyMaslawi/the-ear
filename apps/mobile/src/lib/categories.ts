import type { DropCategory } from '../types/api';

/** Hebrew labels for drop categories (MVP copy). */
export const categoryLabelHe: Record<DropCategory, string> = {
  QUEUE: 'תור',
  PARKING: 'חניה',
  CROWD: 'עומס',
  INCIDENT: 'אירוע',
  PRODUCT: 'מוצר',
  SAFETY: 'בטיחות',
  OTHER: 'אחר',
};

/** Compact icon for map markers / chips. */
export const categoryMarkerIcon: Record<DropCategory, string> = {
  QUEUE: '⏱',
  PARKING: '🅿',
  CROWD: '👥',
  INCIDENT: '⚠',
  PRODUCT: '📦',
  SAFETY: '🛡',
  OTHER: '···',
};

export function categoryHe(category: string): string {
  return categoryLabelHe[category as DropCategory] ?? category;
}
