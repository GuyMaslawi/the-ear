import type { AnswerOption, AnswerOptionType, DropCategory } from '../types/api';

const QUEUE_OPTIONS: AnswerOption[] = [
  { key: 'EMPTY', label: 'ריק', icon: '🟢', color: '#22C55E' },
  { key: 'SHORT', label: 'קצר', icon: '🟡', color: '#EAB308' },
  { key: 'NORMAL', label: 'רגיל', icon: '🟠', color: '#F59E0B' },
  { key: 'BUSY', label: 'עמוס', icon: '🔴', color: '#EF4444' },
  { key: 'VERY_BUSY', label: 'עמוס מאוד', icon: '🔴', color: '#DC2626' },
];

const PARKING_OPTIONS: AnswerOption[] = [
  { key: 'PLENTY', label: 'יש מלא', icon: '🅿️', color: '#22C55E' },
  { key: 'SOME', label: 'יש קצת', icon: '🅿️', color: '#EAB308' },
  { key: 'HARD', label: 'קשה למצוא', icon: '⚠️', color: '#F59E0B' },
  { key: 'NONE', label: 'אין בכלל', icon: '❌', color: '#EF4444' },
];

const PRODUCT_OPTIONS: AnswerOption[] = [
  { key: 'IN_STOCK', label: 'יש במלאי', icon: '📦', color: '#22C55E' },
  { key: 'LOW_STOCK', label: 'מעט במלאי', icon: '📉', color: '#F59E0B' },
  { key: 'OUT_OF_STOCK', label: 'נגמר', icon: '🚫', color: '#EF4444' },
];

const SAFETY_OPTIONS: AnswerOption[] = [
  { key: 'CALM', label: 'שקט', icon: '✅', color: '#22C55E' },
  { key: 'ACTIVITY', label: 'יש פעילות', icon: '⚠️', color: '#F59E0B' },
  { key: 'POLICE', label: 'יש משטרה', icon: '🚓', color: '#3B82F6' },
  { key: 'UNSAFE', label: 'לא בטוח', icon: '🔴', color: '#EF4444' },
];

const GENERAL_OPTIONS: AnswerOption[] = [
  { key: 'YES', label: 'כן', icon: '👍', color: '#22C55E' },
  { key: 'NO', label: 'לא', icon: '👎', color: '#EF4444' },
  { key: 'UNKNOWN', label: 'לא יודע', icon: '🤷', color: '#6B7280' },
];

const OPTIONS_MAP: Record<AnswerOptionType, AnswerOption[]> = {
  QUEUE: QUEUE_OPTIONS,
  PARKING: PARKING_OPTIONS,
  PRODUCT: PRODUCT_OPTIONS,
  SAFETY: SAFETY_OPTIONS,
  GENERAL: GENERAL_OPTIONS,
};

const QUEUE_KEYWORDS = ['תור', 'עמוס', 'לחוץ', 'קופה', 'המתנה', 'ממתינים'];
const PARKING_KEYWORDS = ['חניה', 'חניון', 'לחנות', 'חונה'];
const PRODUCT_KEYWORDS = ['מוצר', 'מלאי', 'נגמר', 'יש עוד', 'סטוק'];
const SAFETY_KEYWORDS = ['משטרה', 'בטיחות', 'אירוע', 'מסוכן', 'סכנה', 'פיגוע', 'תאונה'];

function detectFromText(question: string): AnswerOptionType | null {
  const q = question.toLowerCase();
  if (QUEUE_KEYWORDS.some((kw) => q.includes(kw))) return 'QUEUE';
  if (PARKING_KEYWORDS.some((kw) => q.includes(kw))) return 'PARKING';
  if (PRODUCT_KEYWORDS.some((kw) => q.includes(kw))) return 'PRODUCT';
  if (SAFETY_KEYWORDS.some((kw) => q.includes(kw))) return 'SAFETY';
  return null;
}

const CATEGORY_TO_ANSWER_TYPE: Partial<Record<DropCategory, AnswerOptionType>> = {
  QUEUE: 'QUEUE',
  CROWD: 'QUEUE',
  PARKING: 'PARKING',
  PRODUCT: 'PRODUCT',
  SAFETY: 'SAFETY',
  INCIDENT: 'SAFETY',
};

export function detectAnswerType(
  category: DropCategory,
  question: string,
): AnswerOptionType {
  const fromText = detectFromText(question);
  if (fromText) return fromText;
  return CATEGORY_TO_ANSWER_TYPE[category] ?? 'GENERAL';
}

export function getAnswerOptions(
  category: DropCategory,
  question: string,
): AnswerOption[] {
  const type = detectAnswerType(category, question);
  return OPTIONS_MAP[type];
}

export function getAnswerOptionByKey(
  category: DropCategory,
  question: string,
  key: string,
): AnswerOption | undefined {
  const options = getAnswerOptions(category, question);
  return options.find((o) => o.key === key);
}

export function quickStatusLabel(
  key: string,
  category?: DropCategory,
  question?: string,
): string {
  if (category && question) {
    const opt = getAnswerOptionByKey(category, question, key);
    if (opt) return `${opt.icon} ${opt.label}`;
  }
  for (const group of Object.values(OPTIONS_MAP)) {
    const found = group.find((o) => o.key === key);
    if (found) return `${found.icon} ${found.label}`;
  }
  return key;
}
