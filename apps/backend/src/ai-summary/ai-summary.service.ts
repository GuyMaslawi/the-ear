import { Injectable } from '@nestjs/common';
import { QuickStatus } from '../common/enums';
import type { AnswerDocument } from '../answers/schemas/answer.schema';

/** Human-readable gist per quick-reply for the MVP summary line. */
const STATUS_MOOD: Record<string, string> = {
  [QuickStatus.EMPTY]: 'quiet / sparse',
  [QuickStatus.SHORT]: 'short lines / light traffic',
  [QuickStatus.NORMAL]: 'normal',
  [QuickStatus.BUSY]: 'busy',
  [QuickStatus.VERY_BUSY]: 'very busy',
  [QuickStatus.PLENTY]: 'plenty available',
  [QuickStatus.SOME]: 'somewhat limited',
  [QuickStatus.HARD]: 'hard to find',
  [QuickStatus.NONE]: 'none / very scarce',
  [QuickStatus.IN_STOCK]: 'in stock',
  [QuickStatus.LOW_STOCK]: 'low stock',
  [QuickStatus.OUT_OF_STOCK]: 'out of stock',
  [QuickStatus.CALM]: 'calm',
  [QuickStatus.ACTIVITY]: 'notable activity',
  [QuickStatus.POLICE]: 'police presence noted',
  [QuickStatus.UNSAFE]: 'safety concerns noted',
  [QuickStatus.YES]: 'mostly yes / positive',
  [QuickStatus.NO]: 'mostly no / negative',
  [QuickStatus.UNKNOWN]: 'mixed or unclear',
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
      return { text: 'No answers yet.', confidenceScore: 0 };
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

    const mood = STATUS_MOOD[dominant] ?? 'mixed signals';
    const text = `Most users report: ${mood}. ${recent} answers in last 2 minutes.`;

    return { text, confidenceScore };
  }
}
