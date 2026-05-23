import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { API_BASE_URL, apiPort } from './config';

const HEALTH_TIMEOUT_MS = 5000;

/** One-shot startup diagnostics for API / auth connectivity (see console / Metro). */
export async function logMobileApiBootstrap(): Promise<void> {
  const authUrl = `${API_BASE_URL}/auth/anonymous`;
  const buildProfile = (Constants.expoConfig?.extra as { buildProfile?: string } | undefined)
    ?.buildProfile;
  console.log('[Bootstrap] platform=', Platform.OS);
  console.log('[Bootstrap] isDevice=', Device.isDevice);
  console.log('[Bootstrap] buildProfile=', buildProfile ?? 'dev');
  console.log('[Bootstrap] apiPort=', apiPort());
  console.log('[Bootstrap] resolvedApiBaseUrl=', API_BASE_URL);
  console.log('[Bootstrap] authUrl=', authUrl);

  if (Device.isDevice && !__DEV__ && !/^https:\/\//i.test(API_BASE_URL)) {
    console.warn(
      `[Bootstrap] WARNING: shippable build is using a non-HTTPS API URL (${API_BASE_URL}). ` +
        `iOS ATS will block requests on TestFlight.`,
    );
  }

  const healthUrl = `${API_BASE_URL}/`;
  const t0 = Date.now();
  const ac = new AbortController();
  const tid = setTimeout(() => ac.abort(), HEALTH_TIMEOUT_MS);
  try {
    const res = await fetch(healthUrl, { method: 'GET', signal: ac.signal });
    console.log(
      `[Bootstrap] backendHealth GET ${healthUrl} status=${res.status} ok=${res.ok} durationMs=${Date.now() - t0}`,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(
      `[Bootstrap] backendHealth FAIL GET ${healthUrl} durationMs=${Date.now() - t0} message=${msg}`,
    );
  } finally {
    clearTimeout(tid);
  }
}
