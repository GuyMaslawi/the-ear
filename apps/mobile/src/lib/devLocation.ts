// Single config knob for map/nearby discovery — NOT answer eligibility.
// Answer eligibility uses each drop's own `radiusMeters` (default 220m).
// discovery radius only (not answer radius)
export const VISIBILITY_RADIUS_METERS = 2500;

/**
 * Dev/fallback map center. Used only when device GPS is unavailable
 * (permission denied or hardware error). Production users with permission
 * always see their real GPS — this is never a silent override.
 */
export const DEV_FALLBACK_REGION = { lat: 32.0853, lng: 34.7818 };

export type LocationSource = 'gps' | 'fallback' | 'denied' | 'unavailable';
