/**
 * Client-side checks so obvious garbage ("asdf") does not get submitted.
 * Hebrew-heavy questions are allowed without Latin vowels.
 */

const HEBREW = /[\u0590-\u05FF]/;
const LATIN = /[A-Za-z]/;
const VOWEL = /[AEIOUYaeiouyאהוי]/;

/** Letter runs of 2+ characters (any script). */
function letterRuns(text: string): string[] {
  const runs: string[] = [];
  const re = /\p{L}{2,}/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    runs.push(m[0]);
  }
  return runs;
}

function latinLooksGibberish(run: string): boolean {
  if (!LATIN.test(run)) return false;
  if (!HEBREW.test(run) && run.length >= 4 && !VOWEL.test(run)) return true;
  return false;
}

function hasValidWordShape(trimmed: string): boolean {
  const runs = letterRuns(trimmed);
  if (runs.length === 0) return false;

  const okRuns = runs.filter((r) => !latinLooksGibberish(r));
  if (okRuns.length === 0) return false;

  if (okRuns.length >= 2) return true;
  const only = okRuns[0];
  if (only.length >= 5) return true;
  if (HEBREW.test(only) && only.length >= 3) return true;
  if (LATIN.test(only) && only.length >= 3 && VOWEL.test(only)) return true;
  return false;
}

export type QuestionValidation = { ok: true } | { ok: false; messageHe: string };

const MIN_LEN = 5;

export function validateQuestion(text: string): QuestionValidation {
  const t = text.trim();
  if (t.length < MIN_LEN) {
    return {
      ok: false,
      messageHe: `השאלה קצרה מדי — לפחות ${MIN_LEN} תווים.`,
    };
  }

  const unique = new Set(t.replace(/\s/g, '')).size;
  if (unique <= 2) {
    return { ok: false, messageHe: 'זה נראה כמו טקסט אקראי. נסחו שאלה ברורה.' };
  }

  if (!hasValidWordShape(t)) {
    return {
      ok: false,
      messageHe: 'כתבו מילים אמיתיות (למשל: יש תור? יש חניה?).',
    };
  }

  return { ok: true };
}
