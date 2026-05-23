import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DropFlowParamList } from '../navigation/RootNavigator';
import { colors } from '../theme/colors';
import { PressableScale } from '../components/ui/PressableScale';
import { Button } from '../components/ui/Button';
import { ensureAnonymousSession, postReport } from '../lib/api';
import { apiUserMessageHeAuto } from '../lib/apiErrors';
import { SUPPORT_EMAIL } from '../lib/support';

type Props = NativeStackScreenProps<DropFlowParamList, 'ReportContent'>;

const REASONS: { id: string; label: string }[] = [
  { id: 'misleading', label: 'מידע שגוי או מטעה' },
  { id: 'offensive', label: 'תוכן פוגעני' },
  { id: 'spam', label: 'ספאם' },
  { id: 'privacy', label: 'פרטיות / מידע אישי' },
  { id: 'illegal', label: 'סכנה או פעילות לא חוקית' },
  { id: 'other', label: 'אחר' },
];

export function ReportContentScreen({ navigation, route }: Props) {
  const { targetType, targetId } = route.params;
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!reason || busy) return;
    setBusy(true);
    try {
      await ensureAnonymousSession();
      await postReport({
        targetType,
        targetId,
        reason,
        details: details.trim() ? details.trim() : undefined,
      });
      Alert.alert(
        'תודה',
        `הדיווח התקבל. נבדוק את התוכן בהקדם. למקרים דחופים ניתן לפנות אלינו ב-${SUPPORT_EMAIL}.`,
        [{ text: 'סגור', onPress: () => navigation.goBack() }],
      );
    } catch (e) {
      Alert.alert('לא נשלח', apiUserMessageHeAuto(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.navy }}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>דיווח על תוכן</Text>
      <Text style={styles.sub}>
        בחר את הסיבה לדיווח. אפשר להוסיף פרטים אם זה עוזר להבין את ההקשר.
      </Text>

      <Text style={styles.label}>סיבה</Text>
      <View style={styles.chips}>
        {REASONS.map((r) => {
          const on = r.id === reason;
          return (
            <PressableScale
              key={r.id}
              haptic="none"
              onPress={() => setReason(r.id)}
              style={[styles.chip, on && styles.chipOn]}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={r.label}
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>
                {r.label}
              </Text>
            </PressableScale>
          );
        })}
      </View>

      <Text style={styles.label}>פרטים (לא חובה)</Text>
      <TextInput
        style={styles.input}
        placeholder="פירוט קצר אם רלוונטי…"
        placeholderTextColor="rgba(255,255,255,0.42)"
        value={details}
        onChangeText={setDetails}
        multiline
        textAlignVertical="top"
        textAlign="right"
        editable={!busy}
        maxLength={1000}
      />

      <Button
        label="שלח דיווח"
        icon="flag"
        onPress={submit}
        loading={busy}
        disabled={!reason || busy}
        style={styles.cta}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 44 },
  title: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  sub: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: 8,
    marginBottom: 16,
    fontWeight: '600',
  },
  label: {
    color: colors.textMuted,
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: 8,
    marginBottom: 8,
    fontSize: 13,
  },
  chips: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  chipOn: {
    borderColor: colors.electricBright,
    backgroundColor: colors.bubble,
  },
  chipText: {
    color: colors.textMuted,
    fontWeight: '700',
    fontSize: 13,
    writingDirection: 'rtl',
  },
  chipTextOn: { color: colors.white },
  input: {
    minHeight: 100,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.bubbleBorder,
    padding: 14,
    color: colors.white,
    backgroundColor: colors.navyMuted,
    marginBottom: 18,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  cta: { marginTop: 4 },
});
