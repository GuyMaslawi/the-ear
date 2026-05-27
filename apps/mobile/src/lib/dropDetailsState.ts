import type { Answer, Drop } from '../types/api';
import { apiUserMessageHeAuto } from './apiErrors';

export type CombineInput = {
  dropResult: PromiseSettledResult<Drop>;
  answersResult: PromiseSettledResult<Answer[]>;
  cachedDrop: Drop | null;
  dropId: string;
  /** Previously displayed values, kept when an API call fails. */
  previousDrop: Drop | null;
  previousAnswers: Answer[];
  previousLastUpdateAt: string;
};

export type CombinedDropDetailsState = {
  drop: Drop | null;
  answers: Answer[];
  fetchError: boolean;
  fetchErrorMessageHe: string | null;
  lastUpdateAt: string;
};

/**
 * Pure decision logic for DropDetailsScreen.reload. Given the settled
 * results of fetchDrop + fetchAnswers and previously displayed values,
 * decide what to show next and whether to surface a retry banner.
 */
export function combineDropDetailsResults(
  input: CombineInput,
  nowIso: string = new Date().toISOString(),
): CombinedDropDetailsState {
  const {
    dropResult,
    answersResult,
    cachedDrop,
    dropId,
    previousDrop,
    previousAnswers,
    previousLastUpdateAt,
  } = input;

  let drop: Drop | null = previousDrop;
  let answers: Answer[] = previousAnswers;
  let lastUpdateAt = previousLastUpdateAt;
  let hadApiFailure = false;
  let firstErr: unknown;

  if (dropResult.status === 'fulfilled') {
    drop = dropResult.value;
    lastUpdateAt = nowIso;
  } else {
    hadApiFailure = true;
    firstErr = dropResult.reason;
    if (cachedDrop?.id === dropId) {
      drop = cachedDrop;
      lastUpdateAt = cachedDrop.createdAt;
    }
  }

  if (answersResult.status === 'fulfilled') {
    answers = answersResult.value;
  } else {
    hadApiFailure = true;
    if (firstErr === undefined) firstErr = answersResult.reason;
  }

  return {
    drop,
    answers,
    fetchError: hadApiFailure,
    fetchErrorMessageHe: hadApiFailure
      ? apiUserMessageHeAuto(firstErr ?? new Error('בקשה נכשלה'))
      : null,
    lastUpdateAt,
  };
}
