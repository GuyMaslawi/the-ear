export type LatLng = { lat: number; lng: number };

export type RegionLike = { latitude: number; longitude: number };

/**
 * Where should "Ask" send the user — the dropped pin if one exists,
 * otherwise the current visible region's center.
 */
export function resolveAskTarget(
  selectedPoint: LatLng | null | undefined,
  region: RegionLike,
): LatLng {
  if (
    selectedPoint &&
    Number.isFinite(selectedPoint.lat) &&
    Number.isFinite(selectedPoint.lng)
  ) {
    return { lat: selectedPoint.lat, lng: selectedPoint.lng };
  }
  return { lat: region.latitude, lng: region.longitude };
}
