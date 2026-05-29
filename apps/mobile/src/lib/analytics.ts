import { Platform } from 'react-native';
import { ensureAnonymousSession, postEvent } from './api';

export type AnalyticsEvent =
  | 'app_opened'
  | 'location_selected'
  | 'question_started'
  | 'question_submitted'
  | 'question_shared'
  | 'answer_submitted'
  | 'drop_details_opened';

type TrackMeta = {
  dropId?: string;
  lat?: number;
  lng?: number;
  radiusMeters?: number;
  /** Source screen the event fired from, e.g. 'Map', 'CreateDrop'. */
  source?: string;
};

/**
 * Fire-and-forget analytics for the 7-day launch test. Never throws.
 * The backend rounds any lat/lng to ~1.1km, so precise location never leaves
 * the device's normal API traffic.
 */
export function track(name: AnalyticsEvent, meta: TrackMeta = {}): void {
  void (async () => {
    try {
      await ensureAnonymousSession();
      await postEvent({ name, ...meta, platform: Platform.OS });
    } catch (err) {
      console.log(`[Analytics] ${name} dropped:`, (err as Error)?.message);
    }
  })();
}
