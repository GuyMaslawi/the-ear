import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { colors } from '../theme/colors';
import { SUPPORT_EMAIL } from '../lib/support';
import { PRIVACY_POLICY_URL, TERMS_URL } from '../lib/legal';
import { registerForPushNotifications } from '../lib/push';

type PushStatus = 'granted' | 'denied' | 'undetermined' | 'unknown';

export function AboutScreen() {
  const [pushStatus, setPushStatus] = useState<PushStatus>('unknown');

  const refreshPushStatus = useCallback(async () => {
    try {
      const res = await Notifications.getPermissionsAsync();
      const s = res.status;
      if (s === 'granted' || s === 'denied' || s === 'undetermined') {
        setPushStatus(s);
      } else {
        setPushStatus('unknown');
      }
    } catch {
      setPushStatus('unknown');
    }
  }, []);

  useEffect(() => {
    void refreshPushStatus();
  }, [refreshPushStatus]);

  useFocusEffect(
    useCallback(() => {
      void refreshPushStatus();
    }, [refreshPushStatus]),
  );

  const onEnableAnswerPush = async () => {
    await registerForPushNotifications();
    await refreshPushStatus();
  };

  const onOpenSystemSettings = () => {
    void Linking.openSettings();
  };

  const mailto = () => {
    void Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
  };

  const openPrivacy = () => {
    void Linking.openURL(PRIVACY_POLICY_URL);
  };

  const openTerms = () => {
    void Linking.openURL(TERMS_URL);
  };

  const answerStatusText =
    pushStatus === 'granted'
      ? 'מופעלות'
      : pushStatus === 'denied'
        ? 'חסומות במערכת — צריך לפתוח הגדרות'
        : pushStatus === 'undetermined'
          ? 'דורש אישור'
          : '—';

  return (
    <ScrollView
      style={{ backgroundColor: colors.navy }}
      contentContainerStyle={styles.scroll}
    >
      <Text style={styles.h1}>מידע, פרטיות ובטיחות</Text>

      <Text style={styles.body}>
        האוזן היא אפליקציית מידע מקומי בזמן אמת. הקטע הבא מסביר מה אנחנו אוספים,
        איך משתמשים בזה, ומה הציפיות מהקהילה.
      </Text>

      <Text style={styles.h2}>התראות</Text>
      <View style={styles.settingRow}>
        <View style={styles.settingTextWrap}>
          <Text style={styles.settingTitle}>התראות כשעונים לי</Text>
          <Text style={styles.settingSub}>
            סטטוס מערכת: {answerStatusText}
          </Text>
        </View>
        {pushStatus === 'granted' ? (
          <Pressable
            onPress={onOpenSystemSettings}
            style={({ pressed }) => [
              styles.settingBtnGhost,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="פתח הגדרות התראות במערכת"
          >
            <Text style={styles.settingBtnGhostText}>הגדרות מערכת</Text>
          </Pressable>
        ) : pushStatus === 'denied' ? (
          <Pressable
            onPress={onOpenSystemSettings}
            style={({ pressed }) => [
              styles.settingBtn,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="פתח הגדרות מערכת"
          >
            <Text style={styles.settingBtnText}>פתח הגדרות</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={onEnableAnswerPush}
            style={({ pressed }) => [
              styles.settingBtn,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="אפשר התראות"
          >
            <Text style={styles.settingBtnText}>אפשר התראות</Text>
          </Pressable>
        )}
      </View>
      <View style={[styles.settingRow, styles.settingRowDisabled]}>
        <View style={styles.settingTextWrap}>
          <Text style={styles.settingTitle}>התראות על שאלות באזור שלי</Text>
          <Text style={styles.settingSub}>
            בקרוב — לא פעיל בגרסה הנוכחית כדי למנוע ספאם.
          </Text>
        </View>
        <Text style={styles.settingBadgeOff}>כבוי</Text>
      </View>

      <Text style={styles.h2}>למה אנחנו משתמשים במיקום</Text>
      <Text style={styles.body}>
        האוזן משתמשת במיקום שלך כדי להראות שאלות ועדכונים שנמצאים קרובים אליך,
        וכדי לוודא שתשובות מגיעות מאנשים שבאמת נמצאים באזור הרלוונטי לשאלה.
        המיקום המדויק שלך לא מוצג למשתמשים אחרים, ומשמש רק לרלוונטיות מקומית
        ולאימות שתשובה מגיעה מתוך הטווח הנדרש.
      </Text>

      <Text style={styles.h2}>איזה מידע נשמר</Text>
      <Text style={styles.body}>
        אנחנו שומרים את השאלות והתשובות שאתה מפרסם, יחד עם מזהה סשן אנונימי
        ומיקום משוער ברגע הפרסום או המענה, לצורך הצגת תוכן מקומי ואימות זכאות
        לענות. איננו דורשים שם, מספר טלפון, או כתובת מייל לשימוש באפליקציה.
        המידע מועבר בתעבורה מוצפנת (HTTPS).
      </Text>

      <Text style={styles.h2}>תוכן משתמשים וכללי קהילה</Text>
      <Text style={styles.body}>
        האוזן היא פלטפורמה של תוכן שנוצר על ידי משתמשים. אסור לפרסם מידע אישי
        על אנשים, תוכן פוגעני, איומים, הסתה, מידע מסוכן, פעילות לא חוקית, ספאם
        או מידע שאתה יודע שאינו נכון. אנחנו עשויים להסיר תוכן שדווח או שנמצא
        כמפר את הכללים, ולחסום משתמשים שמפרים את הכללים באופן חוזר.
      </Text>

      <Text style={styles.h2}>דיווח והסתרת תוכן</Text>
      <Text style={styles.body}>
        בכל שאלה או תשובה אפשר לדווח על תוכן בעייתי דרך תפריט הפעולות, או
        להסתיר אותו מההתקן שלך. דיווחים נבדקים על ידינו, ותוכן שמפר את הכללים
        מוסר. אם פתחת שאלה ואתה רוצה להסירה — אפשר לסגור אותה ממסך פרטי השאלה.
      </Text>

      <Text style={styles.h2}>בקשת מחיקת מידע</Text>
      <Text style={styles.body}>
        אם תרצה לבקש מחיקה של תוכן שפרסמת או מידע המקושר למזהה האנונימי שלך,
        ניתן לפנות אלינו בכתובת {SUPPORT_EMAIL}. נטפל בבקשה בזמן סביר ונאשר
        ברגע שהמחיקה בוצעה.
      </Text>

      <Text style={styles.h2}>יצירת קשר</Text>
      <Text style={styles.body}>
        לכל שאלה, פנייה לתמיכה, דיווח דחוף או בקשה הקשורה לפרטיות, אפשר לכתוב
        אלינו לכתובת{' '}
        <Text style={styles.link} onPress={mailto}>
          {SUPPORT_EMAIL}
        </Text>
        .
      </Text>

      <Text style={styles.h2}>מדיניות פרטיות ותנאי שימוש</Text>
      <Text style={styles.body}>
        הגרסה הפומבית של מדיניות הפרטיות זמינה בכתובת{' '}
        <Text style={styles.link} onPress={openPrivacy}>
          {PRIVACY_POLICY_URL}
        </Text>
        , ותנאי השימוש בכתובת{' '}
        <Text style={styles.link} onPress={openTerms}>
          {TERMS_URL}
        </Text>
        .
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 48 },
  h1: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 14,
  },
  h2: {
    color: colors.electricBright,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: 22,
    marginBottom: 8,
  },
  body: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'right',
    writingDirection: 'rtl',
    fontWeight: '600',
  },
  link: {
    color: colors.electricBright,
    fontWeight: '800',
  },
  settingRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 10,
  },
  settingRowDisabled: {
    opacity: 0.7,
  },
  settingTextWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  settingTitle: {
    color: colors.white,
    fontWeight: '900',
    fontSize: 14,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  settingSub: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    textAlign: 'right',
    writingDirection: 'rtl',
    fontWeight: '600',
  },
  settingBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(59,130,246,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.55)',
  },
  settingBtnText: {
    color: '#BFDBFE',
    fontWeight: '900',
    fontSize: 12,
  },
  settingBtnGhost: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  settingBtnGhostText: {
    color: colors.textSecondary,
    fontWeight: '800',
    fontSize: 12,
  },
  settingBadgeOff: {
    color: colors.textMuted,
    fontWeight: '800',
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
});
