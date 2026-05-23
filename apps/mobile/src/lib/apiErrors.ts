/**
 * Typed API failures for UI copy and logging (separate from location permission).
 */

export type ApiFailureKind = 'timeout' | 'network' | 'server' | 'client' | 'unknown';

export class ApiError extends Error {
  readonly kind: ApiFailureKind;
  readonly status?: number;
  readonly endpoint: string;

  constructor(
    message: string,
    opts: { kind: ApiFailureKind; status?: number; endpoint: string },
  ) {
    super(message);
    this.name = 'ApiError';
    this.kind = opts.kind;
    this.status = opts.status;
    this.endpoint = opts.endpoint;
  }
}

export function toApiError(err: unknown, endpoint: string): ApiError {
  if (err instanceof ApiError) return err;
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();

  if (err instanceof Error && err.name === 'AbortError') {
    return new ApiError(raw, { kind: 'timeout', endpoint });
  }
  if (raw === 'Timeout' || lower.includes('timeout')) {
    return new ApiError(raw, { kind: 'timeout', endpoint });
  }
  if (
    lower.includes('network request failed') ||
    lower.includes('failed to fetch') ||
    lower.includes('network error') ||
    lower.includes('load failed') ||
    lower.includes('the internet connection appears to be offline')
  ) {
    return new ApiError(raw, { kind: 'network', endpoint });
  }
  return new ApiError(raw, { kind: 'unknown', endpoint });
}

/** Uses `ApiError.endpoint` when available (after `request()`). */
export function apiUserMessageHeAuto(err: unknown): string {
  if (err instanceof ApiError) return apiUserMessageHe(err, err.endpoint);
  return apiUserMessageHe(err, 'request');
}

/** Hebrew copy aligned with product requirements. */
export function apiUserMessageHe(err: unknown, endpoint: string): string {
  const e = err instanceof ApiError ? err : toApiError(err, endpoint);
  switch (e.kind) {
    case 'timeout':
      return 'החיבור לאינטרנט איטי מדי — נסה שוב בעוד רגע.';
    case 'network':
      return 'בעיית רשת — בדוק חיבור לאינטרנט ונסה שוב.';
    case 'server':
      return 'השרת לא מגיב כרגע — נסה שוב בעוד רגע.';
    case 'client':
      return e.message || 'הבקשה לא אושרה. נסה שוב.';
    default:
      if (e.message && e.message !== 'Timeout') return e.message;
      return 'משהו השתבש — נסה שוב בעוד רגע.';
  }
}

export const LOCATION_PERMISSION_MESSAGE_HE =
  'כדי להציג נתונים רלוונטיים לאזור שלך, אפשר גישת מיקום בהגדרות המכשיר.';

export const NO_NEARBY_QUESTIONS_MESSAGE_HE = 'שקט באזור הזה כרגע · עוקבים בזמן אמת ונעדכן כשמשהו קורה.';
