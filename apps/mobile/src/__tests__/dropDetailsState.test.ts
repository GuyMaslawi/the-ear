import { combineDropDetailsResults } from '../lib/dropDetailsState';
import { ApiError } from '../lib/apiErrors';
import type { Answer, Drop } from '../types/api';

const NOW = '2026-05-25T10:00:00.000Z';

function makeDrop(over: Partial<Drop> = {}): Drop {
  return {
    id: 'drop-1',
    question: 'יש תור?',
    category: 'QUEUE',
    location: { type: 'Point', coordinates: [34.78, 32.08] },
    radiusMeters: 220,
    status: 'ACTIVE',
    expiresAt: '2026-05-26T10:00:00.000Z',
    createdAt: '2026-05-25T09:00:00.000Z',
    answerCount: 0,
    aiSummary: '',
    confidenceScore: 0,
    isMine: false,
    ...over,
  };
}

function makeAnswer(over: Partial<Answer> = {}): Answer {
  return {
    id: 'a1',
    dropId: 'drop-1',
    text: 'יש תור קצר',
    quickStatus: 'SHORT',
    distanceFromDrop: 30,
    trustWeight: 1,
    createdAt: '2026-05-25T09:30:00.000Z',
    isMine: false,
    ...over,
  };
}

const empty = {
  cachedDrop: null,
  dropId: 'drop-1',
  previousDrop: null as Drop | null,
  previousAnswers: [] as Answer[],
  previousLastUpdateAt: '2026-05-25T08:00:00.000Z',
};

describe('combineDropDetailsResults', () => {
  it('shows the fresh drop and answers when both API calls succeed', () => {
    const fresh = makeDrop({ answerCount: 3 });
    const answers = [makeAnswer()];

    const r = combineDropDetailsResults(
      {
        ...empty,
        dropResult: { status: 'fulfilled', value: fresh },
        answersResult: { status: 'fulfilled', value: answers },
      },
      NOW,
    );

    expect(r.drop).toBe(fresh);
    expect(r.answers).toBe(answers);
    expect(r.fetchError).toBe(false);
    expect(r.fetchErrorMessageHe).toBeNull();
    expect(r.lastUpdateAt).toBe(NOW);
  });

  it('keeps cached drop and surfaces a retry-able error when fetchDrop fails', () => {
    const cached = makeDrop({ id: 'drop-1' });
    const err = new ApiError('boom', { kind: 'network', endpoint: '/drops/x' });

    const r = combineDropDetailsResults(
      {
        ...empty,
        cachedDrop: cached,
        dropResult: { status: 'rejected', reason: err },
        answersResult: { status: 'fulfilled', value: [] },
      },
      NOW,
    );

    expect(r.drop).toBe(cached);
    expect(r.answers).toEqual([]);
    expect(r.fetchError).toBe(true);
    expect(r.fetchErrorMessageHe).toMatch(/רשת/);
    expect(r.lastUpdateAt).toBe(cached.createdAt);
  });

  it('keeps previous answers when only the answers fetch fails', () => {
    const prevAnswers = [makeAnswer({ id: 'old' })];
    const fresh = makeDrop();

    const r = combineDropDetailsResults(
      {
        ...empty,
        previousAnswers: prevAnswers,
        dropResult: { status: 'fulfilled', value: fresh },
        answersResult: {
          status: 'rejected',
          reason: new ApiError('t', { kind: 'timeout', endpoint: '/answers' }),
        },
      },
      NOW,
    );

    expect(r.drop).toBe(fresh);
    expect(r.answers).toBe(prevAnswers);
    expect(r.fetchError).toBe(true);
    expect(r.fetchErrorMessageHe).toMatch(/איטי/);
    expect(r.lastUpdateAt).toBe(NOW);
  });

  it('reports the drop error (not the answers error) when both fail', () => {
    const dropErr = new ApiError('d', { kind: 'server', endpoint: '/drops/x' });
    const ansErr = new ApiError('a', { kind: 'network', endpoint: '/answers' });

    const r = combineDropDetailsResults(
      {
        ...empty,
        dropResult: { status: 'rejected', reason: dropErr },
        answersResult: { status: 'rejected', reason: ansErr },
      },
      NOW,
    );

    expect(r.fetchError).toBe(true);
    expect(r.fetchErrorMessageHe).toMatch(/השרת/);
    expect(r.drop).toBeNull();
  });

  it('does not overwrite previous drop with cached when ids differ', () => {
    const prevDrop = makeDrop({ id: 'drop-1', answerCount: 7 });
    const cachedOther = makeDrop({ id: 'drop-99' });

    const r = combineDropDetailsResults(
      {
        ...empty,
        cachedDrop: cachedOther,
        previousDrop: prevDrop,
        dropResult: {
          status: 'rejected',
          reason: new ApiError('x', { kind: 'unknown', endpoint: '/x' }),
        },
        answersResult: { status: 'fulfilled', value: [] },
      },
      NOW,
    );

    expect(r.drop).toBe(prevDrop);
    expect(r.fetchError).toBe(true);
  });
});
