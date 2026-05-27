import { resolveAskTarget } from '../lib/mapSelection';

const region = { latitude: 32.0853, longitude: 34.7818 };

describe('resolveAskTarget', () => {
  it('prefers the dropped pin when one is set', () => {
    const out = resolveAskTarget({ lat: 32.1, lng: 34.9 }, region);
    expect(out).toEqual({ lat: 32.1, lng: 34.9 });
  });

  it('falls back to the visible region center when no pin is set', () => {
    expect(resolveAskTarget(null, region)).toEqual({
      lat: region.latitude,
      lng: region.longitude,
    });
    expect(resolveAskTarget(undefined, region)).toEqual({
      lat: region.latitude,
      lng: region.longitude,
    });
  });

  it('ignores a pin with non-finite coordinates and falls back to region', () => {
    const out = resolveAskTarget({ lat: NaN, lng: 34.9 }, region);
    expect(out).toEqual({ lat: region.latitude, lng: region.longitude });
  });
});
