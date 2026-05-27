import { AiSummaryService } from './ai-summary.service';
import { QuickStatus } from '../common/enums';
import type { AnswerDocument } from '../answers/schemas/answer.schema';

function ans(
  quickStatus: QuickStatus,
  createdAt: Date = new Date(),
): AnswerDocument {
  return { quickStatus, createdAt } as unknown as AnswerDocument;
}

describe('AiSummaryService', () => {
  const svc = new AiSummaryService();

  it('returns empty-state message and zero confidence when no answers', () => {
    const out = svc.summarize([]);
    expect(out.confidenceScore).toBe(0);
    expect(out.text).toMatch(/עדיין אין תשובות/);
  });

  it('picks the dominant quickStatus mood', () => {
    const out = svc.summarize([
      ans(QuickStatus.BUSY),
      ans(QuickStatus.BUSY),
      ans(QuickStatus.EMPTY),
    ]);
    expect(out.text).toContain('עמוס');
  });

  it('gives high confidence (0.85) when ≥60% share and ≥3 answers', () => {
    const out = svc.summarize([
      ans(QuickStatus.YES),
      ans(QuickStatus.YES),
      ans(QuickStatus.YES),
      ans(QuickStatus.NO),
    ]);
    expect(out.confidenceScore).toBe(0.85);
  });

  it('gives medium confidence (0.55) when share ≥45% but <60%', () => {
    const out = svc.summarize([
      ans(QuickStatus.YES),
      ans(QuickStatus.YES),
      ans(QuickStatus.NO),
      ans(QuickStatus.UNKNOWN),
    ]);
    // 2/4 = 0.5 share -> 0.55
    expect(out.confidenceScore).toBe(0.55);
  });

  it('falls back to low confidence (0.35) when share <45%', () => {
    const out = svc.summarize([
      ans(QuickStatus.YES),
      ans(QuickStatus.NO),
      ans(QuickStatus.UNKNOWN),
      ans(QuickStatus.EMPTY),
      ans(QuickStatus.SHORT),
    ]);
    expect(out.confidenceScore).toBe(0.35);
  });

  it('counts only answers from the last 2 minutes in the recent line', () => {
    const now = Date.now();
    const recent = ans(QuickStatus.YES, new Date(now - 60_000));
    const old = ans(QuickStatus.YES, new Date(now - 10 * 60_000));
    const out = svc.summarize([recent, old]);
    expect(out.text).toContain('תשובה אחת בשתי הדקות');
  });

  it('singular form for exactly one recent answer', () => {
    const out = svc.summarize([ans(QuickStatus.YES, new Date())]);
    expect(out.text).toContain('תשובה אחת');
  });

  it('plural form when ≠1 recent answers', () => {
    const out = svc.summarize([
      ans(QuickStatus.YES, new Date()),
      ans(QuickStatus.YES, new Date()),
    ]);
    expect(out.text).toContain('2 תשובות');
  });
});
