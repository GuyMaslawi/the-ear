import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { SUPPORT_EMAIL } from '../lib/support';

// TODO: Replace placeholder legal copy with lawyer-reviewed public Privacy Policy and Terms URLs before public launch.

export function AboutScreen() {
  const mailto = () => {
    void Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
  };

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

      <View style={styles.note}>
        <Text style={styles.noteText}>
          זהו טקסט זמני. גרסת מדיניות פרטיות ותנאי שימוש משפטיים פומביים יפורסמו
          לפני שחרור פומבי בחנות.
        </Text>
      </View>
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
  note: {
    marginTop: 28,
    backgroundColor: colors.navyMuted,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 12,
  },
  noteText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'right',
    writingDirection: 'rtl',
    fontWeight: '700',
  },
});
