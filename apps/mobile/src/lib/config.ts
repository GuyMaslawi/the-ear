import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

type Extra = {
  apiBaseUrl?: string;
  socketUrl?: string;
  apiPort?: number;
};

function extra(): Extra {
  return (Constants.expoConfig?.extra ?? {}) as Extra;
}

const DEFAULT_PORT = 3000;

/** IPv4 loopback on the Mac host; iOS Simulator + RN `fetch` often fail with hostname `localhost` (::1). */
const IOS_SIM_LOOPBACK_HOST = '127.0.0.1';

export function apiPort(): number {
  const fromEnv = process.env.EXPO_PUBLIC_API_PORT;
  if (fromEnv && /^\d+$/.test(fromEnv)) {
    const n = Number(fromEnv);
    if (n > 0 && n < 65536) return n;
  }
  const fromExtra = extra().apiPort;
  if (typeof fromExtra === 'number' && fromExtra > 0 && fromExtra < 65536) {
    return fromExtra;
  }
  return DEFAULT_PORT;
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, '');
}

function normalizeForIosSimulator(url: string): string {
  if (Platform.OS !== 'ios' || Device.isDevice) return stripTrailingSlash(url);
  try {
    const u = new URL(url);
    if (u.hostname === 'localhost' || u.hostname === '[::1]') {
      u.hostname = IOS_SIM_LOOPBACK_HOST;
    }
    return stripTrailingSlash(u.toString());
  } catch {
    return stripTrailingSlash(url);
  }
}

/**
 * API origin for REST calls.
 * - EXPO_PUBLIC_* from .env override everything (Expo inlines at bundle time).
 * - iOS Simulator → http://127.0.0.1:<port> (same host as Safari http://localhost:<port> on the Mac)
 * - Android Emulator → 10.0.2.2 (host loopback)
 * - Physical device → app.config.js LAN IP in `extra.apiBaseUrl`
 */
export const API_BASE_URL: string = (() => {
  const port = apiPort();
  if (process.env.EXPO_PUBLIC_API_URL) {
    return normalizeForIosSimulator(process.env.EXPO_PUBLIC_API_URL);
  }
  if (Platform.OS === 'android' && !Device.isDevice) {
    return `http://10.0.2.2:${port}`;
  }
  if (Platform.OS === 'ios' && !Device.isDevice) {
    return `http://${IOS_SIM_LOOPBACK_HOST}:${port}`;
  }
  const fromExtra = extra().apiBaseUrl;
  if (fromExtra) return normalizeForIosSimulator(fromExtra);
  return `http://localhost:${port}`;
})();

/** Socket.io origin (same host/port as API unless overridden). */
export function socketUrl(): string {
  const port = apiPort();
  if (process.env.EXPO_PUBLIC_SOCKET_URL) {
    return normalizeForIosSimulator(process.env.EXPO_PUBLIC_SOCKET_URL);
  }
  if (process.env.EXPO_PUBLIC_API_URL) {
    return normalizeForIosSimulator(process.env.EXPO_PUBLIC_API_URL);
  }
  if (Platform.OS === 'android' && !Device.isDevice) {
    return `http://10.0.2.2:${port}`;
  }
  if (Platform.OS === 'ios' && !Device.isDevice) {
    return `http://${IOS_SIM_LOOPBACK_HOST}:${port}`;
  }
  const fromSocket = extra().socketUrl;
  if (fromSocket) return normalizeForIosSimulator(fromSocket);
  return API_BASE_URL;
}
