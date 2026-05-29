import { API_BASE_URL } from './config';
import { ApiError, toApiError } from './apiErrors';
import { session } from './session';
import type { Answer, Drop, DropCategory, QuickStatus } from '../types/api';

export const DEFAULT_TIMEOUT_MS = 22_000;

const RETRY_BASE_MS = 380;
/** Max retries after the first attempt (total attempts = 1 + MAX_RETRIES). */
const MAX_RETRIES = 2;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function messageFromHttpBody(raw: string, fallback: string): string {
  const t = raw.trim();
  if (!t) return fallback;
  try {
    const o = JSON.parse(t) as { message?: unknown };
    const m = o.message;
    if (typeof m === 'string' && m.length > 0) return m;
    if (Array.isArray(m) && m.length > 0) {
      return m.map(String).filter(Boolean).join(', ') || fallback;
    }
  } catch {
    /* plain text or HTML */
  }
  if (t.length > 280) return `${t.slice(0, 280)}…`;
  return t;
}

function methodUpper(init: RequestInit): string {
  return (init.method ?? 'GET').toUpperCase();
}

function defaultRetryFor(method: string, path: string): boolean {
  if (method === 'GET' || method === 'HEAD') return true;
  if (method === 'PATCH' && path.startsWith('/users/location')) return true;
  return false;
}

function shouldRetryFailure(err: ApiError): boolean {
  return err.kind === 'timeout' || err.kind === 'network' || err.kind === 'server';
}

type RequestOpts = RequestInit & {
  json?: unknown;
  timeoutMs?: number;
  /** Short name for logs and errors (e.g. `nearby_drops`). */
  endpointName: string;
  logParams?: Record<string, unknown>;
  /** Override automatic GET/HEAD/PATCH-location retry rule. */
  retry?: boolean;
};

async function request<T>(path: string, init: RequestOpts): Promise<T> {
  const token = await session.getToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (init.json !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const method = methodUpper(init);
  const retryAllowed =
    init.retry !== false && defaultRetryFor(method, path);
  const maxAttempts = retryAllowed ? 1 + MAX_RETRIES : 1;

  let lastErr: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const t0 = Date.now();
    const controller = new AbortController();
    const timeoutMs = init.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const tid = setTimeout(() => controller.abort(), timeoutMs);

    try {
      if (attempt === 0) {
        console.log(`[API] ${init.endpointName} start ${method} ${path}`, {
          ...(init.logParams ?? {}),
          url: `${API_BASE_URL}${path}`,
        });
      } else {
        console.log(`[API] ${init.endpointName} retry_${attempt} ${method} ${path}`);
      }

      const res = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers,
        body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
        signal: controller.signal,
      });

      const dur = Date.now() - t0;

      if (!res.ok) {
        const text = await res.text();
        const msg = messageFromHttpBody(text, res.statusText);
        const kind = res.status >= 500 ? 'server' : 'client';
        const err = new ApiError(msg, {
          kind,
          status: res.status,
          endpoint: init.endpointName,
        });
        console.log(
          `[API] ${init.endpointName} response status=${res.status} duration=${dur}ms error=${msg}`,
        );
        lastErr = err;
        if (!retryAllowed || err.kind !== 'server' || attempt === maxAttempts - 1) {
          throw err;
        }
        await sleep(RETRY_BASE_MS * (attempt + 1));
        continue;
      }

      const body = (await res.json()) as T;
      console.log(`[API] ${init.endpointName} response status=${res.status} duration=${dur}ms`);
      return body;
    } catch (err) {
      const dur = Date.now() - t0;

      if (err instanceof ApiError) {
        console.log(
          `[API] ${init.endpointName} fail kind=${err.kind} status=${err.status ?? 'n/a'} duration=${dur}ms attempt=${attempt + 1} message=${err.message}`,
        );
        lastErr = err;
        if (!retryAllowed || !shouldRetryFailure(err) || attempt === maxAttempts - 1) {
          throw err;
        }
        await sleep(RETRY_BASE_MS * (attempt + 1));
        continue;
      }

      const isAbort =
        err instanceof Error &&
        (err.name === 'AbortError' ||
          err.message === 'Aborted' ||
          (typeof (err as Error & { code?: string }).code === 'string' &&
            (err as Error & { code?: string }).code === 'ABORT_ERR'));

      if (isAbort) {
        const te = new ApiError('Timeout', {
          kind: 'timeout',
          endpoint: init.endpointName,
        });
        console.log(
          `[API] ${init.endpointName} fail kind=timeout duration=${dur}ms attempt=${attempt + 1}`,
        );
        lastErr = te;
        if (!retryAllowed || attempt === maxAttempts - 1) throw te;
        await sleep(RETRY_BASE_MS * (attempt + 1));
        continue;
      }

      const ae = toApiError(err, init.endpointName);
      console.log(
        `[API] ${init.endpointName} fail kind=${ae.kind} duration=${dur}ms attempt=${attempt + 1} message=${ae.message}`,
      );
      lastErr = ae;
      if (!retryAllowed || !shouldRetryFailure(ae) || attempt === maxAttempts - 1) {
        throw ae;
      }
      await sleep(RETRY_BASE_MS * (attempt + 1));
    } finally {
      clearTimeout(tid);
    }
  }

  throw toApiError(lastErr, init.endpointName);
}

type AnonymousSession = {
  accessToken: string;
  user: { id: string; anonymousName: string };
};

let ensureAnonymousSessionInFlight: Promise<AnonymousSession> | null = null;

async function ensureAnonymousSessionImpl(): Promise<AnonymousSession> {
  const existing = await session.getToken();
  if (existing) {
    try {
      const me = await request<{ id: string; anonymousName: string }>('/users/me', {
        method: 'GET',
        endpointName: 'session_validate',
        retry: true,
      });
      return { accessToken: existing, user: me };
    } catch {
      await session.clear();
    }
  }
  const created = await request<{
    accessToken: string;
    user: { id: string; anonymousName: string };
  }>('/auth/anonymous', {
    method: 'POST',
    endpointName: 'auth_anonymous',
    retry: false,
  });
  await session.setToken(created.accessToken);
  return created;
}

/** Single-flight: avoids parallel POST /auth/anonymous from multiple mounted screens. */
export async function ensureAnonymousSession(): Promise<AnonymousSession> {
  if (ensureAnonymousSessionInFlight) {
    return ensureAnonymousSessionInFlight;
  }
  ensureAnonymousSessionInFlight = ensureAnonymousSessionImpl().finally(() => {
    ensureAnonymousSessionInFlight = null;
  });
  return ensureAnonymousSessionInFlight;
}

export async function postEvent(body: {
  name: string;
  dropId?: string;
  lat?: number;
  lng?: number;
  radiusMeters?: number;
  source?: string;
  platform?: string;
}) {
  return request<{ ok: boolean }>('/events', {
    method: 'POST',
    endpointName: 'post_event',
    json: body,
    logParams: { name: body.name },
    retry: false,
  });
}

export async function registerPushToken(token: string) {
  return request<{ ok: boolean }>('/users/push-token', {
    method: 'POST',
    endpointName: 'register_push_token',
    json: { token },
  });
}

export async function patchUserLocation(lat: number, lng: number) {
  return request<{ ok: boolean }>('/users/location', {
    method: 'PATCH',
    endpointName: 'patch_user_location',
    json: { lat, lng },
    logParams: { lat, lng },
    retry: true,
  });
}

export async function fetchNearbyDrops(lat: number, lng: number, radius = 2500) {
  const q = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    radius: String(radius),
  });
  return request<Drop[]>(`/drops/nearby?${q.toString()}`, {
    method: 'GET',
    endpointName: 'nearby_drops',
    logParams: { lat, lng, radius },
  });
}

export async function fetchMyDrops() {
  return request<Drop[]>(`/drops/mine`, {
    method: 'GET',
    endpointName: 'my_drops',
  });
}

export async function fetchDrop(id: string) {
  return request<Drop>(`/drops/${id}`, {
    method: 'GET',
    endpointName: 'drop_detail',
    logParams: { id },
  });
}

export async function createDrop(body: {
  question: string;
  category: DropCategory;
  lat: number;
  lng: number;
  radiusMeters: number;
  ttlHours?: number;
}) {
  return request<Drop>('/drops', {
    method: 'POST',
    endpointName: 'create_drop',
    json: body,
    logParams: {
      category: body.category,
      radiusMeters: body.radiusMeters,
      ttlHours: body.ttlHours,
    },
    retry: false,
  });
}

export async function postAnswer(
  dropId: string,
  body: {
    text: string;
    quickStatus: QuickStatus;
    lat: number;
    lng: number;
  },
) {
  return request<Answer>(`/drops/${dropId}/answers`, {
    method: 'POST',
    endpointName: 'post_answer',
    json: body,
    logParams: { dropId, quickStatus: body.quickStatus },
    retry: false,
  });
}

export async function fetchAnswers(dropId: string) {
  return request<Answer[]>(`/drops/${dropId}/answers`, {
    method: 'GET',
    endpointName: 'drop_answers',
    logParams: { dropId },
  });
}

export async function closeOwnDrop(id: string) {
  return request<Drop>(`/drops/${id}`, {
    method: 'DELETE',
    endpointName: 'close_own_drop',
    logParams: { id },
    retry: false,
  });
}

export async function postReport(body: {
  targetType: 'drop' | 'answer';
  targetId: string;
  reason: string;
  details?: string;
}) {
  return request<{ ok: boolean }>(`/reports`, {
    method: 'POST',
    endpointName: 'post_report',
    json: body,
    logParams: { targetType: body.targetType, targetId: body.targetId },
    retry: false,
  });
}
