import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { registerPushToken } from './api';

// Show answer notifications even when the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let inFlight: Promise<void> | null = null;
let lastRegisteredToken: string | null = null;

function projectId(): string | undefined {
  return (
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)
      ?.eas?.projectId ?? Constants.easConfig?.projectId
  );
}

async function registerImpl(): Promise<void> {
  try {
    if (!Device.isDevice) {
      console.log('[Push] skip: not a physical device');
      return;
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== 'granted') {
      console.log('[Push] permission not granted');
      return;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const pid = projectId();
    const result = await Notifications.getExpoPushTokenAsync(
      pid ? { projectId: pid } : undefined,
    );
    const token = result.data;
    if (!token || token === lastRegisteredToken) return;

    await registerPushToken(token);
    lastRegisteredToken = token;
    console.log('[Push] token registered');
  } catch (err) {
    console.log('[Push] registration failed', (err as Error)?.message);
  }
}

/**
 * Ask for notification permission (if not already decided) and sync the Expo
 * push token to the backend. Safe to call repeatedly; single-flight + cached.
 * Never throws — denial or failure is logged and swallowed.
 */
export async function registerForPushNotifications(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = registerImpl().finally(() => {
    inFlight = null;
  });
  return inFlight;
}
