/** Haversine distance in meters between two WGS84 points. */
export function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Natural Hebrew distance: "50 מ׳", "1.8 ק״מ". */
export function formatDistanceHe(meters: number | null | undefined): string {
  if (meters == null || !Number.isFinite(meters) || meters < 0) return '';
  const m = Math.round(meters);
  if (m < 1000) return `${m} מ׳`;
  const km = meters / 1000;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} ק״מ`;
}
