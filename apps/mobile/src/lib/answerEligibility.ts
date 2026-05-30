import type { Drop } from '../types/api';
import { distanceMeters, formatDistanceHe } from './geo';
import type { LocationSource } from './devLocation';

export type BlockReason =
  | 'own_drop'
  | 'missing_location'
  | 'out_of_radius'
  | 'expired'
  | 'allowed';

export type EligibilityCoords = {
  lat: number;
  lng: number;
  source: LocationSource;
};

export type EligibilityInput = {
  drop: Drop;
  userCoords: EligibilityCoords | null;
};

export type EligibilityResult = {
  canAnswer: boolean;
  reason: BlockReason;
  /** Present whenever coords were usable for a distance computation. */
  distanceMeters?: number;
};

/**
 * Single source of truth for "can this user answer this drop right now?".
 * Backend remains authoritative on the actual POST.
 */
export function canUserAnswerDrop({
  drop,
  userCoords,
}: EligibilityInput): EligibilityResult {
  if (drop.isMine) {
    logEligibility(drop, userCoords, undefined, false, 'own_drop');
    return { canAnswer: false, reason: 'own_drop' };
  }
  const expired =
    drop.status !== 'ACTIVE' ||
    new Date(drop.expiresAt).getTime() <= Date.now();
  if (expired) {
    logEligibility(drop, userCoords, undefined, false, 'expired');
    return { canAnswer: false, reason: 'expired' };
  }
  if (
    !userCoords ||
    userCoords.source === 'denied' ||
    userCoords.source === 'unavailable'
  ) {
    logEligibility(drop, userCoords, undefined, false, 'missing_location');
    return { canAnswer: false, reason: 'missing_location' };
  }
  const [lng, lat] = drop.location.coordinates;
  const dist = Math.round(
    distanceMeters(userCoords.lat, userCoords.lng, lat, lng),
  );
  const canAnswer = dist <= drop.radiusMeters;
  const reason: BlockReason = canAnswer ? 'allowed' : 'out_of_radius';
  logEligibility(drop, userCoords, dist, canAnswer, reason);
  return canAnswer
    ? { canAnswer: true, reason: 'allowed', distanceMeters: dist }
    : { canAnswer: false, reason: 'out_of_radius', distanceMeters: dist };
}

export function blockedReasonHe(
  reason: BlockReason,
  distanceMeters?: number,
): string {
  switch (reason) {
    case 'own_drop':
      return 'זו שאלה שלך — ממתין לתשובות מהשטח';
    case 'out_of_radius':
      return `צריך להיות קרוב יותר כדי לענות מהשטח · מרחק נוכחי: ${
        distanceMeters != null ? formatDistanceHe(distanceMeters) : '?'
      }`;
    case 'missing_location':
      return 'צריך מיקום פעיל כדי לענות';
    case 'expired':
      return 'השאלה נסגרה';
    case 'allowed':
      return '';
  }
}

function logEligibility(
  drop: Drop,
  userCoords: EligibilityCoords | null,
  distance: number | undefined,
  canAnswer: boolean,
  reason: BlockReason,
) {
  if (!__DEV__) return;
  console.log(
    `[eligibility] dropId=${drop.id} distance=${distance ?? 'n/a'} radius=${drop.radiusMeters} isOwnDrop=${drop.isMine} canAnswer=${canAnswer} reason=${reason} source=${userCoords?.source ?? 'none'}`,
  );
}
