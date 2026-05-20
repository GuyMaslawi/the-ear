export function trustLabelHe(answerCount: number): { label: string; level: 'high' | 'mid' | 'low' } {
  if (answerCount >= 4) return { label: 'אמינות גבוהה', level: 'high' };
  if (answerCount >= 1) return { label: 'אמינות בינונית', level: 'mid' };
  return { label: 'אמינות נמוכה — חסר מידע', level: 'low' };
}
