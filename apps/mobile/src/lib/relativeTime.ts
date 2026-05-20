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
