import type { DropCategory } from '../types/api';

type Rule = { cat: DropCategory; patterns: RegExp[] };

const RULES: Rule[] = [
  {
    cat: 'PARKING',
    patterns: [/חני(ה|יה|ון)/, /\bparking\b/i, /\bpark\b/i],
  },
  {
    cat: 'QUEUE',
    patterns: [/\bתור\b/, /המתנ(ה|ת)/, /מחכים/, /\bqueue\b/i, /\bline\b/i, /\bwait\b/i],
  },
  {
    cat: 'CROWD',
    patterns: [/עומס/, /עמוס/, /צפוף/, /פקוק/, /\bcrowd(ed)?\b/i, /\bbusy\b/i, /\bpacked\b/i],
  },
  {
    cat: 'SAFETY',
    patterns: [
      /בטיחות/,
      /אבטחה/,
      /משטרה/,
      /מסוכן/,
      /חשוד/,
      /\bsecurity\b/i,
      /\bsafety\b/i,
      /\bpolice\b/i,
      /\bdanger(ous)?\b/i,
    ],
  },
  {
    cat: 'INCIDENT',
    patterns: [
      /אירוע/,
      /הפגנה/,
      /חסימה/,
      /תאונה/,
      /\bevent\b/i,
      /\bincident\b/i,
      /\bprotest\b/i,
      /\baccident\b/i,
    ],
  },
  {
    cat: 'PRODUCT',
    patterns: [/מוצר/, /במלאי/, /מבצע/, /חנות/, /\bstock\b/i, /\bproduct\b/i, /\bdeal\b/i],
  },
];

/**
 * Infer a DropCategory from free-text question. Falls back to OTHER.
 * Keyword-based — runs locally, never blocks the user.
 */
export function inferCategory(question: string): DropCategory {
  const q = question.trim();
  if (!q) return 'OTHER';
  for (const { cat, patterns } of RULES) {
    if (patterns.some((re) => re.test(q))) return cat;
  }
  return 'OTHER';
}
