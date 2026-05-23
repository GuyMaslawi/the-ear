import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { DEV_FALLBACK_REGION, type LocationSource } from '../lib/devLocation';

export type UserCoordsState = {
  lat: number;
  lng: number;
  coordsReady: boolean;
  permissionDenied: boolean;
  /** GPS/services failed after permission was granted (not an API error). */
  locationUnavailable: boolean;
  refreshing: boolean;
  /** Where the current lat/lng came from. */
  source: LocationSource;
};

function logLocation(
  permission: 'granted' | 'denied' | 'pending',
  source: LocationSource,
  lat: number,
  lng: number,
) {
  console.log(
    `[location] permission=${permission} source=${source} lat=${lat} lng=${lng}`,
  );
}

/**
 * Approximate center for map / nearby APIs. Uses device location when allowed,
 * otherwise DEV_FALLBACK_REGION. `source` exposes where the coords came from.
 */
export function useUserCoords() {
  const [state, setState] = useState<UserCoordsState>({
    ...DEV_FALLBACK_REGION,
    coordsReady: false,
    permissionDenied: false,
    locationUnavailable: false,
    refreshing: false,
    source: 'fallback',
  });

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, refreshing: true }));
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        logLocation('denied', 'denied', DEV_FALLBACK_REGION.lat, DEV_FALLBACK_REGION.lng);
        setState({
          ...DEV_FALLBACK_REGION,
          coordsReady: true,
          permissionDenied: true,
          locationUnavailable: false,
          refreshing: false,
          source: 'denied',
        });
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      logLocation('granted', 'gps', lat, lng);
      setState({
        lat,
        lng,
        coordsReady: true,
        permissionDenied: false,
        locationUnavailable: false,
        refreshing: false,
        source: 'gps',
      });
    } catch {
      logLocation('granted', 'unavailable', DEV_FALLBACK_REGION.lat, DEV_FALLBACK_REGION.lng);
      setState({
        ...DEV_FALLBACK_REGION,
        coordsReady: true,
        permissionDenied: false,
        locationUnavailable: true,
        refreshing: false,
        source: 'unavailable',
      });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ...state, refresh };
}
