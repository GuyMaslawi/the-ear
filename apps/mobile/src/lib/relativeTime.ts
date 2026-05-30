/** Hebrew relative time for drop freshness (client clock). */

export function formatRelativeTimeHe(iso: string, nowMs = Date.now()): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 'זה עתה';

  const sec = Math.max(0, Math.floor((nowMs - t) / 1000));
  if (sec < 12) return 'לפני רגע';
  if (sec < 60) return `לפני ${sec} שניות`;
  const min = Math.floor(sec / 60);
  if (min === 1) return 'לפני דקה';
  if (min < 10) return `לפני ${min} דקות`;
  if (min < 60) return `לפני ${min} דקות`;
  const h = Math.floor(min / 60);
  if (h === 1) return 'לפני שעה';
  if (h < 24) return `לפני ${h} שעות`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'לפני יום';
  return `לפני ${d} ימים`;
}

export type FreshnessLevel = 'live' | 'fresh' | 'stale' | 'outdated';

export function freshnessLabelHe(
  iso: string,
  nowMs = Date.now(),
): { label: string; level: FreshnessLevel } {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return { label: 'לא עדכני', level: 'outdated' };
  const min = Math.max(0, Math.floor((nowMs - t) / 60_000));
  if (min <= 30) return { label: 'חי עכשיו', level: 'live' };
  if (min <= 180) return { label: 'עדכני', level: 'fresh' };
  if (min <= 720) return { label: 'ישן יחסית', level: 'stale' };
  return { label: 'לא עדכני', level: 'outdated' };
}

/** Natural Hebrew "time until close" copy, or null when already past. */
export function remainingTimeHe(msLeft: number): string | null {
  if (!Number.isFinite(msLeft) || msLeft <= 0) return null;
  const mins = Math.round(msLeft / 60_000);
  if (mins < 1) return 'נסגרת בקרוב';
  if (mins < 60) return `נסגרת בעוד ${mins} דקות`;
  const hours = Math.round(mins / 60);
  if (hours === 1) return 'נסגרת בעוד כשעה';
  return `נסגרת בעוד כ־${hours} שעות`;
}

/**
 * "חמה עכשיו" only when there's real signal: 3+ answers OR an answer in the
 * last 15 minutes. Returns null when nothing safely indicates heat.
 */
export function hotIndicatorHe(opts: {
  answerCount: number;
  latestAnswerIso?: string | null;
  nowMs?: number;
}): string | null {
  const { answerCount, latestAnswerIso, nowMs = Date.now() } = opts;
  if (answerCount >= 3) return 'חמה עכשיו';
  if (latestAnswerIso) {
    const ageMs = nowMs - new Date(latestAnswerIso).getTime();
    if (Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= 15 * 60_000) {
      return 'חמה עכשיו';
    }
  }
  return null;
}
