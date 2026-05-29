import { Injectable, Logger } from '@nestjs/common';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

function isExpoPushToken(token: string): boolean {
  return (
    token.startsWith('ExponentPushToken[') ||
    token.startsWith('ExpoPushToken[')
  );
}

@Injectable()
export class PushService {
  private readonly log = new Logger(PushService.name);

  /**
   * Best-effort push to the asker that their drop got a new answer.
   * Never throws: a push failure must not break answer creation.
   */
  async notifyDropAnswered(pushToken: string, question: string): Promise<void> {
    try {
      if (!pushToken || !isExpoPushToken(pushToken)) return;
      const trimmed = (question ?? '').trim();
      const body = trimmed
        ? trimmed.slice(0, 120)
        : 'מישהו ענה על השאלה שלך';
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: pushToken,
          title: 'תשובה חדשה לשאלה שלך',
          body,
          sound: 'default',
        }),
      });
      if (!res.ok) {
        this.log.warn(`expo push send failed status=${res.status}`);
      }
    } catch (err) {
      this.log.warn(`expo push send error: ${(err as Error).message}`);
    }
  }
}
