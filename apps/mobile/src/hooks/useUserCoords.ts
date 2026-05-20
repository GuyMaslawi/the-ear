import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';

const TEL_AVIV = { lat: 32.0853, lng: 34.7818 };

export type UserCoordsState = {
  lat: number;
  lng: number;
  coordsReady: boolean;
  permissionDenied: boolean;
  /** GPS/services failed after permission was granted (not an API error). */
  locationUnavailable: boolean;
  refreshing: boolean;
};

/**
 * Approximate center for map / nearby APIs. Uses device location when allowed,
 * otherwise Tel Aviv fallback (same as legacy Map behavior).
 */
export function useUserCoords() {
  const [state, setState] = useState<UserCoordsState>({
    ...TEL_AVIV,
    coordsReady: false,
    permissionDenied: false,
    locationUnavailable: false,
    refreshing: false,
  });

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, refreshing: true }));
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setState({
          ...TEL_AVIV,
          coordsReady: true,
          permissionDenied: true,
          locationUnavailable: false,
          refreshing: false,
        });
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setState({
        lat,
        lng,
        coordsReady: true,
        permissionDenied: false,
        locationUnavailable: false,
        refreshing: false,
      });
    } catch {
      setState({
        ...TEL_AVIV,
        coordsReady: true,
        permissionDenied: false,
        locationUnavailable: true,
        refreshing: false,
      });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ...state, refresh };
}
