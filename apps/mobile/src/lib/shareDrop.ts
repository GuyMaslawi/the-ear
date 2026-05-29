import { Share } from 'react-native';
import type { Drop } from '../types/api';
import { track } from './analytics';

// TODO(deep-links): no URL scheme / NavigationContainer linking config exists yet.
// When deep linking is added, point this at a per-drop link that opens the app
// directly (e.g. https://theear.app/drop/<id> resolving to theear://drop/<id>).
// For now we share the public site as a safe "open the app" entry point.
const APP_SHARE_URL = 'https://theear.app';

export function buildDropShareMessage(drop: Drop): string {
  return [
    `שאלתי באוזן: ${drop.question}`,
    '',
    'אנשים שנמצאים עכשיו באזור יכולים לענות מהשטח.',
    'רוצים לעזור? הצטרפו באוזן:',
    APP_SHARE_URL,
  ].join('\n');
}

export async function shareDrop(drop: Drop): Promise<void> {
  track('question_shared', { dropId: drop.id, source: 'shareDrop' });
  try {
    await Share.share({ message: buildDropShareMessage(drop) });
  } catch {
    // User dismissed the share sheet or sharing is unavailable — nothing to do.
  }
}
