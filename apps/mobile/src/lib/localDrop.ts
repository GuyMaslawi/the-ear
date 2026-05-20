import type { Drop, DropCategory } from '../types/api';

export function buildOfflineDrop(params: {
  question: string;
  category: DropCategory;
  lat: number;
  lng: number;
  radiusMeters: number;
}): Drop {
  const now = new Date().toISOString();
  const exp = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  return {
    id: `local-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
    question: params.question,
    category: params.category,
    location: {
      type: 'Point',
      coordinates: [params.lng, params.lat],
    },
    radiusMeters: params.radiusMeters,
    status: 'ACTIVE',
    expiresAt: exp,
    createdAt: now,
    answerCount: 0,
    aiSummary: 'שאלה חדשה מהאזור — אנשים שכאן יכולים לענות ברגע שיראו אותה.',
    confidenceScore: 0,
    isMine: true,
  };
}
