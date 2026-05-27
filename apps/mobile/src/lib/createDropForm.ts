import { validateQuestion } from './questionValidation';

export const R_MIN = 40;
export const R_MAX = 2000;
export const R_DEFAULT = 220;

export function clampRadius(raw: number): number {
  if (!Number.isFinite(raw)) return R_DEFAULT;
  return Math.min(R_MAX, Math.max(R_MIN, Math.round(raw)));
}

export type RadiusParse = {
  raw: number;
  meters: number;
  inputOk: boolean;
};

export function parseRadiusInput(input: string): RadiusParse {
  const raw = Number(String(input ?? '').replace(',', '.'));
  const finite = Number.isFinite(raw);
  const meters = clampRadius(finite ? raw : R_DEFAULT);
  const inputOk = finite && raw >= R_MIN && raw <= R_MAX;
  return { raw: finite ? raw : NaN, meters, inputOk };
}

export function isLocationOk(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  );
}

export type CreateDropFormInput = {
  question: string;
  radiusInput: string;
  lat: unknown;
  lng: unknown;
  busy: boolean;
};

export type CreateDropFormState = {
  trimmedLen: number;
  charLenOk: boolean;
  shapeOk: boolean;
  radius: RadiusParse;
  locationOk: boolean;
  canSubmit: boolean;
  disabledReasonHe: string;
};

const MIN_Q_LEN = 5;

export function evaluateCreateDropForm(input: CreateDropFormInput): CreateDropFormState {
  const trimmed = (input.question ?? '').trim();
  const trimmedLen = trimmed.length;
  const charLenOk = trimmedLen >= MIN_Q_LEN;

  const validation = validateQuestion(input.question ?? '');
  const shapeOk = validation.ok;

  const radius = parseRadiusInput(input.radiusInput ?? '');
  const locationOk = isLocationOk(input.lat, input.lng);

  const canSubmit =
    charLenOk && shapeOk && radius.inputOk && locationOk && !input.busy;

  const parts: string[] = [];
  if (!charLenOk) {
    parts.push(`הוסיפו לפחות ${MIN_Q_LEN} תווים לשאלה (כרגע ${trimmedLen})`);
  } else if (!shapeOk && !validation.ok) {
    parts.push(validation.messageHe);
  }
  if (!radius.inputOk) {
    parts.push(`שימו רדיוס בין ${R_MIN} ל‑${R_MAX} מטר`);
  }
  if (!locationOk) {
    parts.push('חסר מיקום מהמפה — חזרו למפה ובחרו נקודה או מרכז תצוגה לפני שליחה');
  }

  return {
    trimmedLen,
    charLenOk,
    shapeOk,
    radius,
    locationOk,
    canSubmit,
    disabledReasonHe: parts.join(' · '),
  };
}
