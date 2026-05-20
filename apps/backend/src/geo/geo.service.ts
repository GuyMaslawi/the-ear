import { Injectable } from '@nestjs/common';
import type { GeoPoint } from './geo.types';

export type { GeoPoint };

@Injectable()
export class GeoService {
  /** ~11m precision — stored for verification, not shown to others. */
  approximatePoint(lat: number, lng: number): GeoPoint {
    const rLat = Math.round(lat * 1e4) / 1e4;
    const rLng = Math.round(lng * 1e4) / 1e4;
    return { type: 'Point', coordinates: [rLng, rLat] };
  }

  point(lat: number, lng: number): GeoPoint {
    return { type: 'Point', coordinates: [lng, lat] };
  }

  /** Haversine distance in meters. */
  distanceMeters(a: GeoPoint, b: GeoPoint): number {
    const [lng1, lat1] = a.coordinates;
    const [lng2, lat2] = b.coordinates;
    const R = 6371000;
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const s1 = Math.sin(dLat / 2) ** 2;
    const s2 =
      Math.cos(this.toRad(lat1)) *
      Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s1 + s2));
  }

  private toRad(d: number): number {
    return (d * Math.PI) / 180;
  }
}
