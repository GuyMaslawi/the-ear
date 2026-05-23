import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Thin haptics wrapper. Every call is best-effort: haptics are a polish layer,
 * never a hard dependency, so failures (web, unsupported devices) are swallowed.
 */

const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

/** Light tap — selection changes, chip toggles, tab switches. */
export function tapLight() {
  if (!enabled) return;
  void Haptics.selectionAsync().catch(() => {});
}

/** Medium tap — primary button presses. */
export function tapMedium() {
  if (!enabled) return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

/** Success — answer submitted, question posted. */
export function notifySuccess() {
  if (!enabled) return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
    () => {},
  );
}

/** Warning / error — failed action. */
export function notifyError() {
  if (!enabled) return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
    () => {},
  );
}
