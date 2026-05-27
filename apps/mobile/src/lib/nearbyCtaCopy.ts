import type { FetchPhase } from './fetchState';
import {
  LOCATION_PERMISSION_MESSAGE_HE,
  NO_NEARBY_QUESTIONS_MESSAGE_HE,
} from './apiErrors';

/** CTA label for the nearby sheet's primary "ask" button. */
export function askCtaLabelHe(hasSelectedPoint: boolean): string {
  return hasSelectedPoint ? 'שאל על הנקודה הזו' : 'שאל באזור הזה';
}

/**
 * Empty-list copy for the nearby sheet.
 * Priority: explicit API error > location-permission denied > default quiet.
 */
export function nearbyEmptyMessageHe(input: {
  phase: FetchPhase;
  apiUserMessage?: string | null;
  locationPermissionDenied: boolean;
}): string {
  if (input.phase === 'error') {
    return input.apiUserMessage ?? 'לא הצלחנו לטעון את הרשימה — נסה לרענן.';
  }
  if (input.locationPermissionDenied) {
    return `${NO_NEARBY_QUESTIONS_MESSAGE_HE}\n${LOCATION_PERMISSION_MESSAGE_HE}`;
  }
  return NO_NEARBY_QUESTIONS_MESSAGE_HE;
}
