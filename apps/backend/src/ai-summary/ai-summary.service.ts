import { Injectable } from '@nestjs/common';
import { QuickStatus } from '../common/enums';
import type { AnswerDocument } from '../answers/schemas/answer.schema';

/** Human-readable gist per quick-reply for the MVP summary line. */
const STATUS_MOOD: Record<string, string> = {
  [QuickStatus.EMPTY]: 'ריק / שקט',
  [QuickStatus.SHORT]: 'תור קצר / עומס קל',
  [QuickStatus.NORMAL]: 'רגיל',
  [QuickStatus.BUSY]: 'עמוס',
  [QuickStatus.VERY_BUSY]: 'עמוס מאוד',
  [QuickStatus.PLENTY]: 'יש מקום בשפע',
  [QuickStatus.SOME]: 'מוגבל חלקית',
  [QuickStatus.HARD]: 'קשה למצוא',
  [QuickStatus.NONE]: 'אין כמעט בכלל',
  [QuickStatus.IN_STOCK]: 'יש במלאי',
  [QuickStatus.LOW_STOCK]: 'מעט במלאי',
  [QuickStatus.OUT_OF_STOCK]: 'אזל מהמלאי',
  [QuickStatus.CALM]: 'שקט',
  [QuickStatus.ACTIVITY]: 'יש פעילות בולטת',
  [QuickStatus.POLICE]: 'נוכחות משטרה',
  [QuickStatus.UNSAFE]: 'דווח על חשש לבטיחות',
  [QuickStatus.YES]: 'רוב התשובות חיוביות',
  [QuickStatus.NO]: 'רוב התשובות שליליות',
  [QuickStatus.UNKNOWN]: 'מעורב או לא ברור',
};

@Injectable()
export class AiSummaryService {
  /**
   * MVP: dominant quickStatus + how many answers in the last 2 minutes.
   */
  summarize(answers: AnswerDocument[]): {
    text: string;
    confidenceScore: number;
  } {
    if (!answers.length) {
      return { text: 'עדיין אין תשובות מהשטח.', confidenceScore: 0 };
    }

    const counts: Record<string, number> = {};
    for (const a of answers) {
      const k = String(a.quickStatus);
      counts[k] = (counts[k] ?? 0) + 1;
    }

    let dominant = QuickStatus.UNKNOWN;
    let bestCount = -1;
    for (const [status, c] of Object.entries(counts)) {
      if (c > bestCount) {
        bestCount = c;
        dominant = status as QuickStatus;
      }
    }

    const twoMinutesMs = 2 * 60 * 1000;
    const now = Date.now();
    const recent = answers.filter(
      (a) => now - new Date(a.createdAt).getTime() <= twoMinutesMs,
    ).length;

    const total = answers.length;
    const share = (counts[dominant] ?? 0) / total;
    const confidenceScore =
      share >= 0.6 && total >= 3 ? 0.85 : share >= 0.45 ? 0.55 : 0.35;

    const mood = STATUS_MOOD[dominant] ?? 'מעורב או לא ברור';
    const recentLine =
      recent === 1
        ? 'תשובה אחת בשתי הדקות האחרונות.'
        : `${recent} תשובות בשתי הדקות האחרונות.`;
    const text = `רוב המשתמשים מדווחים: ${mood}. ${recentLine}`;

    return { text, confidenceScore };
  }
}
