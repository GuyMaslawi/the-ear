import {
  ApiError,
  toApiError,
  apiUserMessageHe,
  apiUserMessageHeAuto,
} from '../lib/apiErrors';

describe('toApiError', () => {
  it('passes through ApiError instances unchanged', () => {
    const e = new ApiError('boom', { kind: 'server', status: 500, endpoint: '/x' });
    expect(toApiError(e, '/y')).toBe(e);
  });

  it('classifies AbortError as timeout', () => {
    const err = new Error('aborted');
    err.name = 'AbortError';
    const out = toApiError(err, '/x');
    expect(out.kind).toBe('timeout');
    expect(out.endpoint).toBe('/x');
  });

  it('classifies messages containing "timeout" as timeout', () => {
    expect(toApiError('Timeout', '/x').kind).toBe('timeout');
    expect(toApiError(new Error('connection Timeout reached'), '/x').kind).toBe(
      'timeout',
    );
  });

  it('classifies common network errors as network', () => {
    expect(toApiError(new Error('Network request failed'), '/x').kind).toBe(
      'network',
    );
    expect(toApiError(new Error('Failed to fetch'), '/x').kind).toBe('network');
    expect(
      toApiError(
        new Error('The Internet connection appears to be offline'),
        '/x',
      ).kind,
    ).toBe('network');
  });

  it('classifies unknown messages as unknown', () => {
    expect(toApiError(new Error('whatever'), '/x').kind).toBe('unknown');
    expect(toApiError('plain string', '/x').kind).toBe('unknown');
  });
});

describe('apiUserMessageHe', () => {
  it('returns timeout copy for timeout errors', () => {
    const e = new ApiError('t', { kind: 'timeout', endpoint: '/x' });
    expect(apiUserMessageHe(e, '/x')).toMatch(/איטי/);
  });

  it('returns network copy for network errors', () => {
    const e = new ApiError('n', { kind: 'network', endpoint: '/x' });
    expect(apiUserMessageHe(e, '/x')).toMatch(/רשת/);
  });

  it('returns server copy for server errors', () => {
    const e = new ApiError('s', { kind: 'server', status: 503, endpoint: '/x' });
    expect(apiUserMessageHe(e, '/x')).toMatch(/השרת/);
  });

  it('uses ApiError.endpoint with the auto helper', () => {
    const e = new ApiError('boom', { kind: 'server', endpoint: '/drops' });
    expect(apiUserMessageHeAuto(e)).toBe(apiUserMessageHe(e, '/drops'));
  });

  it('falls back to "משהו השתבש" for unknown errors with no useful message', () => {
    const e = new ApiError('Timeout', { kind: 'unknown', endpoint: '/x' });
    expect(apiUserMessageHe(e, '/x')).toMatch(/משהו השתבש/);
  });
});
